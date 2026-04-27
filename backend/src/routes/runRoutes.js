const express = require('express');
const router = express.Router();
const { startRun, syncPoints, finishRun, getRuns, getRunById } = require('../controllers/runController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../validation/validate');
const { getRunsSchema, startRunSchema, runIdParamSchema, syncPointsSchema, finishRunSchema } = require('../validation/runSchemas');

// All run routes are protected
router.use(protect);

router.get('/', validate(getRunsSchema), getRuns);
router.get('/:runId', validate(runIdParamSchema), getRunById);
router.post('/start', validate(startRunSchema), startRun);
router.post('/:runId/sync', validate(syncPointsSchema), syncPoints);
router.post('/:runId/finish', validate(finishRunSchema), finishRun);

module.exports = router;
