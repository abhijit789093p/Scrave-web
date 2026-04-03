const fs = require('fs');
const path = require('path');
const { getPool } = require('./connection');
const logger = require('../utils/logger');

async function migrate() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  await pool.query(schema);

  // Add new columns if missing (safe for existing DBs)
  const addColumns = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_token TEXT",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token TEXT",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMPTZ",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS login_attempts INTEGER NOT NULL DEFAULT 0",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ",
  ];

  for (const sql of addColumns) {
    try { await pool.query(sql); } catch { /* column already exists */ }
  }

  logger.info('Database migration complete');
}

module.exports = { migrate };
