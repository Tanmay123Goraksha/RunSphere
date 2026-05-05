const db = require('../../config/db');

const createChallenge = async ({ fromUserId, toUserId, zoneH3Index, message }) => {
    const result = await db.query(
        `INSERT INTO challenges (from_user_id, to_user_id, zone_h3_index, status, message)
     VALUES ($1, $2, $3, 'PENDING', $4)
     RETURNING *`,
        [fromUserId, toUserId, zoneH3Index, message || null]
    );
    return result.rows[0];
};

const respondToChallenge = async ({ challengeId, userId, accepted }) => {
    const result = await db.query(
        `UPDATE challenges
     SET status = $3, responded_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND to_user_id = $2 AND status = 'PENDING'
     RETURNING *`,
        [challengeId, userId, accepted ? 'ACCEPTED' : 'DECLINED']
    );

    if (result.rowCount === 0) {
        throw new Error('Challenge not found or already responded to');
    }

    return result.rows[0];
};

const getChallengesForUser = async (userId, status = null) => {
    let queryText = `
    SELECT c.*, 
           fu.username AS from_username, fu.avatar_url AS from_avatar,
           tu.username AS to_username, tu.avatar_url AS to_avatar
    FROM challenges c
    JOIN users fu ON fu.id = c.from_user_id
    JOIN users tu ON tu.id = c.to_user_id
    WHERE (c.from_user_id = $1 OR c.to_user_id = $1)`;

    const params = [userId];

    if (status) {
        queryText += ` AND c.status = $2`;
        params.push(status);
    }

    queryText += ` ORDER BY c.created_at DESC LIMIT 50`;

    const result = await db.query(queryText, params);
    return result.rows;
};

module.exports = {
    createChallenge,
    respondToChallenge,
    getChallengesForUser,
};
