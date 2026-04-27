const axios = require('axios');

const OSRM_BASE_URL = process.env.OSRM_URL || 'http://router.project-osrm.org';

const mapMatchRunPoints = async (points) => {
    if (!Array.isArray(points) || points.length < 2) {
        return {
            matchedPoints: points || [],
            confidence: 0,
            usedFallback: true,
            reason: 'INSUFFICIENT_POINTS',
        };
    }

    try {
        const coordinates = points.map((point) => `${point.longitude},${point.latitude}`).join(';');
        const timestamps = points
            .map((point) => Math.floor(new Date(point.recorded_at).getTime() / 1000))
            .join(';');

        const url = `${OSRM_BASE_URL}/match/v1/foot/${coordinates}`;

        const response = await axios.get(url, {
            params: {
                geometries: 'geojson',
                overview: 'full',
                timestamps,
                radiuses: points.map(() => 20).join(';'),
            },
            timeout: 10000,
        });

        const firstMatch = response.data?.matchings?.[0];
        const matchedCoordinates = firstMatch?.geometry?.coordinates || [];

        if (!matchedCoordinates.length) {
            return {
                matchedPoints: points,
                confidence: 0,
                usedFallback: true,
                reason: 'NO_MATCHINGS',
            };
        }

        const matchedPoints = matchedCoordinates.map(([longitude, latitude], index) => ({
            latitude,
            longitude,
            recorded_at: points[Math.min(index, points.length - 1)].recorded_at,
            step_count_delta: points[Math.min(index, points.length - 1)].step_count_delta || 0,
        }));

        return {
            matchedPoints,
            confidence: Number(firstMatch.confidence || 0),
            usedFallback: false,
            reason: null,
        };
    } catch (error) {
        return {
            matchedPoints: points,
            confidence: 0,
            usedFallback: true,
            reason: 'OSRM_UNAVAILABLE',
            errorMessage: error.message,
        };
    }
};

module.exports = {
    mapMatchRunPoints,
};
