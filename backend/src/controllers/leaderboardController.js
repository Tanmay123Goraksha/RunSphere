const leaderboardService = require('../services/leaderboard/leaderboardService');

const getLeaderboard = async (req, res) => {
    const { scope = 'global', limit = 100, clubId, latitude, longitude, radiusKm } = req.query;

    try {
        const data =
            scope === 'nearby'
                ? await leaderboardService.getNearby({
                    userId: req.user.id,
                    latitude: Number(latitude),
                    longitude: Number(longitude),
                    radiusKm: Number(radiusKm || 3),
                    limit,
                })
                : await leaderboardService.getTop({ scope, limit, clubId });

        return res.status(200).json({ scope, entries: data });
    } catch (error) {
        if (error.message === 'REDIS_UNAVAILABLE') {
            return res.status(503).json({ error: 'Leaderboard cache unavailable. Please retry shortly.' });
        }

        return res.status(400).json({ error: error.message || 'Failed to load leaderboard' });
    }
};

module.exports = {
    getLeaderboard,
};
