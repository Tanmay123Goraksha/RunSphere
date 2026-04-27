const db = require('../config/db');
const { hexBoundaryToWktPolygon } = require('../services/zones/h3ZoneService');

// Create a new empty run when the user hits "Start"
const createRun = async (userId) => {
  const result = await db.query(
    'INSERT INTO runs (user_id) VALUES ($1) RETURNING id, started_at',
    [userId]
  );
  return result.rows[0];
};

const validateRunOwnership = async (runId, userId) => {
  const result = await db.query(
    'SELECT id FROM runs WHERE id = $1 AND user_id = $2',
    [runId, userId]
  );
  return result.rowCount > 0;
};

// Bulk insert an array of GPS points
const addRunPoints = async (runId, points) => {
  // Extract data into parallel arrays for the bulk insert
  const lats = points.map(p => p.latitude);
  const lngs = points.map(p => p.longitude);
  const timestamps = points.map(p => p.recorded_at);
  const stepDeltas = points.map(p => Number(p.step_count_delta || 0));

  // ST_MakePoint takes (longitude, latitude) - PostGIS rule!
  // ST_SetSRID sets it to standard GPS coordinates (4326)
  const query = `
    INSERT INTO run_points (run_id, geom, recorded_at, step_count_delta)
    SELECT 
      $1, 
      ST_SetSRID(ST_MakePoint(lon, lat), 4326), 
      ts,
      step_delta
    FROM UNNEST($2::double precision[], $3::double precision[], $4::timestamp[], $5::integer[]) AS t(lat, lon, ts, step_delta)
  `;

  await db.query(query, [runId, lats, lngs, timestamps, stepDeltas]);
};

// Optional: Finish the run and calculate totals
const endRun = async (runId, distanceKm, durationSeconds, avgPace) => {
  const result = await db.query(
    `UPDATE runs 
     SET ended_at = CURRENT_TIMESTAMP, distance_km = $2, duration_seconds = $3, avg_pace = $4 
     WHERE id = $1 RETURNING *`,
    [runId, distanceKm, durationSeconds, avgPace]
  );
  return result.rows[0];
};

const getRunsForUser = async (userId) => {
  const result = await db.query(
    `SELECT id, user_id, distance_km, duration_seconds, avg_pace, started_at, ended_at, created_at
     FROM runs
     WHERE user_id = $1
     ORDER BY started_at DESC`,
    [userId]
  );
  return result.rows;
};

const getRunByIdForUser = async (runId, userId) => {
  const runResult = await db.query(
    `SELECT id, user_id, distance_km, duration_seconds, avg_pace, started_at, ended_at, created_at
     FROM runs
     WHERE id = $1 AND user_id = $2`,
    [runId, userId]
  );

  if (runResult.rowCount === 0) {
    return null;
  }

  const pointsResult = await db.query(
    `SELECT
      ST_Y(geom) AS latitude,
      ST_X(geom) AS longitude,
      recorded_at
     FROM run_points
     WHERE run_id = $1
     ORDER BY recorded_at ASC`,
    [runId]
  );

  return {
    ...runResult.rows[0],
    points: pointsResult.rows,
  };
};

const getRunPointsForRun = async (runId) => {
  const result = await db.query(
    `SELECT
      ST_Y(geom) AS latitude,
      ST_X(geom) AS longitude,
      recorded_at,
      step_count_delta
     FROM run_points
     WHERE run_id = $1
     ORDER BY recorded_at ASC`,
    [runId]
  );

  return result.rows;
};

const updateRunRouteGeometry = async (runId, points) => {
  if (!Array.isArray(points) || points.length < 2) {
    return;
  }

  const lats = points.map((point) => Number(point.latitude));
  const lngs = points.map((point) => Number(point.longitude));

  await db.query(
    `WITH path AS (
        SELECT ST_MakeLine(ST_SetSRID(ST_MakePoint(lon, lat), 4326)) AS line
        FROM UNNEST($2::double precision[], $3::double precision[]) AS t(lat, lon)
     )
     UPDATE runs
     SET route = (SELECT line FROM path)
     WHERE id = $1`,
    [runId, lats, lngs]
  );
};

const addXpToUser = async (userId, xpToAdd) => {
  await db.query(
    `UPDATE users
     SET xp = xp + $2
     WHERE id = $1`,
    [userId, Number(xpToAdd) || 0]
  );
};

const markRunAnomalous = async (runId, reasons) => {
  await db.query(
    `UPDATE runs
     SET is_valid = FALSE,
         anomaly_flag = TRUE,
         anomaly_reasons = $2::jsonb
     WHERE id = $1`,
    [runId, JSON.stringify(reasons || [])]
  );
};

