const { getProgressionSummary } = require('../services/gamification/progressionService');

const getMyProgression = async (req, res) => {
    try {
        const summary = await getProgressionSummary(req.user.id);
        return res.status(200).json(summary);
    } catch (error) {
        return res.status(500).json({ error: 'Failed to load progression summary' });
    }
};

module.exports = {
    getMyProgression,
};
