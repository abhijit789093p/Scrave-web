const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getPool } = require('../db/connection');
const apiKeyUtil = require('../utils/apiKey');
const config = require('../config');

const SALT_ROUNDS = 10;

async function register(name, email, password) {
  const pool = getPool();

  const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.length) {
    throw Object.assign(new Error('Email already registered'), { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const { rows } = await pool.query(
    'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
    [name, email, passwordHash]
  );

  const userId = rows[0].id;

  return { userId, name, email };
}

async function login(email, password) {
  const pool = getPool();

  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  if (!user) {
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }

  const token = jwt.sign({ userId: user.id, email: user.email, name: user.name || '' }, config.JWT_SECRET, {
    expiresIn: '30d',
  });

  const { rows: keys } = await pool.query(
    'SELECT key_prefix, name, active, created_at FROM api_keys WHERE user_id = $1 AND active = 1',
    [user.id]
  );

  return { token, user: { id: user.id, name: user.name || '', email: user.email, tier: user.tier }, keys };
}

module.exports = { register, login };
