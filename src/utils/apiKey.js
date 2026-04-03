const crypto = require('crypto');

function generate() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = crypto.randomBytes(40);
  let random = '';
  for (let i = 0; i < 40; i++) {
    random += chars[bytes[i] % chars.length];
  }
  return `sf_live_${random}`;
}

function hash(rawKey) {
  return crypto.createHash('sha256').update(rawKey).digest('hex');
}

function getPrefix(rawKey) {
  return rawKey.substring(0, 16);
}

module.exports = { generate, hash, getPrefix };
