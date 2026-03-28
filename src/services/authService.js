const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/connection');
const apiKeyUtil = require('../utils/apiKey');
const config = require('../config');

const SALT_ROUNDS = 10;

async function register(name, email, password) {
  const db = getDb();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    throw Object.assign(new Error('Email already registered'), { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  const result = db.prepare(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
  ).run(name, email, passwordHash);

  const userId = result.lastInsertRowid;

  // Generate API key
  const rawKey = apiKeyUtil.generate();
  const keyHash = apiKeyUtil.hash(rawKey);
  const keyPrefix = apiKeyUtil.getPrefix(rawKey);

  db.prepare(
    'INSERT INTO api_keys (user_id, key_hash, key_prefix) VALUES (?, ?, ?)'
  ).run(userId, keyHash, keyPrefix);

  return { userId, apiKey: rawKey, name, email };
}

async function login(email, password) {
  const db = getDb();

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
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

  // Also return API keys
  const keys = db.prepare(
    'SELECT key_prefix, name, active, created_at FROM api_keys WHERE user_id = ? AND active = 1'
  ).all(user.id);

  return { token, user: { id: user.id, name: user.name || '', email: user.email, tier: user.tier }, keys };
}

module.exports = { register, login };
