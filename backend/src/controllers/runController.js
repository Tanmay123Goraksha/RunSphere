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
  const userId = req.user.id;

  // Basic validation
  if (!points || !Array.isArray(points) || points.length === 0) {
    return res.status(400).json({ error: 'Valid points array is required' });
  }

  try {
    const isOwner = await Run.validateRunOwnership(runId, userId);
    if (!isOwner) {
      return res.status(404).json({ error: 'Run not found for this user' });
    }

    const sanitizedPoints = points
      .map((point) => ({
        latitude: Number(point.latitude),
        longitude: Number(point.longitude),
        recorded_at: point.recorded_at || new Date().toISOString(),
      }))
      .filter(
        (point) =>
          Number.isFinite(point.latitude) &&
          Number.isFinite(point.longitude) &&
          typeof point.recorded_at === 'string'
      );

    if (sanitizedPoints.length === 0) {
      return res.status(400).json({ error: 'No valid GPS points received' });
    }

    await Run.addRunPoints(runId, sanitizedPoints);
    res.status(200).json({ message: `${points.length} points synced successfully` });
  } catch (error) {
    console.error('Error syncing points:', error.message);
    res.status(500).json({ error: 'Failed to sync points' });
  }
};


const finishRun = async (req, res) => {
  const { runId } = req.params;
  const { distanceKm, durationSeconds, avgPace } = req.body;
  const userId = req.user.id; // Get the user ID from the auth token!

  try {
    const isOwner = await Run.validateRunOwnership(runId, userId);
    if (!isOwner) {
      return res.status(404).json({ error: 'Run not found for this user' });
    }

    const safeDistance = Number(distanceKm) || 0;
    const safeDuration = Math.max(0, Math.round(Number(durationSeconds) || 0));
    const safeAvgPace = Number.isFinite(Number(avgPace)) ? Number(avgPace) : null;

    // 1. End the run and update stats
    const endedRun = await Run.endRun(runId, safeDistance, safeDuration, safeAvgPace);

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

const getRuns = async (req, res) => {
  try {
    const runs = await Run.getRunsForUser(req.user.id);
    res.status(200).json({ runs });
  } catch (error) {
    console.error('Error fetching runs:', error.message);
    res.status(500).json({ error: 'Failed to fetch runs' });
  }
};

const getRunById = async (req, res) => {
  try {
    const run = await Run.getRunByIdForUser(req.params.runId, req.user.id);
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }

    res.status(200).json({ run });
  } catch (error) {
    console.error('Error fetching run details:', error.message);
    res.status(500).json({ error: 'Failed to fetch run details' });
  }
};


module.exports = { startRun, syncPoints, finishRun, getRuns, getRunById };