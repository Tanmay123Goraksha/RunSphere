const db = require('../config/db');

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

  // ST_MakePoint takes (longitude, latitude) - PostGIS rule!
  // ST_SetSRID sets it to standard GPS coordinates (4326)
  const query = `
    INSERT INTO run_points (run_id, geom, recorded_at)
    SELECT 
      $1, 
      ST_SetSRID(ST_MakePoint(lon, lat), 4326), 
      ts
    FROM UNNEST($2::double precision[], $3::double precision[], $4::timestamp[]) AS t(lat, lon, ts)
  `;

  await db.query(query, [runId, lats, lngs, timestamps]);
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
  detectAndCreateZone,
};