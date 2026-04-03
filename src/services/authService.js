const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { getPool } = require('../db/connection');
const apiKeyUtil = require('../utils/apiKey');
const config = require('../config');
const { sendVerificationEmail, sendPasswordResetEmail } = require('./emailService');

const SALT_ROUNDS = 10;

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

async function register(name, email, password) {
  const pool = getPool();

  const { rows: existing } = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.length) {
    throw Object.assign(new Error('Email already registered'), { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const verifyToken = generateToken();

  const { rows } = await pool.query(
    'INSERT INTO users (name, email, password_hash, verify_token) VALUES ($1, $2, $3, $4) RETURNING id',
    [name, email, passwordHash, verifyToken]
  );

  const userId = rows[0].id;

  // Send verification email (non-blocking — don't fail registration if email fails)
  sendVerificationEmail(email, name, verifyToken).catch((err) => {
    console.error('Failed to send verification email:', err.message);
  });

  return { userId, name, email };
}

async function verifyEmail(token) {
  const pool = getPool();

  const { rows } = await pool.query(
    'SELECT id, email_verified FROM users WHERE verify_token = $1',
    [token]
  );

  if (!rows.length) {
    throw Object.assign(new Error('Invalid verification token'), { status: 400 });
  }

  if (rows[0].email_verified) {
    return { message: 'Email already verified' };
  }

  await pool.query(
    'UPDATE users SET email_verified = TRUE, verify_token = NULL WHERE id = $1',
    [rows[0].id]
  );

  return { message: 'Email verified successfully' };
}

async function login(email, password) {
  const pool = getPool();

  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  if (!user) {
    throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  }

  // Check if account is locked
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
    throw Object.assign(
      new Error(`Account locked. Try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`),
      { status: 423 }
    );
  }

  const valid = await bcrypt.compare(password, user.password_hash);

  if (!valid) {
    // Increment failed attempts
    const attempts = (user.login_attempts || 0) + 1;

    if (attempts >= config.MAX_LOGIN_ATTEMPTS) {
      // Lock the account
      const lockUntil = new Date(Date.now() + config.LOCKOUT_MINUTES * 60000);
      await pool.query(
        'UPDATE users SET login_attempts = $1, locked_until = $2 WHERE id = $3',
        [attempts, lockUntil, user.id]
      );
      throw Object.assign(
        new Error(`Too many failed attempts. Account locked for ${config.LOCKOUT_MINUTES} minutes.`),
        { status: 423 }
      );
    } else {
      await pool.query(
        'UPDATE users SET login_attempts = $1 WHERE id = $2',
        [attempts, user.id]
      );
      throw Object.assign(new Error('Invalid credentials'), { status: 401 });
    }
  }

  // Successful login — reset attempts and lock
  await pool.query(
    'UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = $1',
    [user.id]
  );

  const token = jwt.sign({ userId: user.id, email: user.email, name: user.name || '' }, config.JWT_SECRET, {
    expiresIn: '30d',
  });

  const { rows: keys } = await pool.query(
    'SELECT key_prefix, name, active, created_at FROM api_keys WHERE user_id = $1 AND active = 1',
    [user.id]
  );

  return {
    token,
    user: { id: user.id, name: user.name || '', email: user.email, tier: user.tier, emailVerified: user.email_verified },
    keys,
  };
}

async function requestPasswordReset(email) {
  const pool = getPool();

  const { rows } = await pool.query('SELECT id, name FROM users WHERE email = $1', [email]);
  if (!rows.length) {
    // Don't reveal if email exists — always return success
    return { message: 'If that email exists, a reset link has been sent.' };
  }

  const resetToken = generateToken();
  const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await pool.query(
    'UPDATE users SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
    [resetToken, expires, rows[0].id]
  );

  sendPasswordResetEmail(email, rows[0].name, resetToken).catch((err) => {
    console.error('Failed to send reset email:', err.message);
  });

  return { message: 'If that email exists, a reset link has been sent.' };
}

async function resetPassword(token, newPassword) {
  const pool = getPool();

  const { rows } = await pool.query(
    'SELECT id FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
    [token]
  );

  if (!rows.length) {
    throw Object.assign(new Error('Invalid or expired reset token'), { status: 400 });
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await pool.query(
    'UPDATE users SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL, login_attempts = 0, locked_until = NULL WHERE id = $2',
    [passwordHash, rows[0].id]
  );

  return { message: 'Password reset successfully. You can now login.' };
}

module.exports = { register, verifyEmail, login, requestPasswordReset, resetPassword };
