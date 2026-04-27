const { latLngToCell, cellToBoundary } = require('h3-js');

const DEFAULT_H3_RESOLUTION = Number(process.env.H3_RESOLUTION || 10);

const getHexesFromPoints = (points, resolution = DEFAULT_H3_RESOLUTION) => {
    const set = new Set();

    for (const point of points) {
        const hex = latLngToCell(Number(point.latitude), Number(point.longitude), resolution);
        set.add(hex);
    }

    return [...set];
};

const hexBoundaryToWktPolygon = (hex) => {
    const boundary = cellToBoundary(hex);
    const closed = [...boundary, boundary[0]];
    const ring = closed.map(([lat, lng]) => `${lng} ${lat}`).join(', ');
    return `POLYGON((${ring}))`;
};

module.exports = {
    getHexesFromPoints,
    hexBoundaryToWktPolygon,
};
