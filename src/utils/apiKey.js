const crypto = require('crypto');

function generate() {
  const random = crypto.randomBytes(24).toString('hex');
  return `sf_live_${random}`;
}

function hash(rawKey) {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

function getPrefix(rawKey) {
  return rawKey.substring(0, 16);
}

module.exports = { generate, hash, getPrefix };
