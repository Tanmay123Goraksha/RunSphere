const db = require('../config/db');
const { getMergedTerritoriesInArea, getMergedTerritoriesNearby } = require('../services/zones/territoryService');

/**
 * GET /zones/territories
 * Returns smooth, street-following territory polygons merged by owner.
 * This is what the frontend renders — NOT H3 hexagonal cells.
 */
const getTerritoriesInArea = async (req, res) => {
    try {
        const { minLatitude, maxLatitude, minLongitude, maxLongitude } = req.query;

        if (!minLatitude || !maxLatitude || !minLongitude || !maxLongitude) {
            return res.status(400).json({ error: 'Missing bounding box parameters' });
        }

        const territories = await getMergedTerritoriesInArea({
            minLat: parseFloat(minLatitude),
            maxLat: parseFloat(maxLatitude),
            minLon: parseFloat(minLongitude),
            maxLon: parseFloat(maxLongitude),
            requestingUserId: req.user.id,
        });

        return res.json({ territories });
    } catch (error) {
        console.error('Error fetching territories:', error);
        return res.status(500).json({ error: 'Failed to fetch territories' });
    }
};

/**
 * GET /zones/territories/nearby
 * Returns merged territory polygons near a point.
 */
const getTerritoriesNearby = async (req, res) => {
    try {
        const { latitude, longitude, radiusKm } = req.query;
        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);
        const radiusMeters = parseFloat(radiusKm || '5') * 1000;

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            return res.status(400).json({ error: 'Invalid coordinates' });
        }

        const territories = await getMergedTerritoriesNearby({
            lat,
            lon,
            radiusMeters,
            requestingUserId: req.user.id,
        });

        return res.json({ territories });
    } catch (error) {
        console.error('Error fetching territories nearby:', error);
        return res.status(500).json({ error: 'Failed to fetch territories' });
    }
};

/**
 * GET /zones/area — existing H3 zone endpoint (kept for backward compat
 * but no longer used by the frontend map renderer)
 */
const getZonesInArea = async (req, res) => {
    try {
        const { minLatitude, maxLatitude, minLongitude, maxLongitude } = req.query;

        if (!minLatitude || !maxLatitude || !minLongitude || !maxLongitude) {
            return res.status(400).json({ error: 'Missing bounding box parameters' });
        }

        const result = await db.query(
            `SELECT z.id, z.h3_index, z.owner_id, z.state, z.best_pace,
              z.total_defenses, z.held_since,
              ST_AsGeoJSON(z.boundary) AS boundary,
              u.username AS owner_name, u.avatar_url AS owner_avatar
       FROM zones z
       LEFT JOIN users u ON z.owner_id = u.id
       WHERE z.boundary && ST_MakeEnvelope($1, $2, $3, $4, 4326)
       LIMIT 200`,
            [parseFloat(minLongitude), parseFloat(minLatitude), parseFloat(maxLongitude), parseFloat(maxLatitude)]
        );

        const zones = result.rows.map((row) => ({
            ...row,
            boundary: row.boundary ? JSON.parse(row.boundary) : null,
            is_mine: row.owner_id === req.user.id,
        }));

        res.json({ zones });
    } catch (error) {
        console.error('Error fetching zones in area:', error);
        res.status(500).json({ error: 'Failed to fetch zones' });
    }
};

const getZonesNearby = async (req, res) => {
    try {
        const { latitude, longitude, radiusKm } = req.query;
        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);
        const radius = parseFloat(radiusKm || '5') * 1000;

        if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
            return res.status(400).json({ error: 'Invalid latitude/longitude' });
        }

        const result = await db.query(
            `SELECT z.id, z.h3_index, z.owner_id, z.state, z.best_pace,
              z.total_defenses, z.held_since,
              ST_AsGeoJSON(z.boundary) AS boundary,
              u.username AS owner_name, u.avatar_url AS owner_avatar
       FROM zones z
       LEFT JOIN users u ON z.owner_id = u.id
       WHERE ST_DWithin(z.boundary::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography, $3)
       ORDER BY ST_Distance(z.boundary::geography, ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography)
       LIMIT 50`,
            [lat, lon, radius]
        );

        const zones = result.rows.map((row) => ({
            ...row,
            boundary: row.boundary ? JSON.parse(row.boundary) : null,
            is_mine: row.owner_id === req.user.id,
        }));

        res.json({ zones });
    } catch (error) {
        console.error('Error fetching zones nearby:', error);
        res.status(500).json({ error: 'Failed to fetch zones' });
    }
};

const getZoneDetails = async (req, res) => {
    try {
        const { zoneId } = req.params;

        const result = await db.query(
            `SELECT z.id, z.h3_index, z.owner_id, z.state, z.best_pace,
              z.total_defenses, z.held_since, z.created_at, z.updated_at,
              ST_AsGeoJSON(z.boundary) AS boundary,
              u.username AS owner_name, u.avatar_url AS owner_avatar, u.level, u.xp
       FROM zones z
       LEFT JOIN users u ON z.owner_id = u.id
       WHERE z.id = $1`,
            [zoneId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Zone not found' });
        }

        const zone = result.rows[0];
        zone.boundary = zone.boundary ? JSON.parse(zone.boundary) : null;
        zone.is_mine = zone.owner_id === req.user.id;

        res.json({ zone });
    } catch (error) {
        console.error('Error fetching zone details:', error);
        res.status(500).json({ error: 'Failed to fetch zone' });
    }
};

module.exports = {
    getTerritoriesInArea,
    getTerritoriesNearby,
    getZonesInArea,
    getZonesNearby,
    getZoneDetails,
};
