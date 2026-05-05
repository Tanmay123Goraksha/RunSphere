const db = require('../../config/db');

const followUser = async (followerId, followedId) => {
    if (followerId === followedId) {
        throw new Error('Cannot follow yourself');
    }

    await db.query(
        `INSERT INTO follows (follower_id, followed_id)
     VALUES ($1, $2)
     ON CONFLICT (follower_id, followed_id) DO NOTHING`,
        [followerId, followedId]
    );
};

const unfollowUser = async (followerId, followedId) => {
    await db.query(
        `DELETE FROM follows
     WHERE follower_id = $1 AND followed_id = $2`,
        [followerId, followedId]
    );
};

const getFollowers = async (userId) => {
    const result = await db.query(
        `SELECT u.id, u.username, u.avatar_url, u.level, u.xp, f.created_at AS followed_at
     FROM follows f
     JOIN users u ON u.id = f.follower_id
     WHERE f.followed_id = $1
     ORDER BY f.created_at DESC`,
        [userId]
    );
    return result.rows;
};

const getFollowing = async (userId) => {
    const result = await db.query(
        `SELECT u.id, u.username, u.avatar_url, u.level, u.xp, f.created_at AS followed_at
     FROM follows f
     JOIN users u ON u.id = f.followed_id
     WHERE f.follower_id = $1
     ORDER BY f.created_at DESC`,
        [userId]
    );
    return result.rows;
};

// Recent run activities from followed users — the "follow feed"
const getFollowFeed = async (userId, limit = 20) => {
    const result = await db.query(
        `SELECT r.id AS run_id, r.user_id, r.distance_km, r.duration_seconds,
            r.avg_pace, r.started_at, r.ended_at, r.anomaly_flag,
            u.username, u.avatar_url
     FROM runs r
     JOIN follows f ON f.followed_id = r.user_id
     JOIN users u ON u.id = r.user_id
     WHERE f.follower_id = $1
       AND r.ended_at IS NOT NULL
       AND r.is_valid = TRUE
     ORDER BY r.ended_at DESC
     LIMIT $2`,
        [userId, Math.min(50, Math.max(1, limit))]
    );
    return result.rows;
};

module.exports = {
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    getFollowFeed,
};
