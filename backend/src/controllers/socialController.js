const { getIO } = require('../socket/socketManager');

const emitChallenge = async (req, res) => {
    const { targetUserId } = req.params;
    const { zoneH3Index, message } = req.body;

    try {
        const io = getIO();

        if (!io) {
            return res.status(503).json({ error: 'Realtime server unavailable' });
        }

        io.to(`user:${targetUserId}`).emit('challenge:received', {
            eventType: 'challenge:received',
            fromUserId: req.user.id,
            targetUserId,
            zoneH3Index,
            message: message || 'Territory battle challenge',
            createdAt: new Date().toISOString(),
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to send challenge' });
    }
};

const emitFollowActivity = async (req, res) => {
    const { followerUserId, activityType, runId } = req.body;

    try {
        const io = getIO();

        if (!io) {
            return res.status(503).json({ error: 'Realtime server unavailable' });
        }

        io.to(`user:${followerUserId}`).emit('follow:activity', {
            eventType: 'follow:activity',
            actorUserId: req.user.id,
            followerUserId,
            activityType,
            runId: runId || null,
            createdAt: new Date().toISOString(),
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to emit follow activity' });
    }
};

const emitClubMissionUpdate = async (req, res) => {
    const { clubId, missionId, progress } = req.body;

    try {
        const io = getIO();

        if (!io) {
            return res.status(503).json({ error: 'Realtime server unavailable' });
        }

        io.to(`club:${clubId}`).emit('club:mission:update', {
            eventType: 'club:mission:update',
            clubId,
            missionId,
            progress,
            updatedBy: req.user.id,
            updatedAt: new Date().toISOString(),
        });

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to emit club mission update' });
    }
};

module.exports = {
    emitChallenge,
    emitFollowActivity,
    emitClubMissionUpdate,
};
