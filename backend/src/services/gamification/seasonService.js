const db = require('../../config/db');

const getActiveSeason = async () => {
    const result = await db.query(
        `SELECT * FROM seasons WHERE is_active = TRUE LIMIT 1`
    );
    return result.rows[0] || null;
};

const createSeason = async ({ seasonNumber, name, startDate, endDate }) => {
    // Deactivate any currently active season
    await db.query(`UPDATE seasons SET is_active = FALSE WHERE is_active = TRUE`);

    const result = await db.query(
        `INSERT INTO seasons (season_number, name, start_date, end_date, is_active)
     VALUES ($1, $2, $3, $4, TRUE)
     RETURNING *`,
        [seasonNumber, name || `Season ${seasonNumber}`, startDate, endDate]
    );
    return result.rows[0];
};

const endSeason = async (seasonId) => {
    await db.query(
        `UPDATE seasons SET is_active = FALSE WHERE id = $1`,
        [seasonId]
    );
};

const getAllSeasons = async () => {
    const result = await db.query(
        `SELECT * FROM seasons ORDER BY season_number DESC`
    );
    return result.rows;
};

module.exports = {
    getActiveSeason,
    createSeason,
    endSeason,
    getAllSeasons,
};
