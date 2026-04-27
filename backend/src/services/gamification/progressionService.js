const db = require('../../config/db');

const ACHIEVEMENT_DEFINITIONS = [
    {
        code: 'FIRST_RUN',
        name: 'First Steps',
        description: 'Complete your first valid run.',
        xpReward: 50,
    },
    {
        code: 'TEN_ZONES_CAPTURED',
        name: 'Area Controller',
        description: 'Capture or steal 10 zones.',
        xpReward: 120,
    },
    {
        code: 'STREAK_7',
        name: 'Week Warrior',
        description: 'Maintain a 7-day run streak.',
        xpReward: 140,
    },
    {
        code: 'DISTANCE_100KM',
        name: 'Centurion',
        description: 'Run 100 km in total.',
        xpReward: 180,
    },
];

const toDateOnly = (value) => {
    const date = value ? new Date(value) : new Date();
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

const differenceInDays = (a, b) => {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.round((toDateOnly(a).getTime() - toDateOnly(b).getTime()) / msPerDay);
};

const seedAchievementCatalog = async () => {
    for (const item of ACHIEVEMENT_DEFINITIONS) {
        await db.query(
            `INSERT INTO achievements (code, name, description, xp_reward)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         xp_reward = EXCLUDED.xp_reward`,
            [item.code, item.name, item.description, item.xpReward]
        );
    }
};

const updateStreak = async (userId, runDate = new Date()) => {
    const streakResult = await db.query(
        `SELECT user_id, current_streak, longest_streak, last_active_date
     FROM streaks
     WHERE user_id = $1`,
        [userId]
    );

    const today = toDateOnly(runDate);
    let currentStreak = 1;
    let longestStreak = 1;

    if (streakResult.rowCount > 0) {
        const existing = streakResult.rows[0];
        const dayDiff = differenceInDays(today, existing.last_active_date);

        if (dayDiff === 0) {
            currentStreak = Number(existing.current_streak);
        } else if (dayDiff === 1) {
            currentStreak = Number(existing.current_streak) + 1;
        } else {
            currentStreak = 1;
        }

        longestStreak = Math.max(Number(existing.longest_streak || 1), currentStreak);

        await db.query(
            `UPDATE streaks
       SET current_streak = $2,
           longest_streak = $3,
           last_active_date = $4
       WHERE user_id = $1`,
            [userId, currentStreak, longestStreak, today.toISOString().slice(0, 10)]
        );
    } else {
        await db.query(
            `INSERT INTO streaks (user_id, current_streak, longest_streak, last_active_date)
       VALUES ($1, 1, 1, $2)`,
            [userId, today.toISOString().slice(0, 10)]
        );
    }

    return {
        currentStreak,
        longestStreak,
        lastActiveDate: today.toISOString().slice(0, 10),
    };
};

const getUserStats = async (userId) => {
    const statsResult = await db.query(
        `SELECT
       COALESCE(COUNT(*) FILTER (WHERE is_valid = TRUE), 0) AS valid_runs,
       COALESCE(SUM(distance_km) FILTER (WHERE is_valid = TRUE), 0) AS total_distance_km
     FROM runs
     WHERE user_id = $1`,
        [userId]
    );

    const zonesResult = await db.query(
        `SELECT COALESCE(COUNT(*), 0) AS captured_events
     FROM zone_ownership_history
     WHERE to_owner_id = $1`,
        [userId]
    );

    const row = statsResult.rows[0] || {};

    return {
        validRuns: Number(row.valid_runs || 0),
        totalDistanceKm: Number(row.total_distance_km || 0),
        capturedEvents: Number(zonesResult.rows[0]?.captured_events || 0),
    };
};

const tryUnlock = async ({ userId, code }) => {
    const result = await db.query(
        `WITH achievement_row AS (
       SELECT id, xp_reward
       FROM achievements
       WHERE code = $2
     ), inserted AS (
       INSERT INTO user_achievements (user_id, achievement_id)
       SELECT $1, id FROM achievement_row
       ON CONFLICT (user_id, achievement_id) DO NOTHING
       RETURNING achievement_id
     )
     SELECT ar.id, ar.xp_reward
     FROM achievement_row ar
     JOIN inserted i ON i.achievement_id = ar.id`,
        [userId, code]
    );

    if (result.rowCount === 0) {
        return null;
    }

    const unlocked = result.rows[0];
    return {
        code,
        xpReward: Number(unlocked.xp_reward || 0),
    };
};

const evaluateUnlocks = async ({ userId, streak, stats }) => {
    const unlockCandidates = [];

    if (stats.validRuns >= 1) {
        unlockCandidates.push('FIRST_RUN');
    }

    if (stats.capturedEvents >= 10) {
        unlockCandidates.push('TEN_ZONES_CAPTURED');
    }

    if (streak.currentStreak >= 7) {
        unlockCandidates.push('STREAK_7');
    }

    if (stats.totalDistanceKm >= 100) {
        unlockCandidates.push('DISTANCE_100KM');
    }

    const unlocked = [];
    let bonusXp = 0;

    for (const code of unlockCandidates) {
        const item = await tryUnlock({ userId, code });
        if (item) {
            unlocked.push(item);
            bonusXp += item.xpReward;
        }
    }

    if (bonusXp > 0) {
        await db.query(
            `UPDATE users
       SET xp = xp + $2
       WHERE id = $1`,
            [userId, bonusXp]
        );
    }

    return { unlocked, bonusXp };
};

const applyPostRunProgression = async ({ userId, runDate = new Date() }) => {
    await seedAchievementCatalog();

    const streak = await updateStreak(userId, runDate);
    const stats = await getUserStats(userId);
    const unlockResult = await evaluateUnlocks({ userId, streak, stats });

    return {
        streak,
        unlockedAchievements: unlockResult.unlocked,
        bonusXp: unlockResult.bonusXp,
        stats,
    };
};

const getProgressionSummary = async (userId) => {
    await seedAchievementCatalog();

    const [streakResult, stats, achievementResult] = await Promise.all([
        db.query(
            `SELECT user_id, current_streak, longest_streak, last_active_date
       FROM streaks
       WHERE user_id = $1`,
            [userId]
        ),
        getUserStats(userId),
        db.query(
            `SELECT a.code, a.name, a.description, a.xp_reward, ua.unlocked_at
       FROM user_achievements ua
       JOIN achievements a ON a.id = ua.achievement_id
       WHERE ua.user_id = $1
       ORDER BY ua.unlocked_at DESC`,
            [userId]
        ),
    ]);

    return {
        streak:
            streakResult.rowCount > 0
                ? {
                    currentStreak: Number(streakResult.rows[0].current_streak),
                    longestStreak: Number(streakResult.rows[0].longest_streak),
                    lastActiveDate: streakResult.rows[0].last_active_date,
                }
                : {
                    currentStreak: 0,
                    longestStreak: 0,
                    lastActiveDate: null,
                },
        stats,
        achievements: achievementResult.rows,
    };
};

module.exports = {
    applyPostRunProgression,
    getProgressionSummary,
};
