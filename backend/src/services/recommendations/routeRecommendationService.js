const db = require('../../config/db');

const getUserBaseline = async (userId) => {
    const result = await db.query(
        `SELECT
      COALESCE(AVG(distance_km), 3) AS avg_distance_km,
      COALESCE(AVG(avg_pace), 7) AS avg_pace
     FROM runs
     WHERE user_id = $1 AND is_valid = TRUE`,
        [userId]
    );

    return {
        avgDistanceKm: Number(result.rows[0]?.avg_distance_km || 3),
        avgPace: Number(result.rows[0]?.avg_pace || 7),
    };
};

const getNearbyZones = async ({ latitude, longitude, radiusKm = 4 }) => {
    const radiusMeters = Math.max(500, Math.min(12000, Number(radiusKm) * 1000));

    const result = await db.query(
        `SELECT h3_index, owner_id, state, COALESCE(best_pace, 99) AS best_pace
     FROM zones
     WHERE ST_DWithin(
       boundary::geography,
       ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
       $3
     )
     LIMIT 300`,
        [Number(longitude), Number(latitude), radiusMeters]
    );

    return result.rows;
};

const scoreFitnessMatch = (candidateDistanceKm, userAvgDistanceKm) => {
    const ratio = candidateDistanceKm / Math.max(0.2, userAvgDistanceKm);
    const delta = Math.abs(1 - ratio);
    return Math.max(0, 100 - delta * 120);
};

const scoreContested = (candidatePace, ownerPace) => {
    if (!Number.isFinite(ownerPace)) {
        return 0;
    }
    const margin = ownerPace - candidatePace;
    if (margin <= 0) {
        return 10;
    }
    return Math.min(100, 25 + margin * 30);
};

const buildCandidates = ({ zones, baseline, userId }) => {
    const unclaimed = zones.filter((zone) => !zone.owner_id || zone.state === 'UNCLAIMED');
    const contested = zones.filter((zone) => zone.owner_id && zone.owner_id !== userId);

    const candidateTemplates = [
        {
            id: 'expand-frontier',
            title: 'Expand Frontier Loop',
            zones: unclaimed.slice(0, 35),
            distanceKm: Math.max(2, Math.min(8, unclaimed.length * 0.08)),
            style: 'capture',
        },
        {
            id: 'contested-strike',
            title: 'Contested Strike Route',
            zones: contested.slice(0, 28),
            distanceKm: Math.max(2, Math.min(9, contested.length * 0.09)),
            style: 'overtake',
        },
        {
            id: 'balanced-control',
            title: 'Balanced Control Circuit',
            zones: [...unclaimed.slice(0, 16), ...contested.slice(0, 14)],
            distanceKm: Math.max(2, Math.min(10, (unclaimed.length + contested.length) * 0.06)),
            style: 'balanced',
        },
    ];

    return candidateTemplates.map((candidate) => {
        const candidatePace = baseline.avgPace;
        const unclaimedScore = Math.min(100, candidate.zones.filter((z) => !z.owner_id).length * 4);
        const fitnessScore = scoreFitnessMatch(candidate.distanceKm, baseline.avgDistanceKm);

        const contestedScores = candidate.zones
            .filter((zone) => zone.owner_id && zone.owner_id !== userId)
            .map((zone) => scoreContested(candidatePace, Number(zone.best_pace)));

        const contestedScore =
            contestedScores.length > 0
                ? contestedScores.reduce((sum, value) => sum + value, 0) / contestedScores.length
                : 0;

        const compositeScore =
            unclaimedScore * 0.45 + fitnessScore * 0.35 + contestedScore * 0.2;

        return {
            id: candidate.id,
            title: candidate.title,
            style: candidate.style,
            distanceKm: Number(candidate.distanceKm.toFixed(2)),
            estimatedPace: Number(candidatePace.toFixed(2)),
            traversedHexes: candidate.zones.map((z) => z.h3_index),
            score: {
                composite: Number(compositeScore.toFixed(2)),
                unclaimedTerritory: Number(unclaimedScore.toFixed(2)),
                fitnessMatch: Number(fitnessScore.toFixed(2)),
                contestedOpportunity: Number(contestedScore.toFixed(2)),
            },
        };
    });
};

const getRouteRecommendations = async ({ userId, latitude, longitude, radiusKm = 4 }) => {
    const baseline = await getUserBaseline(userId);
    const zones = await getNearbyZones({ latitude, longitude, radiusKm });

    const candidates = buildCandidates({ zones, baseline, userId })
        .filter((candidate) => candidate.traversedHexes.length > 0)
        .sort((a, b) => b.score.composite - a.score.composite)
        .slice(0, 3);

    return candidates;
};

module.exports = {
    getRouteRecommendations,
};
