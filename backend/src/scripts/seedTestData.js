/**
 * Seed script: Creates test users, territories, runs, and clubs.
 * Territories are stored as buffered street-following polygons — NOT H3 hexagons.
 * Run with: node src/scripts/seedTestData.js
 */
const { Pool } = require('pg');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Marine Drive, Mumbai — matches the frontend simulation center
const CENTER = { lat: 18.9544, lng: 72.8126 };

/**
 * Build a street-like line (polyline) from a set of waypoints,
 * then buffer it by 15m in PostGIS to create a smooth territory polygon.
 */
const buildStreetLine = (waypoints) => {
  const points = waypoints.map(([lat, lng]) => `${lng} ${lat}`).join(', ');
  return `LINESTRING(${points})`;
};

const seed = async () => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ─── Create test users ─────────────────────────────────────────
    const salt = await bcryptjs.genSalt(10);
    const hash = await bcryptjs.hash('password123', salt);

    const users = [
      { username: 'runner_alpha', email: 'alpha@test.com' },
      { username: 'runner_beta', email: 'beta@test.com' },
      { username: 'runner_gamma', email: 'gamma@test.com' },
    ];

    const userIds = [];
    for (const u of users) {
      const existing = await client.query('SELECT id FROM users WHERE email = $1', [u.email]);
      if (existing.rowCount > 0) {
        userIds.push(existing.rows[0].id);
        console.log(`  User ${u.username} already exists (${existing.rows[0].id})`);
      } else {
        const result = await client.query(
          `INSERT INTO users (username, email, password_hash, xp, level)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [u.username, u.email, hash, Math.floor(Math.random() * 2000), Math.floor(Math.random() * 5) + 1]
        );
        userIds.push(result.rows[0].id);
        console.log(`  Created user ${u.username} (${result.rows[0].id})`);
      }
    }

    // ─── Create a test club ────────────────────────────────────────
    let clubId;
    const existingClub = await client.query("SELECT id FROM clubs WHERE name = 'Mumbai Runners'");
    if (existingClub.rowCount > 0) {
      clubId = existingClub.rows[0].id;
    } else {
      const clubResult = await client.query(
        `INSERT INTO clubs (name, description)
         VALUES ('Mumbai Runners', 'Territory conquerors of Marine Drive')
         RETURNING id`
      );
      clubId = clubResult.rows[0].id;

      for (const uid of userIds) {
        await client.query(
          `INSERT INTO club_memberships (club_id, user_id, role)
           VALUES ($1, $2, 'MEMBER')
           ON CONFLICT DO NOTHING`,
          [clubId, uid]
        );
      }
    }

    console.log(`  Club: Mumbai Runners (${clubId})`);

    // ─── Clear old territory/run data for clean re-seeding ─────────
    await client.query(`DELETE FROM territories WHERE run_id IN (SELECT id FROM runs WHERE user_id = ANY($1))`, [userIds]);

    // ─── Create simulated runs + territories ───────────────────────
    // Each "run" is a street-following polyline that gets buffered
    // by 15 meters in PostGIS to produce a smooth territory polygon.

    const runRoutes = [
      {
        userId: userIds[0],
        name: 'Marine Drive North',
        waypoints: [
          [18.9560, 72.8100], [18.9565, 72.8110], [18.9570, 72.8120],
          [18.9575, 72.8130], [18.9580, 72.8140], [18.9585, 72.8150],
          [18.9580, 72.8155], [18.9575, 72.8145], [18.9570, 72.8135],
        ],
        distanceKm: 0.8,
        durationSeconds: 300,
      },
      {
        userId: userIds[0],
        name: 'Coastal Road Stretch',
        waypoints: [
          [18.9530, 72.8100], [18.9535, 72.8108], [18.9540, 72.8116],
          [18.9545, 72.8124], [18.9548, 72.8132], [18.9544, 72.8140],
          [18.9540, 72.8148],
        ],
        distanceKm: 0.6,
        durationSeconds: 240,
      },
      {
        userId: userIds[1],
        name: 'Girgaon Loop',
        waypoints: [
          [18.9555, 72.8140], [18.9560, 72.8150], [18.9565, 72.8160],
          [18.9558, 72.8170], [18.9550, 72.8165], [18.9545, 72.8155],
          [18.9548, 72.8145],
        ],
        distanceKm: 0.5,
        durationSeconds: 210,
      },
      {
        userId: userIds[1],
        name: 'Charni Road Sprint',
        waypoints: [
          [18.9510, 72.8150], [18.9515, 72.8160], [18.9520, 72.8170],
          [18.9525, 72.8175], [18.9530, 72.8165], [18.9525, 72.8155],
        ],
        distanceKm: 0.4,
        durationSeconds: 180,
      },
      {
        userId: userIds[2],
        name: 'Grant Road Jog',
        waypoints: [
          [18.9570, 72.8160], [18.9575, 72.8170], [18.9580, 72.8180],
          [18.9585, 72.8175], [18.9580, 72.8165],
        ],
        distanceKm: 0.35,
        durationSeconds: 160,
      },
    ];

    let territoriesCreated = 0;

    for (const route of runRoutes) {
      const avgPace = route.distanceKm > 0 ? (route.durationSeconds / 60) / route.distanceKm : null;

      // Create a run record
      const startedAt = new Date(Date.now() - 86400000); // 1 day ago
      const endedAt = new Date(startedAt.getTime() + route.durationSeconds * 1000);
      const runResult = await client.query(
        `INSERT INTO runs (user_id, distance_km, duration_seconds, avg_pace, started_at, ended_at, is_valid)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE)
         RETURNING id`,
        [route.userId, route.distanceKm, route.durationSeconds, avgPace, startedAt.toISOString(), endedAt.toISOString()]
      );
      const runId = runResult.rows[0].id;

      // Store the run route as a LineString
      const lineWkt = buildStreetLine(route.waypoints);
      await client.query(
        `UPDATE runs SET route = ST_SetSRID(ST_GeomFromText($2), 4326) WHERE id = $1`,
        [runId, lineWkt]
      );

      // Create a territory by buffering the run path by 15 meters
      // ST_Buffer on geography type uses meters
      const territoryResult = await client.query(
        `INSERT INTO territories (owner_id, club_id, run_id, boundary, area_sqm, capture_time_seconds)
         SELECT
           $1, $2, $3,
           ST_Buffer(r.route::geography, 15)::geometry,
           COALESCE(ST_Area(ST_Buffer(r.route::geography, 15)), 0),
           $4
         FROM runs r
         WHERE r.id = $3
         RETURNING id`,
        [route.userId, clubId, runId, route.durationSeconds]
      );

      if (territoryResult.rowCount > 0) {
        territoriesCreated++;
        console.log(`  Territory: ${route.name} (${route.userId === userIds[0] ? 'alpha' : route.userId === userIds[1] ? 'beta' : 'gamma'})`);
      }
    }

    console.log(`  Created ${territoriesCreated} territories`);

    // ─── Create a season ──────────────────────────────────────────
    const existingSeason = await client.query('SELECT id FROM seasons WHERE is_active = TRUE');
    if (existingSeason.rowCount === 0) {
      await client.query(
        `INSERT INTO seasons (season_number, name, start_date, end_date, is_active)
         VALUES (1, 'Season 1 — Genesis', NOW(), NOW() + INTERVAL '90 days', TRUE)`
      );
      console.log('  Created Season 1');
    }

    // ─── Seed achievement catalog ─────────────────────────────────
    const achievements = [
      { code: 'FIRST_RUN', name: 'First Steps', desc: 'Complete your first valid run.', xp: 50 },
      { code: 'TEN_ZONES_CAPTURED', name: 'Area Controller', desc: 'Capture or steal 10 zones.', xp: 120 },
      { code: 'STREAK_7', name: 'Week Warrior', desc: 'Maintain a 7-day run streak.', xp: 140 },
      { code: 'DISTANCE_100KM', name: 'Centurion', desc: 'Run 100 km in total.', xp: 180 },
      { code: 'ZONE_DEFENDER', name: 'Iron Wall', desc: 'Successfully defend a zone 5 times.', xp: 200 },
      { code: 'SPEED_DEMON', name: 'Speed Demon', desc: 'Complete a run under 4:30 min/km pace.', xp: 160 },
    ];

    for (const a of achievements) {
      await client.query(
        `INSERT INTO achievements (code, name, description, xp_reward)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, xp_reward = EXCLUDED.xp_reward`,
        [a.code, a.name, a.desc, a.xp]
      );
    }
    console.log(`  Seeded ${achievements.length} achievements`);

    // ─── Create follow relationships ──────────────────────────────
    await client.query(
      `INSERT INTO follows (follower_id, followed_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userIds[0], userIds[1]]
    );
    await client.query(
      `INSERT INTO follows (follower_id, followed_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [userIds[1], userIds[0]]
    );
    console.log('  Created follow relationships');

    await client.query('COMMIT');

    // ─── Print auth tokens for testing ─────────────────────────────
    console.log('\n📋 Test Credentials (all passwords: password123):');
    console.log('─'.repeat(60));
    for (let i = 0; i < users.length; i++) {
      const token = jwt.sign({ id: userIds[i] }, process.env.JWT_SECRET, { expiresIn: '30d' });
      console.log(`  ${users[i].username} (${users[i].email})`);
      console.log(`    ID:    ${userIds[i]}`);
      console.log(`    Token: ${token.slice(0, 40)}...`);
    }
    console.log('─'.repeat(60));
    console.log('\n✅ Seed complete!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.stack);
  } finally {
    client.release();
    pool.end();
  }
};

seed();
