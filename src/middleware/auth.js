const { getPool } = require('../db/connection');
const apiKeyUtil = require('../utils/apiKey');

async function authMiddleware(req, res, next) {
  const rawKey = req.headers['x-api-key'];

  if (!rawKey) {
    return res.status(401).json({ error: { message: 'Missing x-api-key header', code: 'UNAUTHORIZED' } });
  }

  const keyHash = apiKeyUtil.hash(rawKey);
  const pool = getPool();

  const { rows } = await pool.query(`
    SELECT ak.id as key_id, ak.user_id, ak.active, u.tier, u.monthly_limit, u.email
    FROM api_keys ak
    JOIN users u ON u.id = ak.user_id
    WHERE ak.key_hash = $1
  `, [keyHash]);

  const keyRow = rows[0];

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
