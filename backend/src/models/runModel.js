const db = require('../config/db');

// Create a new empty run when the user hits "Start"
const createRun = async (userId) => {
  const result = await db.query(
    'INSERT INTO runs (user_id) VALUES ($1) RETURNING id, started_at',
    [userId]
  );
  return result.rows[0];
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
const endRun = async (runId, distanceKm, durationSeconds) => {
  const result = await db.query(
    `UPDATE runs 
     SET ended_at = CURRENT_TIMESTAMP, distance_km = $2, duration_seconds = $3 
     WHERE id = $1 RETURNING *`,
    [runId, distanceKm, durationSeconds]
  );
  return result.rows[0];
};

module.exports = { createRun, addRunPoints, endRun };