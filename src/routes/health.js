const { Router } = require('express');
const { getPool } = require('../db/connection');

const router = Router();

router.get('/health', async (req, res) => {
  let dbOk = false;
  try {
    await getPool().query('SELECT 1');
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

router.get('/stats', async (req, res) => {
  const pool = getPool();

  const { rows: captureRows } = await pool.query(
    "SELECT COUNT(*) as count FROM usage_logs WHERE endpoint IN ('/screenshot', '/pdf')"
  );
  const totalCaptures = parseInt(captureRows[0].count, 10);

  const { rows: avgRows } = await pool.query(
    "SELECT AVG(response_time_ms) as avg FROM usage_logs WHERE endpoint IN ('/screenshot', '/pdf') AND response_time_ms > 0"
  );
  const avgResponseMs = avgRows[0].avg ? Math.round(parseFloat(avgRows[0].avg)) : 0;

  const { rows: userRows } = await pool.query('SELECT COUNT(*) as count FROM users');
  const totalUsers = parseInt(userRows[0].count, 10);

  const uptimeSeconds = Math.floor(process.uptime());

  res.json({ totalCaptures, avgResponseMs, totalUsers, uptimeSeconds });
});

module.exports = router;
