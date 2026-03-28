const fs = require('fs');
const path = require('path');
const { getDb } = require('./connection');
const logger = require('../utils/logger');

function migrate() {
  const db = getDb();
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  db.exec(schema);

  // Add name column if missing (existing DBs)
  try {
    db.exec("ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT ''");
  } catch { /* column already exists */ }

  logger.info('Database migration complete');
}

module.exports = { migrate };
