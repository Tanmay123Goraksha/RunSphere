const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../validation/validate');
const { progressionSummarySchema } = require('../validation/progressionSchemas');
const { getMyProgression } = require('../controllers/progressionController');

const router = express.Router();

router.use(protect);
router.get('/me', validate(progressionSummarySchema), getMyProgression);

module.exports = router;
