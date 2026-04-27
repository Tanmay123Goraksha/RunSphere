const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/userModel'); // Import to fetch profile
const validate = require('../validation/validate');
const { registerSchema, loginSchema } = require('../validation/authSchemas');

// Public routes
router.post('/register', validate(registerSchema), registerUser);
router.post('/login', validate(loginSchema), loginUser);

// Protected route example
router.get('/profile', protect, async (req, res) => {
  try {
    // req.user.id comes from the authMiddleware
    const userProfile = await User.getUserById(req.user.id);

    if (!userProfile) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(userProfile);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;