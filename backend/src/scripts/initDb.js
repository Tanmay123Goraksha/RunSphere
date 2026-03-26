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

const createTables = async () => { `
  const queryText = CREATE EXTENSION IF NOT EXISTS "pgcrypto";
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
        club_id UUID, -- Optional for now, referencing clubs later
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
        geom GEOMETRY(Point, 4326) NOT NULL, -- PostGIS spatial column
        recorded_at TIMESTAMP NOT NULL
    );

    -- Create a spatial index for lightning-fast map queries
    CREATE INDEX IF NOT EXISTS run_points_geom_idx ON run_points USING GIST (geom);
  `

  try {
    console.log('⏳ Creating tables...');
    await pool.query(queryText);
    console.log('✅ Users table created successfully!');
  } catch (err) {
    console.error('❌ Error creating tables:', err.stack);
  } finally {
    pool.end(); // Close the connection when done
  }
};

createTables();