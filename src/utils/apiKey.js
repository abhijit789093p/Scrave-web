const crypto = require('crypto');
const config = require('../config');

const ALGO = 'aes-256-gcm';

function getEncryptionKey() {
  return crypto.createHash('sha256').update(config.JWT_SECRET).digest();
}

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

function encrypt(plainText) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return iv.toString('hex') + ':' + authTag + ':' + encrypted;
}

function decrypt(encryptedText) {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, data] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { generate, hash, getPrefix, encrypt, decrypt };
