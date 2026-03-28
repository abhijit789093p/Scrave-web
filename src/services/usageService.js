const { getDb } = require('../db/connection');

function getCurrentMonthUsage(apiKeyId) {
  const db = getDb();
  const row = db.prepare(`
    SELECT COUNT(*) as count FROM usage_logs
    WHERE api_key_id = ?
    AND created_at >= date('now', 'start of month')
  `).get(apiKeyId);
  return row.count;
}

function recordUsage(apiKeyId, endpoint, statusCode, responseTimeMs) {
  const db = getDb();
  db.prepare(`
    INSERT INTO usage_logs (api_key_id, endpoint, status_code, response_time_ms)
    VALUES (?, ?, ?, ?)
  `).run(apiKeyId, endpoint, statusCode, responseTimeMs);
}

function getUsageSummary(apiKeyId, monthlyLimit) {
  const used = getCurrentMonthUsage(apiKeyId);
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
