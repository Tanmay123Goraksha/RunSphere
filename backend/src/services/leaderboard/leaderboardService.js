const { redisClient, ensureRedisConnection, isRedisReady } = require('../../config/redis');
const db = require('../../config/db');

const weeklyKey = () => {
    const now = new Date();
    const year = now.getUTCFullYear();
    const week = Math.ceil((now.getUTCDate() + 6 - now.getUTCDay()) / 7);
    return `leaderboard:weekly:${year}-${String(week).padStart(2, '0')}`;
};

const keys = {
    global: 'leaderboard:global',
    weekly: weeklyKey,
    club: (clubId) => `leaderboard:club:${clubId}`,
};

const updateScore = async ({ userId, points, clubId }) => {
    const score = Number(points) || 0;

    if (score <= 0) {
        return;
    }

    const ready = await ensureRedisConnection();
    if (!ready || !isRedisReady()) {
        return;
    }

    await redisClient.zIncrBy(keys.global, score, userId);
    await redisClient.zIncrBy(keys.weekly(), score, userId);

    if (clubId) {
        await redisClient.zIncrBy(keys.club(clubId), score, userId);
    }
};

const getTop = async ({ scope, limit = 100, clubId }) => {
    const parsedLimit = Math.max(1, Math.min(200, Number(limit) || 100));

    const ready = await ensureRedisConnection();
    if (!ready || !isRedisReady()) {
        throw new Error('REDIS_UNAVAILABLE');
    }

    let key;
    if (scope === 'club') {
        if (!clubId) {
            throw new Error('clubId is required for club scope');
        }
        key = keys.club(clubId);
    } else if (scope === 'weekly') {
        key = keys.weekly();
    } else {
        key = keys.global;
    }

    const rows = await redisClient.zRangeWithScores(key, 0, parsedLimit - 1, {
        REV: true,
    });

    return rows.map((row, index) => ({
        rank: index + 1,
        userId: row.value,
        score: Number(row.score),
    }));
};

const getNearby = async ({ userId, latitude, longitude, radiusKm = 3, limit = 50 }) => {
    const parsedLimit = Math.max(1, Math.min(100, Number(limit) || 50));
    const radiusMeters = Math.max(100, Math.min(20000, Number(radiusKm) * 1000));

    const ready = await ensureRedisConnection();
    if (!ready || !isRedisReady()) {
        throw new Error('REDIS_UNAVAILABLE');
    }

    const nearbyUsers = await db.query(
        `WITH latest_user_points AS (
       SELECT DISTINCT ON (r.user_id)
              r.user_id,
              rp.geom,
              rp.recorded_at
       FROM runs r
       JOIN run_points rp ON rp.run_id = r.id
       WHERE r.user_id <> $1
       ORDER BY r.user_id, rp.recorded_at DESC
     )
     SELECT user_id
     FROM latest_user_points
     WHERE ST_DWithin(
       geom::geography,
       ST_SetSRID(ST_MakePoint($2, $3), 4326)::geography,
       $4
     )
     LIMIT $5`,
        [userId, Number(longitude), Number(latitude), radiusMeters, parsedLimit]
    );

    const scoreRows = await Promise.all(
        nearbyUsers.rows.map(async (row) => {
            const scoreRaw = await redisClient.zScore(keys.global, row.user_id);
            return {
                userId: row.user_id,
                score: Number(scoreRaw || 0),
            };
        })
    );

    return scoreRows
        .sort((a, b) => b.score - a.score)
        .map((row, index) => ({
            rank: index + 1,
            userId: row.userId,
            score: row.score,
        }));
};

const appendLeaderboardEvent = async ({ userId, runId, points, scope }) => {
    await db.query(
        `INSERT INTO leaderboard_events (user_id, run_id, points, scope)
     VALUES ($1, $2, $3, $4)`,
        [userId, runId || null, Number(points) || 0, scope]
    );
};

module.exports = {
    updateScore,
    getTop,
    getNearby,
    appendLeaderboardEvent,
};
