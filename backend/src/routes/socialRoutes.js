const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../validation/validate');
const {
    challengeSchema,
    followActivitySchema,
    clubMissionUpdateSchema,
} = require('../validation/socialSchemas');
const {
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
} = require('../controllers/socialController');

const router = express.Router();

router.use(protect);

// Follow / Unfollow
router.post('/follow/:userId', followUser);
router.delete('/follow/:userId', unfollowUser);
router.get('/followers', getFollowers);
router.get('/following', getFollowing);
router.get('/feed', getFollowFeed);

// Challenges
router.post('/challenge/:targetUserId', validate(challengeSchema), emitChallenge);
router.post('/challenge/:challengeId/respond', respondToChallenge);
router.get('/challenges', getMyChallenges);

// WebSocket event triggers
router.post('/follow-activity', validate(followActivitySchema), emitFollowActivity);
router.post('/club-mission', validate(clubMissionUpdateSchema), emitClubMissionUpdate);

module.exports = router;
