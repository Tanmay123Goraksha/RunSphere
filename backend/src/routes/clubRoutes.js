const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../validation/validate');
const { createClubSchema, clubIdParamSchema, listClubSchema } = require('../validation/clubSchemas');
const { createClub, joinClub, leaveClub, listClubs, myClubs } = require('../controllers/clubController');

const router = express.Router();

router.use(protect);
router.get('/', validate(listClubSchema), listClubs);
router.get('/me', validate(listClubSchema), myClubs);
router.post('/', validate(createClubSchema), createClub);
router.post('/:clubId/join', validate(clubIdParamSchema), joinClub);
router.post('/:clubId/leave', validate(clubIdParamSchema), leaveClub);

module.exports = router;
