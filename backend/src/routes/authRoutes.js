const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/userModel'); // Import to fetch profile

// Public routes
router.post('/register', registerUser);
router.post('/login', loginUser);

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