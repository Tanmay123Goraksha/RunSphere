const SPEED_LIMIT_MPS = 7;
const MAX_ACCELERATION_MPS2 = 3.5;
const IMPOSSIBLE_JUMP_MPS = 18;
const STEP_LENGTH_METERS = 0.78;

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const distanceMeters = (a, b) => {
    const R = 6371e3;
    const dLat = toRadians(b.latitude - a.latitude);
    const dLon = toRadians(b.longitude - a.longitude);
    const lat1 = toRadians(a.latitude);
    const lat2 = toRadians(b.latitude);

    const s =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
};

const evaluateAnomalies = (points, options = {}) => {
    const mapMatchConfidence = Number(options.mapMatchConfidence || 0);
    const mapMatchUsedFallback = Boolean(options.mapMatchUsedFallback);

    if (!Array.isArray(points) || points.length < 2) {
        return { isSuspicious: false, reasons: [] };
    }

    const reasons = [];
    let previousSpeed = null;
    let gpsDistanceMeters = 0;
    let totalStepDelta = 0;

    for (let index = 1; index < points.length; index += 1) {
        const prev = points[index - 1];
        const curr = points[index];

        const dtSeconds =
            (new Date(curr.recorded_at).getTime() - new Date(prev.recorded_at).getTime()) / 1000;

        if (!Number.isFinite(dtSeconds) || dtSeconds <= 0) {
            reasons.push('INVALID_TIMESTAMP_SEQUENCE');
            continue;
        }

        const segmentDistance = distanceMeters(prev, curr);
        gpsDistanceMeters += segmentDistance;

        const speed = segmentDistance / dtSeconds;
        if (speed > SPEED_LIMIT_MPS) {
            reasons.push('SPEED_LIMIT_EXCEEDED');
        }

        if (speed > IMPOSSIBLE_JUMP_MPS) {
            reasons.push('GPS_IMPOSSIBLE_JUMP');
        }

        if (previousSpeed !== null) {
            const acceleration = Math.abs(speed - previousSpeed) / dtSeconds;
            if (acceleration > MAX_ACCELERATION_MPS2) {
                reasons.push('UNNATURAL_ACCELERATION');
            }
        }

        previousSpeed = speed;
        totalStepDelta += Number(curr.step_count_delta || 0);
    }

    // Approximate accelerometer cross-check from step deltas.
    if (totalStepDelta > 0) {
        const pedometerDistance = totalStepDelta * STEP_LENGTH_METERS;
        const mismatch = Math.abs(gpsDistanceMeters - pedometerDistance) / gpsDistanceMeters;
        if (Number.isFinite(mismatch) && gpsDistanceMeters > 50 && mismatch > 0.6) {
            reasons.push('GPS_ACCELEROMETER_MISMATCH');
        }
    }

    // Route logic proxy: reject highly sparse runs with long jumps.
    // TODO: replace proxy with OSRM/OSM HMM confidence check.
    const longJumpCount = reasons.filter((reason) => reason === 'GPS_IMPOSSIBLE_JUMP').length;
    if (longJumpCount >= 2) {
        reasons.push('ROUTE_LOGIC_INVALID');
    }

    if (mapMatchUsedFallback || mapMatchConfidence < 0.35) {
        reasons.push('ROUTE_LOGIC_INVALID');
    }

    const uniqueReasons = [...new Set(reasons)];

    return {
        isSuspicious: uniqueReasons.length > 0,
        reasons: uniqueReasons,
    };
};

module.exports = {
    evaluateAnomalies,
};
