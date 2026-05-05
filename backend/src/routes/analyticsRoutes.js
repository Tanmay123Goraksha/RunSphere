const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { getPaceTrends, getActivitySummary, getUserStats } = require('../controllers/analyticsController');

const router = express.Router();

router.use(protect);

router.get('/pace-trends', getPaceTrends);
router.get('/activity-summary', getActivitySummary);
router.get('/stats', getUserStats);

module.exports = router;
