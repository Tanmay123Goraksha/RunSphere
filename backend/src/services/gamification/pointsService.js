const calculateRunPoints = ({ distanceKm, avgPace, captured, transferred }) => {
    const safeDistance = Number(distanceKm) || 0;
    const safePace = Number.isFinite(Number(avgPace)) ? Number(avgPace) : null;

    const distancePoints = Math.round(safeDistance * 30);
    const paceBonus = safePace && safePace < 6 ? Math.round((6 - safePace) * 15) : 0;
    const capturePoints = Number(captured || 0) * 20;
    const transferPoints = Number(transferred || 0) * 35;

    const total = Math.max(0, distancePoints + paceBonus + capturePoints + transferPoints);

    return {
        total,
        breakdown: {
            distancePoints,
            paceBonus,
            capturePoints,
            transferPoints,
        },
    };
};

module.exports = {
    calculateRunPoints,
};
