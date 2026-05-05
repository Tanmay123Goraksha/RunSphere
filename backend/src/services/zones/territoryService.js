const db = require('../../config/db');

/**
 * Create a territory polygon from a run's route by buffering the
 * OSRM-matched path by ~15 meters. This produces a smooth polygon
 * that follows street shapes instead of hexagonal grid cells.
 */
const createTerritoryFromRun = async ({ runId, userId, clubId }) => {
    // ST_Buffer on geography type uses meters as the unit.
    // We buffer the run route by 15m to produce a street-width polygon.
    const result = await db.query(
        `INSERT INTO territories (owner_id, club_id, run_id, boundary, area_sqm, capture_time_seconds)
     SELECT
       $2,
       $3,
       $1,
       ST_Buffer(r.route::geography, 15)::geometry,
       COALESCE(ST_Area(ST_Buffer(r.route::geography, 15)), 0),
       COALESCE(r.duration_seconds, 0)
     FROM runs r
     WHERE r.id = $1
       AND r.route IS NOT NULL
     RETURNING id, ST_AsGeoJSON(boundary) AS boundary_geojson, area_sqm`,
        [runId, userId, clubId || null]
    );

    if (result.rowCount === 0) {
        return null;
    }

    return result.rows[0];
};

/**
 * Fetch territories within a bounding box, merged by owner using ST_Union.
 * This produces smooth colored regions on the map with no internal borders
 * between adjacent territories owned by the same user.
 */
const getMergedTerritoriesInArea = async ({ minLat, maxLat, minLon, maxLon, requestingUserId }) => {
    const result = await db.query(
        `SELECT
       t.owner_id,
       u.username AS owner_name,
       u.avatar_url AS owner_avatar,
       ST_AsGeoJSON(ST_Union(t.boundary)) AS merged_boundary,
       COUNT(*)::integer AS zone_count,
       SUM(t.area_sqm)::numeric AS total_area_sqm,
       MIN(t.captured_at) AS first_captured_at,
       MAX(t.captured_at) AS last_captured_at,
       CASE
         WHEN t.owner_id = $5 THEN 'MY_ZONE'
         WHEN cm_me.club_id IS NOT NULL AND cm_them.club_id = cm_me.club_id THEN 'CLUB_ZONE'
         ELSE 'ENEMY'
       END AS ownership_type
     FROM territories t
     JOIN users u ON u.id = t.owner_id
     LEFT JOIN club_memberships cm_them ON cm_them.user_id = t.owner_id
     LEFT JOIN club_memberships cm_me ON cm_me.user_id = $5
       AND cm_me.club_id = cm_them.club_id
     WHERE t.boundary && ST_MakeEnvelope($1, $2, $3, $4, 4326)
     GROUP BY t.owner_id, u.username, u.avatar_url,
       CASE
         WHEN t.owner_id = $5 THEN 'MY_ZONE'
         WHEN cm_me.club_id IS NOT NULL AND cm_them.club_id = cm_me.club_id THEN 'CLUB_ZONE'
         ELSE 'ENEMY'
       END`,
        [minLon, minLat, maxLon, maxLat, requestingUserId]
    );

    return result.rows.map((row) => ({
        owner_id: row.owner_id,
        owner_name: row.owner_name,
        owner_avatar: row.owner_avatar,
        boundary: row.merged_boundary ? JSON.parse(row.merged_boundary) : null,
        zone_count: row.zone_count,
        total_area_sqm: Number(row.total_area_sqm) || 0,
        first_captured_at: row.first_captured_at,
        last_captured_at: row.last_captured_at,
        ownership_type: row.ownership_type,
        is_mine: row.owner_id === requestingUserId,
    }));
};

/**
 * Fetch territories near a point, merged by owner.
 */
const getMergedTerritoriesNearby = async ({ lat, lon, radiusMeters, requestingUserId }) => {
    const result = await db.query(
        `SELECT
       t.owner_id,
       u.username AS owner_name,
       u.avatar_url AS owner_avatar,
       ST_AsGeoJSON(ST_Union(t.boundary)) AS merged_boundary,
       COUNT(*)::integer AS zone_count,
       SUM(t.area_sqm)::numeric AS total_area_sqm
     FROM territories t
     JOIN users u ON u.id = t.owner_id
     WHERE ST_DWithin(
       t.boundary::geography,
       ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
       $3
     )
     GROUP BY t.owner_id, u.username, u.avatar_url`,
        [lat, lon, radiusMeters, requestingUserId]
    );

    return result.rows.map((row) => ({
        owner_id: row.owner_id,
        owner_name: row.owner_name,
        owner_avatar: row.owner_avatar,
        boundary: row.merged_boundary ? JSON.parse(row.merged_boundary) : null,
        zone_count: row.zone_count,
        total_area_sqm: Number(row.total_area_sqm) || 0,
        is_mine: row.owner_id === requestingUserId,
    }));
};

module.exports = {
    createTerritoryFromRun,
    getMergedTerritoriesInArea,
    getMergedTerritoriesNearby,
};
