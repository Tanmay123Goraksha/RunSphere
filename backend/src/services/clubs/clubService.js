const db = require('../../config/db');

const createClub = async ({ userId, name, description }) => {
    const createdClub = await db.query(
        `INSERT INTO clubs (name, description)
     VALUES ($1, $2)
     RETURNING id, name, description, created_at`,
        [name, description || null]
    );

    const club = createdClub.rows[0];

    await db.query(
        `INSERT INTO club_memberships (club_id, user_id, role)
     VALUES ($1, $2, 'OWNER')
     ON CONFLICT (club_id, user_id) DO NOTHING`,
        [club.id, userId]
    );

    return club;
};

const joinClub = async ({ userId, clubId }) => {
    await db.query(
        `INSERT INTO club_memberships (club_id, user_id, role)
     VALUES ($1, $2, 'MEMBER')
     ON CONFLICT (club_id, user_id) DO NOTHING`,
        [clubId, userId]
    );
};

const leaveClub = async ({ userId, clubId }) => {
    await db.query(
        `DELETE FROM club_memberships
     WHERE club_id = $1 AND user_id = $2`,
        [clubId, userId]
    );
};

const listClubs = async () => {
    const result = await db.query(
        `SELECT c.id, c.name, c.description, c.created_at,
            COALESCE(COUNT(cm.user_id), 0) AS member_count
     FROM clubs c
     LEFT JOIN club_memberships cm ON cm.club_id = c.id
     GROUP BY c.id
     ORDER BY c.created_at DESC`
    );

    return result.rows;
};

const myClubs = async (userId) => {
    const result = await db.query(
        `SELECT c.id, c.name, c.description, c.created_at, cm.role
     FROM club_memberships cm
     JOIN clubs c ON c.id = cm.club_id
     WHERE cm.user_id = $1
     ORDER BY c.created_at DESC`,
        [userId]
    );

    return result.rows;
};

module.exports = {
    createClub,
    joinClub,
    leaveClub,
    listClubs,
    myClubs,
};
