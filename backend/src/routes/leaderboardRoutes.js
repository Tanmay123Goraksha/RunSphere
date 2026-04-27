const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getLeaderboard } = require('../controllers/leaderboardController');
const validate = require('../validation/validate');
const { leaderboardQuerySchema } = require('../validation/leaderboardSchemas');

const router = express.Router();

router.use(protect);
router.get('/', validate(leaderboardQuerySchema), getLeaderboard);

module.exports = router;
