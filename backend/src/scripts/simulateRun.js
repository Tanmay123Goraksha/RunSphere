/**
 * Simulate a complete run lifecycle via the backend API.
 * This script registers/logs in a user, starts a run, sends GPS points
 * along a circular route near Marine Drive Mumbai, and finishes the run.
 *
 * Usage:
 *   node src/scripts/simulateRun.js [--email alpha@test.com] [--password password123]
 *
 * Run seedTestData.js first to create test users and zones.
 */
const axios = require('axios');
require('dotenv').config();

const API_BASE = `http://localhost:${process.env.PORT || 5000}/api`;

// Parse CLI args
const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && args[idx + 1] ? args[idx + 1] : fallback;
};

const EMAIL = getArg('email', 'alpha@test.com');
const PASSWORD = getArg('password', 'password123');

// Girgaon / Marine Drive center (matches frontend and seed data)
const CENTER = { lat: 18.9544, lng: 72.8126 };
const RADIUS_METERS = 150;
const SEGMENT_COUNT = 40;
const POINT_INTERVAL_MS = 1500; // 1.5s between GPS samples

const toLatLng = (x, y) => {
  const R = 6378137;
  const lat = CENTER.lat + (y / R) * (180 / Math.PI);
  const lng = CENTER.lng + (x / (R * Math.cos(CENTER.lat * (Math.PI / 180)))) * (180 / Math.PI);
  return { latitude: lat, longitude: lng };
};

