const Run = require('../models/runModel');

const startRun = async (req, res) => {
  try {
    // req.user.id comes from your authMiddleware
    const newRun = await Run.createRun(req.user.id);
    res.status(201).json({ 
      message: 'Run started successfully', 
      runId: newRun.id,
      startedAt: newRun.started_at
    });
  } catch (error) {
    console.error('Error starting run:', error.message);
    res.status(500).json({ error: 'Failed to start run' });
  }
};

const syncPoints = async (req, res) => {
  const { runId } = req.params;
  const { points } = req.body; // Expecting an array of objects

  // Basic validation
  if (!points || !Array.isArray(points) || points.length === 0) {
    return res.status(400).json({ error: 'Valid points array is required' });
  }

  try {
    await Run.addRunPoints(runId, points);
    res.status(200).json({ message: `${points.length} points synced successfully` });
  } catch (error) {
    console.error('Error syncing points:', error.message);
    res.status(500).json({ error: 'Failed to sync points' });
  }
};


const finishRun = async (req, res) => {
  const { runId } = req.params;
  const { distanceKm, durationSeconds } = req.body;
  const userId = req.user.id; // Get the user ID from the auth token!

  try {
    // 1. End the run and update stats
    const endedRun = await Run.endRun(runId, distanceKm, durationSeconds);

    // 2. The Magic: Check if they captured a zone!
    const captureResult = await Run.detectAndCreateZone(runId, userId);

    res.status(200).json({ 
      message: 'Run finished successfully', 
      run: endedRun,
      territory: captureResult // Send the result back to the mobile app
    });
  } catch (error) {
    console.error('Error finishing run:', error.message);
    res.status(500).json({ error: 'Failed to finish run' });
  }
};


module.exports = { startRun, syncPoints, finishRun };