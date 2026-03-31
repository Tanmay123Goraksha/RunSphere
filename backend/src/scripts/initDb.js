const { Pool } = require('pg');
require('dotenv').config();

// Create a direct connection pool for this script
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const createTables = async () => {
  const queryText = `
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    CREATE EXTENSION IF NOT EXISTS postgis;

    CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        avatar_url TEXT,
        bio TEXT,
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        club_id UUID,
        distance_km NUMERIC DEFAULT 0,
        duration_seconds INTEGER DEFAULT 0,
        avg_pace NUMERIC,
        calories INTEGER,
        visibility VARCHAR(50) DEFAULT 'public',
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS run_points (
        id BIGSERIAL PRIMARY KEY,
        run_id UUID REFERENCES runs(id) ON DELETE CASCADE,
        geom GEOMETRY(Point, 4326) NOT NULL,
        recorded_at TIMESTAMP NOT NULL
    );

    CREATE INDEX IF NOT EXISTS run_points_geom_idx ON run_points USING GIST (geom);

    CREATE TABLE IF NOT EXISTS areas (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255),
        geo_polygon GEOMETRY(Polygon, 4326) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS areas_polygon_idx ON areas USING GIST (geo_polygon);

    CREATE TABLE IF NOT EXISTS area_capture_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        area_id UUID REFERENCES areas(id) ON DELETE CASCADE,
        captured_by UUID REFERENCES users(id) ON DELETE CASCADE,
        club_id UUID,
        captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    console.log('⏳ Creating tables...');
    await pool.query(queryText);
    console.log('✅ All tables created successfully!');
  } catch (err) {
    console.error('❌ Error creating tables:', err.stack);
  } finally {
    pool.end(); // Close the connection when done
  }
};

createTables();