const buildCircularRoute = () => {
  const points = [];
  for (let i = 0; i <= SEGMENT_COUNT; i++) {
    const angle = (i / SEGMENT_COUNT) * Math.PI * 2;
    const x = Math.cos(angle) * RADIUS_METERS;
    const y = Math.sin(angle) * RADIUS_METERS;
    points.push(toLatLng(x, y));
  }
  return points;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const run = async () => {
  console.log('🏃 RunSphere Run Simulator');
  console.log('═'.repeat(50));

  // ─── Login ──────────────────────────────────────────────────────
  console.log(`\n1️⃣  Logging in as ${EMAIL}...`);
  let token;
  try {
    const loginRes = await axios.post(`${API_BASE}/auth/login`, {
      email: EMAIL,
      password: PASSWORD,
    });
    token = loginRes.data.token;
    console.log(`   ✅ Logged in. User: ${loginRes.data.user.username}`);
  } catch (err) {
    console.error('   ❌ Login failed:', err.response?.data || err.message);
    process.exit(1);
  }

  const headers = { Authorization: `Bearer ${token}` };

  // ─── Start run ──────────────────────────────────────────────────
  console.log('\n2️⃣  Starting run...');
  let runId, startedAt;
  try {
    const startRes = await axios.post(`${API_BASE}/runs/start`, {}, { headers });
    runId = startRes.data.runId;
    startedAt = startRes.data.startedAt;
    console.log(`   ✅ Run started: ${runId}`);
  } catch (err) {
    console.error('   ❌ Start failed:', err.response?.data || err.message);
    process.exit(1);
  }

  // ─── Send GPS points in batches ─────────────────────────────────
  const route = buildCircularRoute();
  console.log(`\n3️⃣  Sending ${route.length} GPS points in batches of 5...`);

  const batchSize = 5;
  let totalSynced = 0;
  let cumulativeDistance = 0;

  for (let i = 0; i < route.length; i += batchSize) {
    const batch = route.slice(i, i + batchSize).map((pt, j) => ({
      latitude: pt.latitude,
      longitude: pt.longitude,
      recorded_at: new Date(Date.now() - (route.length - i - j) * POINT_INTERVAL_MS).toISOString(),
      step_count_delta: Math.floor(Math.random() * 8) + 3, // 3-10 steps per point
    }));

    try {
      await axios.post(`${API_BASE}/runs/${runId}/sync`, { points: batch }, { headers });
      totalSynced += batch.length;
      process.stdout.write(`   📍 Synced ${totalSynced}/${route.length} points\r`);
    } catch (err) {
      console.warn(`   ⚠️  Sync batch failed:`, err.response?.data?.error || err.message);
    }

    await sleep(200); // Small delay between batches to avoid overwhelming
  }

  console.log(`\n   ✅ All ${totalSynced} points synced`);

  // ─── Calculate metrics ──────────────────────────────────────────
  // Approximate distance for a circle: 2 * PI * radius
  const distanceKm = (2 * Math.PI * RADIUS_METERS) / 1000;
  const durationSeconds = route.length * (POINT_INTERVAL_MS / 1000);
  const avgPace = (durationSeconds / 60) / distanceKm;

  // ─── Finish run ─────────────────────────────────────────────────
  console.log(`\n4️⃣  Finishing run...`);
  console.log(`   Distance: ${distanceKm.toFixed(2)} km`);
  console.log(`   Duration: ${Math.round(durationSeconds)}s`);
  console.log(`   Avg Pace: ${avgPace.toFixed(2)} min/km`);

  try {
    const finishRes = await axios.post(
      `${API_BASE}/runs/${runId}/finish`,
      { distanceKm, durationSeconds, avgPace },
      { headers }
    );

    const data = finishRes.data;
    console.log(`\n   ✅ Run finished!`);
    console.log(`   Anomaly: ${data.anomaly?.isSuspicious ? '🚨 FLAGGED' : '✅ Clean'}`);
    if (data.anomaly?.reasons?.length) {
      console.log(`   Reasons: ${data.anomaly.reasons.join(', ')}`);
    }
    console.log(`   Map Match: confidence=${data.mapMatch?.confidence || 0}, fallback=${data.mapMatch?.usedFallback}`);

    if (data.territory) {
      console.log(`\n   🗺️  Territory:`);
      console.log(`      Captured: ${data.territory.captured || 0}`);
      console.log(`      Transferred: ${data.territory.transferred || 0}`);
      console.log(`      Message: ${data.territory.message || 'N/A'}`);
    }

    if (data.points) {
      console.log(`\n   ⭐ Points:`);
      console.log(`      Total: ${data.points.total}`);
      console.log(`      Breakdown: ${JSON.stringify(data.points.breakdown)}`);
    }

    if (data.progression) {
      console.log(`\n   📈 Progression:`);
      console.log(`      Streak: ${data.progression.streak?.currentStreak || 0} days`);
      if (data.progression.unlockedAchievements?.length) {
        console.log(`      🏆 Achievements unlocked:`);
        for (const a of data.progression.unlockedAchievements) {
          console.log(`         ${a.code} (+${a.xpReward} XP)`);
        }
      }
    }

  } catch (err) {
    console.error('   ❌ Finish failed:', err.response?.data || err.message);
  }

  // ─── Fetch leaderboard ──────────────────────────────────────────
  console.log(`\n5️⃣  Fetching global leaderboard...`);
  try {
    const lbRes = await axios.get(`${API_BASE}/leaderboards?scope=global&limit=10`, { headers });
    const entries = lbRes.data.entries || [];
    if (entries.length) {
      console.log('   🏆 Top 10:');
      entries.forEach((e) => console.log(`      #${e.rank} ${e.userId.slice(0, 8)}... — ${Math.round(e.score)} pts`));
    } else {
      console.log('   (no leaderboard data — Redis may be unavailable)');
    }
  } catch (err) {
    console.log('   (leaderboard unavailable)');
  }

  // ─── Fetch zones ────────────────────────────────────────────────
  console.log(`\n6️⃣  Fetching zones near center...`);
  try {
    const zoneRes = await axios.get(
      `${API_BASE}/zones/nearby?latitude=${CENTER.lat}&longitude=${CENTER.lng}&radiusKm=1`,
      { headers }
    );
    const zones = zoneRes.data.zones || [];
    const mine = zones.filter((z) => z.is_mine).length;
    const enemy = zones.filter((z) => z.owner_id && !z.is_mine).length;
    const unclaimed = zones.filter((z) => !z.owner_id).length;
    console.log(`   Found ${zones.length} zones: ${mine} mine, ${enemy} enemy, ${unclaimed} unclaimed`);
  } catch (err) {
    console.log('   (zone fetch failed)');
  }

  console.log('\n═'.repeat(50));
  console.log('✅ Simulation complete!\n');
};

run().catch(console.error);
