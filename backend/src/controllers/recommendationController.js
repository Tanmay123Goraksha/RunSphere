const { getRouteRecommendations } = require('../services/recommendations/routeRecommendationService');

const getPreRunRecommendations = async (req, res) => {
    const { latitude, longitude, radiusKm = 4 } = req.query;

    try {
        const recommendations = await getRouteRecommendations({
            userId: req.user.id,
            latitude: Number(latitude),
            longitude: Number(longitude),
            radiusKm: Number(radiusKm),
        });

        return res.status(200).json({
            recommendations,
        });
    } catch (error) {
        return res.status(500).json({ error: error.message || 'Failed to generate route recommendations' });
    }
};

module.exports = {
    getPreRunRecommendations,
};
