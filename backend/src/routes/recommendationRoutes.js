const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../validation/validate');
const { recommendationQuerySchema } = require('../validation/recommendationSchemas');
const { getPreRunRecommendations } = require('../controllers/recommendationController');

const router = express.Router();

router.use(protect);
router.get('/pre-run', validate(recommendationQuerySchema), getPreRunRecommendations);

module.exports = router;
