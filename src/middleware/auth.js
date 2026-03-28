const { getDb } = require('../db/connection');
const apiKeyUtil = require('../utils/apiKey');

function authMiddleware(req, res, next) {
  const rawKey = req.headers['x-api-key'];

  if (!rawKey) {
    return res.status(401).json({ error: { message: 'Missing x-api-key header', code: 'UNAUTHORIZED' } });
  }

  const keyHash = apiKeyUtil.hash(rawKey);
  const db = getDb();

  const keyRow = db.prepare(`
    SELECT ak.id as key_id, ak.user_id, ak.active, u.tier, u.monthly_limit, u.email
    FROM api_keys ak
    JOIN users u ON u.id = ak.user_id
    WHERE ak.key_hash = ?
  `).get(keyHash);

  if (!keyRow || !keyRow.active) {
    return res.status(401).json({ error: { message: 'Invalid or inactive API key', code: 'UNAUTHORIZED' } });
  }

  req.apiKey = { id: keyRow.key_id };
  req.user = {
    id: keyRow.user_id,
    email: keyRow.email,
    tier: keyRow.tier,
    monthlyLimit: keyRow.monthly_limit,
  };

  next();
}

module.exports = authMiddleware;
