const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  let token;

  // Check if the authorization header exists and starts with 'Bearer'
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract token from header (Format: "Bearer <token>")
      token = req.headers.authorization.split(' ')[1];

      // Verify token using your secret
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach the user's UUID to the request object so future routes can use it
      req.user = { id: decoded.id };

      next(); // Move on to the actual route controller
    } catch (error) {
      console.error('Token verification failed:', error.message);
      return res.status(401).json({ error: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Not authorized, no token provided' });
  }
};

module.exports = { protect };