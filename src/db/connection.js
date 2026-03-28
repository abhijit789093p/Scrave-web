const { Pool } = require('pg');
const config = require('../config');

const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: config.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

function getPool() {
  return pool;
}

async function closeDb() {
  await pool.end();
}

module.exports = { getPool, closeDb };
