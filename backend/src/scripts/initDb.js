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
    CREATE EXTENSION IF NOT EXISTS "postgis";

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

    CREATE TABLE IF NOT EXISTS clubs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS club_memberships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      role VARCHAR(20) NOT NULL DEFAULT 'MEMBER',
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (club_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS club_memberships_user_idx ON club_memberships (user_id);

    CREATE TABLE IF NOT EXISTS streaks (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      current_streak INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0,
      last_active_date DATE
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(64) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      xp_reward INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS user_achievements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
      unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, achievement_id)
    );

    CREATE INDEX IF NOT EXISTS user_achievements_user_idx ON user_achievements (user_id, unlocked_at DESC);

    CREATE TABLE IF NOT EXISTS runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
        distance_km NUMERIC DEFAULT 0,
        duration_seconds INTEGER DEFAULT 0,
        avg_pace NUMERIC,
        calories INTEGER,
        is_valid BOOLEAN DEFAULT TRUE,
      anomaly_flag BOOLEAN DEFAULT FALSE,
      anomaly_reasons JSONB DEFAULT '[]'::jsonb,
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP,
        route GEOMETRY(LineString, 4326),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS territories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
        club_id UUID REFERENCES clubs(id) ON DELETE SET NULL,
        run_id UUID REFERENCES runs(id) ON DELETE SET NULL,
        boundary GEOMETRY(Polygon, 4326) NOT NULL,
        area_sqm NUMERIC NOT NULL,
        capture_time_seconds INTEGER NOT NULL,
        captured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS run_points (
        id BIGSERIAL PRIMARY KEY,
        run_id UUID REFERENCES runs(id) ON DELETE CASCADE,
        step_count_delta INTEGER DEFAULT 0,
        recorded_at TIMESTAMP NOT NULL
    );

    CREATE INDEX IF NOT EXISTS territories_boundary_idx ON territories USING GIST (boundary);

    CREATE TABLE IF NOT EXISTS zones (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      h3_index VARCHAR(32) UNIQUE NOT NULL,
      owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
      run_id UUID REFERENCES runs(id) ON DELETE SET NULL,
      state VARCHAR(20) NOT NULL DEFAULT 'UNCLAIMED',
      best_pace NUMERIC,
      boundary GEOMETRY(Polygon, 4326) NOT NULL,
      total_defenses INTEGER NOT NULL DEFAULT 0,
      held_since TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS zones_boundary_idx ON zones USING GIST (boundary);
    CREATE INDEX IF NOT EXISTS zones_owner_idx ON zones (owner_id);

    CREATE TABLE IF NOT EXISTS zone_ownership_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      h3_index VARCHAR(32) NOT NULL,
      from_owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
      to_owner_id UUID REFERENCES users(id) ON DELETE SET NULL,
      run_id UUID REFERENCES runs(id) ON DELETE SET NULL,
      reason VARCHAR(64) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS zone_history_h3_idx ON zone_ownership_history (h3_index);

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

    -- Follows: who follows whom
    CREATE TABLE IF NOT EXISTS follows (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
      followed_id UUID REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (follower_id, followed_id)
    );

    CREATE INDEX IF NOT EXISTS follows_follower_idx ON follows (follower_id);
    CREATE INDEX IF NOT EXISTS follows_followed_idx ON follows (followed_id);

    -- Challenges: zone battle invites between users
    CREATE TABLE IF NOT EXISTS challenges (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      to_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      zone_h3_index VARCHAR(32) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      message TEXT,
      result JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      responded_at TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS challenges_to_user_idx ON challenges (to_user_id, status);

    -- Seasons: competitive periods with scheduled resets
    CREATE TABLE IF NOT EXISTS seasons (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      season_number INTEGER UNIQUE NOT NULL,
      name VARCHAR(255),
      start_date TIMESTAMP NOT NULL,
      end_date TIMESTAMP NOT NULL,
      is_active BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Club challenges: group missions with shared goals
    CREATE TABLE IF NOT EXISTS club_challenges (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      target_zones INTEGER NOT NULL DEFAULT 10,
      current_progress INTEGER NOT NULL DEFAULT 0,
      target_distance_km NUMERIC,
      current_distance_km NUMERIC DEFAULT 0,
      deadline TIMESTAMP,
      is_completed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS club_challenges_club_idx ON club_challenges (club_id, is_completed);

    CREATE TABLE IF NOT EXISTS leaderboard_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      run_id UUID REFERENCES runs(id) ON DELETE SET NULL,
      points INTEGER NOT NULL DEFAULT 0,
      scope VARCHAR(32) NOT NULL,
      season_id UUID REFERENCES seasons(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS leaderboard_events_user_idx ON leaderboard_events (user_id, created_at DESC);

    -- Migration: add columns if they don't exist yet
    ALTER TABLE runs ADD COLUMN IF NOT EXISTS anomaly_flag BOOLEAN DEFAULT FALSE;
    ALTER TABLE runs ADD COLUMN IF NOT EXISTS anomaly_reasons JSONB DEFAULT '[]'::jsonb;

    ALTER TABLE run_points ADD COLUMN IF NOT EXISTS step_count_delta INTEGER DEFAULT 0;
    ALTER TABLE run_points ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMP;
    ALTER TABLE run_points ADD COLUMN IF NOT EXISTS geom GEOMETRY(Point, 4326);

    ALTER TABLE runs ADD COLUMN IF NOT EXISTS is_valid BOOLEAN DEFAULT TRUE;
    ALTER TABLE runs ADD COLUMN IF NOT EXISTS route GEOMETRY(LineString, 4326);

    ALTER TABLE zones ADD COLUMN IF NOT EXISTS total_defenses INTEGER DEFAULT 0;
    ALTER TABLE zones ADD COLUMN IF NOT EXISTS held_since TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

    ALTER TABLE leaderboard_events ADD COLUMN IF NOT EXISTS season_id UUID;

    -- Allow territories to store any geometry type (ST_Buffer may produce
    -- MultiPolygon on certain paths, and ST_Union always returns the
    -- simplest possible type).
    ALTER TABLE territories ALTER COLUMN boundary TYPE geometry USING boundary::geometry;

    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'run_points' AND column_name = 'location'
      ) THEN
        UPDATE run_points SET geom = location WHERE geom IS NULL;
      END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS run_points_geom_idx ON run_points USING GIST (geom);
    CREATE INDEX IF NOT EXISTS territories_boundary_gist ON territories USING GIST (boundary);
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