const { Router } = require('express');
const { getDb } = require('../db/connection');
const apiKeyUtil = require('../utils/apiKey');
const jwtAuth = require('../middleware/jwtAuth');

const router = Router();

// All dashboard routes require JWT
router.use(jwtAuth);

// GET /dashboard/account — user info + key prefixes + usage summary
router.get('/account', (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, name, email, tier, monthly_limit, created_at FROM users WHERE id = ?')
    .get(req.jwtUser.id);

  if (!user) {
    return res.status(404).json({ error: { message: 'User not found', code: 'NOT_FOUND' } });
  }

  const keys = db.prepare(
    'SELECT id, key_prefix, name, active, created_at FROM api_keys WHERE user_id = ? ORDER BY created_at DESC'
  ).all(user.id);

  // Usage for active key
  const activeKey = keys.find((k) => k.active);
  let usage = { used: 0, limit: user.monthly_limit, remaining: user.monthly_limit, resetDate: '' };
  if (activeKey) {
    const count = db.prepare(
      "SELECT COUNT(*) as count FROM usage_logs WHERE api_key_id = ? AND created_at >= date('now', 'start of month')"
    ).get(activeKey.id).count;
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

// GET /dashboard/history — recent usage logs
router.get('/history', (req, res) => {
  const db = getDb();

  const activeKey = db.prepare(
    'SELECT id FROM api_keys WHERE user_id = ? AND active = 1'
  ).get(req.jwtUser.id);

  if (!activeKey) {
    return res.json({ logs: [] });
  }

  const logs = db.prepare(
    'SELECT endpoint, status_code, response_time_ms, created_at FROM usage_logs WHERE api_key_id = ? ORDER BY created_at DESC LIMIT 20'
  ).all(activeKey.id);

  res.json({ logs });
});

// POST /dashboard/regenerate-key — deactivate old key, create new one
router.post('/regenerate-key', (req, res) => {
  const db = getDb();

  // Deactivate all existing keys
  db.prepare('UPDATE api_keys SET active = 0 WHERE user_id = ?').run(req.jwtUser.id);

  // Generate new key
  const rawKey = apiKeyUtil.generate();
  const keyHash = apiKeyUtil.hash(rawKey);
  const keyPrefix = apiKeyUtil.getPrefix(rawKey);

  db.prepare(
    'INSERT INTO api_keys (user_id, key_hash, key_prefix) VALUES (?, ?, ?)'
  ).run(req.jwtUser.id, keyHash, keyPrefix);

  res.json({
    message: 'New API key generated. Old key is now deactivated.',
    apiKey: rawKey,
    prefix: keyPrefix,
  });
});

module.exports = router;
