const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../validation/validate');
const {
    challengeSchema,
    followActivitySchema,
    clubMissionUpdateSchema,
} = require('../validation/socialSchemas');
const {
    emitChallenge,
    emitFollowActivity,
    emitClubMissionUpdate,
} = require('../controllers/socialController');

const router = express.Router();

router.use(protect);
router.post('/challenge/:targetUserId', validate(challengeSchema), emitChallenge);
router.post('/follow-activity', validate(followActivitySchema), emitFollowActivity);
router.post('/club-mission', validate(clubMissionUpdateSchema), emitClubMissionUpdate);

module.exports = router;
