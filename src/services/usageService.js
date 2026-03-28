const { getPool } = require('../db/connection');

async function getCurrentMonthUsage(apiKeyId) {
  const pool = getPool();
  const { rows } = await pool.query(
    "SELECT COUNT(*) as count FROM usage_logs WHERE api_key_id = $1 AND created_at >= date_trunc('month', now())",
    [apiKeyId]
  );
  return parseInt(rows[0].count, 10);
}

async function recordUsage(apiKeyId, endpoint, statusCode, responseTimeMs) {
  const pool = getPool();
  await pool.query(
    'INSERT INTO usage_logs (api_key_id, endpoint, status_code, response_time_ms) VALUES ($1, $2, $3, $4)',
    [apiKeyId, endpoint, statusCode, responseTimeMs]
  );
}

async function getUsageSummary(apiKeyId, monthlyLimit) {
  const used = await getCurrentMonthUsage(apiKeyId);
  return {
    used,
    limit: monthlyLimit,
    remaining: Math.max(0, monthlyLimit - used),
    resetDate: getNextResetDate(),
  };
}

function getNextResetDate() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return next.toISOString().split('T')[0];
}

module.exports = { getCurrentMonthUsage, recordUsage, getUsageSummary };
