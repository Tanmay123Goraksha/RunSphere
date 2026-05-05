const { getIO } = require('../socket/socketManager');
const followService = require('../services/social/followService');
const challengeService = require('../services/social/challengeService');

// ─── Follow ──────────────────────────────────────────────────────────────────

const followUser = async (req, res) => {
    const { userId: targetUserId } = req.params;

    try {
        await followService.followUser(req.user.id, targetUserId);

        const io = getIO();
        if (io) {
            io.to(`user:${targetUserId}`).emit('follow:new', {
                eventType: 'follow:new',
                followerId: req.user.id,
                createdAt: new Date().toISOString(),
            });
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(400).json({ error: error.message || 'Failed to follow user' });
    }
};

const unfollowUser = async (req, res) => {
    const { userId: targetUserId } = req.params;

    try {
        await followService.unfollowUser(req.user.id, targetUserId);
        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to unfollow user' });
    }
};

const getFollowers = async (req, res) => {
    try {
        const followers = await followService.getFollowers(req.user.id);
        return res.status(200).json({ followers });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch followers' });
    }
};

const getFollowing = async (req, res) => {
    try {
        const following = await followService.getFollowing(req.user.id);
        return res.status(200).json({ following });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch following' });
    }
};

const getFollowFeed = async (req, res) => {
    try {
        const feed = await followService.getFollowFeed(req.user.id);
        return res.status(200).json({ feed });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch feed' });
    }
};

// ─── Challenges ──────────────────────────────────────────────────────────────

const emitChallenge = async (req, res) => {
    const { targetUserId } = req.params;
    const { zoneH3Index, message } = req.body;

    try {
        const challenge = await challengeService.createChallenge({
            fromUserId: req.user.id,
            toUserId: targetUserId,
            zoneH3Index,
            message,
        });

        const io = getIO();
        if (io) {
            io.to(`user:${targetUserId}`).emit('challenge:received', {
                eventType: 'challenge:received',
                challenge,
                fromUserId: req.user.id,
                createdAt: new Date().toISOString(),
            });
        }

        return res.status(201).json({ challenge });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to send challenge' });
    }
};

const respondToChallenge = async (req, res) => {
    const { challengeId } = req.params;
    const { accepted } = req.body;

    try {
        const challenge = await challengeService.respondToChallenge({
            challengeId,
            userId: req.user.id,
            accepted: Boolean(accepted),
        });

        const io = getIO();
        if (io) {
            io.to(`user:${challenge.from_user_id}`).emit('challenge:response', {
                eventType: 'challenge:response',
                challengeId,
                accepted: Boolean(accepted),
                respondedBy: req.user.id,
            });
        }

        return res.status(200).json({ challenge });
    } catch (error) {
        return res.status(400).json({ error: error.message || 'Failed to respond to challenge' });
    }
};

const getMyChallenges = async (req, res) => {
    try {
        const challenges = await challengeService.getChallengesForUser(
            req.user.id,
            req.query.status || null
        );
        return res.status(200).json({ challenges });
    } catch (error) {
        return res.status(500).json({ error: 'Failed to fetch challenges' });
    }
};

// ─── Follow Activity & Club Missions (WebSocket-only) ────────────────────────

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
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    getFollowFeed,
    emitChallenge,
    respondToChallenge,
    getMyChallenges,
    emitFollowActivity,
    emitClubMissionUpdate,
};
