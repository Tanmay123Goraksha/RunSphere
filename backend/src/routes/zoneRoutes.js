const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
    getTerritoriesInArea,
    getTerritoriesNearby,
    getZonesInArea,
    getZonesNearby,
    getZoneDetails,
} = require('../controllers/zoneController');

const router = express.Router();

router.use(protect);

// ─── Territory endpoints (frontend map renderer uses these) ─────────
// Returns smooth, merged-by-owner polygons that follow street shapes.
router.get('/territories', getTerritoriesInArea);
router.get('/territories/nearby', getTerritoriesNearby);

// ─── H3 zone endpoints (kept for backward compat / debugging) ───────
router.get('/area', getZonesInArea);
router.get('/nearby', getZonesNearby);
router.get('/:zoneId', getZoneDetails);

module.exports = router;
