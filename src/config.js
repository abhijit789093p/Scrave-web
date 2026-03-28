require('dotenv').config();

const config = Object.freeze({
  PORT: parseInt(process.env.PORT, 10) || 3000,
  DATABASE_PATH: process.env.DATABASE_PATH || './data/scrave.db',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  QUEUE_MODE: process.env.QUEUE_MODE || 'memory',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  FREE_TIER_LIMIT: parseInt(process.env.FREE_TIER_LIMIT, 10) || 100,
  PRO_TIER_LIMIT: parseInt(process.env.PRO_TIER_LIMIT, 10) || 5000,
  BUSINESS_TIER_LIMIT: parseInt(process.env.BUSINESS_TIER_LIMIT, 10) || 50000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  TIER_LIMITS: {
    free: parseInt(process.env.FREE_TIER_LIMIT, 10) || 100,
    pro: parseInt(process.env.PRO_TIER_LIMIT, 10) || 5000,
    business: parseInt(process.env.BUSINESS_TIER_LIMIT, 10) || 50000,
  },
});

module.exports = config;
