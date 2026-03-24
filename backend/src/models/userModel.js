const db = require('../config/db');

const createUser = async (username, email, passwordHash) => {
  // We only insert the required fields; id, level, xp, and created_at will use defaults
  const result = await db.query(
    `INSERT INTO users (username, email, password_hash) 
     VALUES ($1, $2, $3) 
     RETURNING id, username, email, level, xp`,
    [username, email, passwordHash]
  );
  return result.rows[0];
};

const getUserByEmail = async (email) => {
  const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
};

const getUserById = async (id) => {
  const result = await db.query('SELECT id, username, email, avatar_url, bio, level, xp FROM users WHERE id = $1', [id]);
  return result.rows[0];
};

module.exports = { createUser, getUserByEmail, getUserById };