const captureHexZones = async ({ runId, userId, avgPace, traversedHexes }) => {
  if (!Array.isArray(traversedHexes) || traversedHexes.length === 0) {
    return { success: false, captured: 0, transferred: 0, message: 'No traversed zones detected.' };
  }

  let captured = 0;
  let transferred = 0;

  for (const hex of traversedHexes) {
    const zoneResult = await db.query(
      `SELECT id, owner_id, best_pace
       FROM zones
       WHERE h3_index = $1`,
      [hex]
    );

    if (zoneResult.rowCount === 0) {
      const polygonWkt = hexBoundaryToWktPolygon(hex);

      await db.query(
        `INSERT INTO zones (h3_index, owner_id, run_id, state, best_pace, boundary)
         VALUES ($1, $2, $3, 'OWNED', $4, ST_SetSRID(ST_GeomFromText($5), 4326))`,
        [hex, userId, runId, avgPace, polygonWkt]
      );

      await db.query(
        `INSERT INTO zone_ownership_history (h3_index, from_owner_id, to_owner_id, run_id, reason)
         VALUES ($1, NULL, $2, $3, 'UNCLAIMED_CAPTURE')`,
        [hex, userId, runId]
      );

      captured += 1;
      continue;
    }

    const zone = zoneResult.rows[0];

    if (!zone.owner_id) {
      await db.query(
        `UPDATE zones
         SET owner_id = $2,
             run_id = $3,
             state = 'OWNED',
             best_pace = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [zone.id, userId, runId, avgPace]
      );

      await db.query(
        `INSERT INTO zone_ownership_history (h3_index, from_owner_id, to_owner_id, run_id, reason)
         VALUES ($1, NULL, $2, $3, 'RECLAIMED')`,
        [hex, userId, runId]
      );

      captured += 1;
      continue;
    }

    const isBetterPace =
      Number.isFinite(Number(avgPace)) &&
      (!Number.isFinite(Number(zone.best_pace)) || Number(avgPace) < Number(zone.best_pace));

    if (zone.owner_id !== userId && isBetterPace) {
      await db.query(
        `UPDATE zones
         SET owner_id = $2,
             run_id = $3,
             state = 'OWNED',
             best_pace = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [zone.id, userId, runId, avgPace]
      );

      await db.query(
        `INSERT INTO zone_ownership_history (h3_index, from_owner_id, to_owner_id, run_id, reason)
         VALUES ($1, $2, $3, $4, 'FASTER_RUN_TRANSFER')`,
        [hex, zone.owner_id, userId, runId]
      );

      transferred += 1;
    }
  }

  const total = captured + transferred;

  return {
    success: total > 0,
    captured,
    transferred,
    message:
      total > 0
        ? `Zone update complete. Captured ${captured}, transferred ${transferred}.`
        : 'No ownership changes from this run.',
  };
};

// This function checks if a run forms a closed loop and creates a polygon
const detectAndCreateZone = async (runId, userId) => {
  const query = `
    WITH run_line AS (
      -- Step 1: Create a line from the run points
      SELECT ST_MakeLine(geom ORDER BY recorded_at) AS path
      FROM run_points
      WHERE run_id = $1
    ),
    endpoints AS (
      -- Step 2: Get the start and end points of the run
      SELECT 
        ST_StartPoint(path) AS start_pt,
        ST_EndPoint(path) AS end_pt,
        path
      FROM run_line
    )
    -- Step 3: If start and end are within 50 meters, make a polygon
    SELECT 
      CASE 
        WHEN ST_DistanceSphere(start_pt, end_pt) < 50 THEN 
          -- Close the loop perfectly and turn it into a solid polygon
          ST_MakePolygon(ST_AddPoint(path, start_pt)) 
        ELSE NULL 
      END AS new_zone
    FROM endpoints;
  `;

  const result = await db.query(query, [runId]);
  const newZone = result.rows[0]?.new_zone;

  // If a loop was detected, insert it into the areas table
  if (newZone) {
    const insertAreaQuery = `
      INSERT INTO areas (name, geo_polygon) 
      VALUES ($1, $2) RETURNING id
    `;
    // We can auto-name it or let the user name it later
    const areaResult = await db.query(insertAreaQuery, ['New Captured Zone', newZone]);
    const areaId = areaResult.rows[0].id;

    // Log the capture!
    await db.query(
      'INSERT INTO area_capture_logs (area_id, captured_by) VALUES ($1, $2)',
      [areaId, userId]
    );

    return { success: true, areaId: areaId, message: "Zone captured!" };
  }

  return { success: false, message: "Run did not form a closed loop." };
};

// Don't forget to export it!
module.exports = {
  createRun,
  validateRunOwnership,
  addRunPoints,
  endRun,
  getRunsForUser,
  getRunByIdForUser,
  getRunPointsForRun,
  updateRunRouteGeometry,
  addXpToUser,
  markRunAnomalous,
  captureHexZones,
  detectAndCreateZone,
};