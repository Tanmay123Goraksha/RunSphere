const Run = require('../models/runModel');
const { evaluateAnomalies } = require('../services/anomaly/runAnomalyService');
const { getHexesFromPoints } = require('../services/zones/h3ZoneService');
const { mapMatchRunPoints } = require('../services/mapMatching/osrmService');
const { calculateRunPoints } = require('../services/gamification/pointsService');
const { applyPostRunProgression } = require('../services/gamification/progressionService');
const leaderboardService = require('../services/leaderboard/leaderboardService');
const { getIO } = require('../socket/socketManager');

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
        step_count_delta: Math.max(0, Math.round(Number(point.step_count_delta || 0))),
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

    const lastPoint = sanitizedPoints[sanitizedPoints.length - 1];
    const io = getIO();
    if (io && lastPoint) {
      io.to(`user:${userId}`).emit('run:nearby', {
        eventType: 'run:nearby',
        runId,
        userId,
        point: lastPoint,
      });
    }

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

    // 1. End the run and persist summary metrics.
    const endedRun = await Run.endRun(runId, safeDistance, safeDuration, safeAvgPace);

    // 2. Evaluate run quality and quarantine suspicious runs.
    const runPoints = await Run.getRunPointsForRun(runId);
    const mapMatchResult = await mapMatchRunPoints(runPoints);

    const anomaly = evaluateAnomalies(mapMatchResult.matchedPoints, {
      mapMatchConfidence: mapMatchResult.confidence,
      mapMatchUsedFallback: mapMatchResult.usedFallback,
    });

    await Run.updateRunRouteGeometry(runId, mapMatchResult.matchedPoints);

    if (anomaly.isSuspicious) {
      await Run.markRunAnomalous(runId, anomaly.reasons);

      return res.status(200).json({
        message: 'Run finished and quarantined for review',
        run: endedRun,
        anomaly,
        mapMatch: {
          confidence: mapMatchResult.confidence,
          usedFallback: mapMatchResult.usedFallback,
          reason: mapMatchResult.reason || null,
        },
        territory: {
          success: false,
          message: 'Run flagged as suspicious. Territory capture and XP were skipped.',
        },
      });
    }

    // 3. Convert matched path points into H3 cells and apply ownership rules.
    const traversedHexes = getHexesFromPoints(mapMatchResult.matchedPoints);
    const captureResult = await Run.captureHexZones({
      runId,
      userId,
      avgPace: safeAvgPace,
      traversedHexes,
    });

    const pointsResult = calculateRunPoints({
      distanceKm: safeDistance,
      avgPace: safeAvgPace,
      captured: captureResult.captured,
      transferred: captureResult.transferred,
    });

    await Run.addXpToUser(userId, pointsResult.total);

    const progressionResult = await applyPostRunProgression({
      userId,
      runDate: new Date(endedRun.ended_at || Date.now()),
    });

    const totalScoreContribution = pointsResult.total + Number(progressionResult.bonusXp || 0);

    try {
      await leaderboardService.updateScore({
        userId,
        points: totalScoreContribution,
        clubId: endedRun.club_id,
      });

      await leaderboardService.appendLeaderboardEvent({
        userId,
        runId,
        points: totalScoreContribution,
        scope: endedRun.club_id ? 'GLOBAL_AND_CLUB' : 'GLOBAL',
      });
    } catch (leaderboardError) {
      console.warn('Leaderboard update skipped:', leaderboardError.message);
    }

    const io = getIO();
    if (io && captureResult.transferred > 0) {
      io.emit('zone:stolen', {
        eventType: 'zone:stolen',
        runId,
        userId,
        transferred: captureResult.transferred,
      });
    }

    res.status(200).json({
      message: 'Run finished successfully',
      run: endedRun,
      anomaly,
      mapMatch: {
        confidence: mapMatchResult.confidence,
        usedFallback: mapMatchResult.usedFallback,
        reason: mapMatchResult.reason || null,
      },
      points: pointsResult,
      progression: progressionResult,
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