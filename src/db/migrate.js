const fs = require('fs');
const path = require('path');
const { getPool } = require('./connection');
const logger = require('../utils/logger');

async function migrate() {
  const pool = getPool();
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  await pool.query(schema);
  logger.info('Database migration complete');
}

module.exports = { migrate };
