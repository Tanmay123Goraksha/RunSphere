const db = require('../config/db');

// Weekly average pace over last 12 weeks
const getPaceTrends = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT
          DATE_TRUNC('week', ended_at) AS week_start,
          ROUND(AVG(avg_pace)::numeric, 2) AS avg_pace,
          ROUND(SUM(distance_km)::numeric, 2) AS total_distance_km,
          COUNT(*) AS run_count
       FROM runs
       WHERE user_id = $1
         AND is_valid = TRUE
         AND ended_at IS NOT NULL
         AND ended_at >= NOW() - INTERVAL '12 weeks'
       GROUP BY DATE_TRUNC('week', ended_at)
       ORDER BY week_start DESC`,
            [req.user.id]
        );

        return res.status(200).json({ paceTrends: result.rows });
    } catch (error) {
        console.error('Error fetching pace trends:', error.message);
        return res.status(500).json({ error: 'Failed to fetch pace trends' });
    }
};

// Weekly and monthly activity summary
const getActivitySummary = async (req, res) => {
    try {
        const { period = 'weekly' } = req.query;
        const interval = period === 'monthly' ? '6 months' : '12 weeks';
        const trunc = period === 'monthly' ? 'month' : 'week';

        const result = await db.query(
            `SELECT
          DATE_TRUNC($3, ended_at) AS period_start,
          COUNT(*) AS run_count,
          ROUND(SUM(distance_km)::numeric, 2) AS total_distance_km,
          ROUND(AVG(avg_pace)::numeric, 2) AS avg_pace,
          SUM(duration_seconds) AS total_duration_seconds,
          (SELECT COUNT(*) FROM zone_ownership_history
           WHERE to_owner_id = $1
             AND created_at >= DATE_TRUNC($3, r.ended_at)
             AND created_at < DATE_TRUNC($3, r.ended_at) + ('1 ' || $3)::interval
          ) AS zones_captured
       FROM runs r
       WHERE r.user_id = $1
         AND r.is_valid = TRUE
         AND r.ended_at IS NOT NULL
         AND r.ended_at >= NOW() - $2::interval
       GROUP BY DATE_TRUNC($3, ended_at)
       ORDER BY period_start DESC`,
            [req.user.id, interval, trunc]
        );

        return res.status(200).json({ period, summary: result.rows });
    } catch (error) {
        console.error('Error fetching activity summary:', error.message);
        return res.status(500).json({ error: 'Failed to fetch activity summary' });
    }
};

// Get user's overall stats snapshot
const getUserStats = async (req, res) => {
    try {
        const [runsResult, zonesResult, streakResult] = await Promise.all([
            db.query(
                `SELECT
            COALESCE(COUNT(*), 0) AS total_runs,
            COALESCE(COUNT(*) FILTER (WHERE is_valid = TRUE), 0) AS valid_runs,
            COALESCE(ROUND(SUM(distance_km)::numeric, 2), 0) AS total_distance_km,
            COALESCE(ROUND(AVG(avg_pace)::numeric, 2), 0) AS avg_pace,
            COALESCE(SUM(duration_seconds), 0) AS total_duration_seconds
         FROM runs WHERE user_id = $1`,
                [req.user.id]
            ),
            db.query(
                `SELECT COALESCE(COUNT(*), 0) AS zones_owned
         FROM zones WHERE owner_id = $1`,
                [req.user.id]
            ),
            db.query(
                `SELECT current_streak, longest_streak
         FROM streaks WHERE user_id = $1`,
                [req.user.id]
            ),
        ]);

        const userResult = await db.query(
            `SELECT username, level, xp FROM users WHERE id = $1`,
            [req.user.id]
        );

        return res.status(200).json({
            user: userResult.rows[0] || {},
            runs: runsResult.rows[0] || {},
            zonesOwned: Number(zonesResult.rows[0]?.zones_owned || 0),
            streak: streakResult.rows[0] || { current_streak: 0, longest_streak: 0 },
        });
    } catch (error) {
        console.error('Error fetching user stats:', error.message);
        return res.status(500).json({ error: 'Failed to fetch user stats' });
    }
};

module.exports = {
    getPaceTrends,
    getActivitySummary,
    getUserStats,
};
