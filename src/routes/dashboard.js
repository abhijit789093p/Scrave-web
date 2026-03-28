const { Router } = require('express');
const { getPool } = require('../db/connection');
const apiKeyUtil = require('../utils/apiKey');
const jwtAuth = require('../middleware/jwtAuth');

const router = Router();

// All dashboard routes require JWT
router.use(jwtAuth);

// GET /dashboard/account
router.get('/account', async (req, res) => {
  const pool = getPool();

  const { rows: userRows } = await pool.query(
    'SELECT id, name, email, tier, monthly_limit, created_at FROM users WHERE id = $1',
    [req.jwtUser.id]
  );
  const user = userRows[0];

  if (!user) {
    return res.status(404).json({ error: { message: 'User not found', code: 'NOT_FOUND' } });
  }

  const { rows: keys } = await pool.query(
    'SELECT id, key_prefix, name, active, created_at FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC',
    [user.id]
  );

  const activeKey = keys.find((k) => k.active);
  let usage = { used: 0, limit: user.monthly_limit, remaining: user.monthly_limit, resetDate: '' };
  if (activeKey) {
    const { rows: countRows } = await pool.query(
      "SELECT COUNT(*) as count FROM usage_logs WHERE api_key_id = $1 AND created_at >= date_trunc('month', now())",
      [activeKey.id]
    );
    const count = parseInt(countRows[0].count, 10);
    const now = new Date();
    const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0];
    usage = { used: count, limit: user.monthly_limit, remaining: Math.max(0, user.monthly_limit - count), resetDate };
  }

  res.json({
    user: { id: user.id, name: user.name || '', email: user.email, tier: user.tier, createdAt: user.created_at },
    keys: keys.map((k) => ({ id: k.id, prefix: k.key_prefix, name: k.name, active: !!k.active, createdAt: k.created_at })),
    usage,
  });
});

// GET /dashboard/history
router.get('/history', async (req, res) => {
  const pool = getPool();

  const { rows: keyRows } = await pool.query(
    'SELECT id FROM api_keys WHERE user_id = $1 AND active = 1',
    [req.jwtUser.id]
  );

  if (!keyRows.length) {
    return res.json({ logs: [] });
  }

  const { rows: logs } = await pool.query(
    'SELECT endpoint, status_code, response_time_ms, created_at FROM usage_logs WHERE api_key_id = $1 ORDER BY created_at DESC LIMIT 20',
    [keyRows[0].id]
  );

  res.json({ logs });
});

// POST /dashboard/regenerate-key
router.post('/regenerate-key', async (req, res) => {
  const pool = getPool();

  await pool.query('UPDATE api_keys SET active = 0 WHERE user_id = $1', [req.jwtUser.id]);

  const rawKey = apiKeyUtil.generate();
  const keyHash = apiKeyUtil.hash(rawKey);
  const keyPrefix = apiKeyUtil.getPrefix(rawKey);

  await pool.query(
    'INSERT INTO api_keys (user_id, key_hash, key_prefix) VALUES ($1, $2, $3)',
    [req.jwtUser.id, keyHash, keyPrefix]
  );

  res.json({
    message: 'New API key generated. Old key is now deactivated.',
    apiKey: rawKey,
    prefix: keyPrefix,
  });
});

module.exports = router;
