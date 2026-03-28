const { Router } = require('express');
const { getDb } = require('../db/connection');

const router = Router();

router.get('/health', (req, res) => {
  let dbOk = false;
  try {
    getDb().prepare('SELECT 1').get();
    dbOk = true;
  } catch { /* db not ready */ }

  res.json({
    status: 'ok',
    service: 'Scrave API',
    version: '1.0.0',
    db: dbOk,
    uptime: Math.floor(process.uptime()),
  });
});

router.get('/stats', (req, res) => {
  const db = getDb();

  // Total captures served
  const totalCaptures = db.prepare(
    "SELECT COUNT(*) as count FROM usage_logs WHERE endpoint IN ('/screenshot', '/pdf')"
  ).get().count;

  // Average response time (ms)
  const avgRow = db.prepare(
    "SELECT AVG(response_time_ms) as avg FROM usage_logs WHERE endpoint IN ('/screenshot', '/pdf') AND response_time_ms > 0"
  ).get();
  const avgResponseMs = avgRow.avg ? Math.round(avgRow.avg) : 0;

  // Total registered users
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

  // Server uptime in seconds
  const uptimeSeconds = Math.floor(process.uptime());

  res.json({
    totalCaptures,
    avgResponseMs,
    totalUsers,
    uptimeSeconds,
  });
});

module.exports = router;
