const express = require('express');
const router = express.Router();
const { startRun, syncPoints, finishRun, getRuns, getRunById } = require('../controllers/runController');
const { protect } = require('../middleware/authMiddleware');

// All run routes are protected
router.use(protect);

router.get('/', getRuns);
router.get('/:runId', getRunById);
router.post('/start', startRun);
router.post('/:runId/sync', syncPoints);
router.post('/:runId/finish', finishRun);

module.exports = router;
