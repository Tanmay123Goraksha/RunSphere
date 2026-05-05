const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const runRoutes = require('./routes/runRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const socialRoutes = require('./routes/socialRoutes');
const clubRoutes = require('./routes/clubRoutes');
const progressionRoutes = require('./routes/progressionRoutes');
const zoneRoutes = require('./routes/zoneRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Parses incoming JSON requests

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/runs', runRoutes);
app.use('/api/leaderboards', leaderboardRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/progression', progressionRoutes);
app.use('/api/zones', zoneRoutes);
app.use('/api/analytics', analyticsRoutes);

module.exports = app;