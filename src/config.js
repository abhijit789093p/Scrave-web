require('dotenv').config();

const config = Object.freeze({
  PORT: parseInt(process.env.PORT, 10) || 3000,
  DATABASE_URL: process.env.DATABASE_URL || '',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  QUEUE_MODE: process.env.QUEUE_MODE || 'memory',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret',
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  APP_URL: process.env.APP_URL || 'http://localhost:3000',
  FROM_EMAIL: process.env.FROM_EMAIL || 'noreply@scrave.dev',
  FREE_TIER_LIMIT: parseInt(process.env.FREE_TIER_LIMIT, 10) || 100,
  PRO_TIER_LIMIT: parseInt(process.env.PRO_TIER_LIMIT, 10) || 5000,
  BUSINESS_TIER_LIMIT: parseInt(process.env.BUSINESS_TIER_LIMIT, 10) || 50000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  TIER_LIMITS: {
    free: parseInt(process.env.FREE_TIER_LIMIT, 10) || 100,
    pro: parseInt(process.env.PRO_TIER_LIMIT, 10) || 5000,
    business: parseInt(process.env.BUSINESS_TIER_LIMIT, 10) || 50000,
  },
  TIER_CONCURRENCY: {
    free: parseInt(process.env.FREE_CONCURRENCY, 10) || 1,
    pro: parseInt(process.env.PRO_CONCURRENCY, 10) || 5,
    business: parseInt(process.env.BUSINESS_CONCURRENCY, 10) || 15,
  },
  TIER_PRIORITY: {
    free: 3,
    pro: 2,
    business: 1,
  },
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || 'support@scrave.dev',
  KEEP_ALIVE_INTERVAL: parseInt(process.env.KEEP_ALIVE_INTERVAL, 10) || 600000,
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_MINUTES: 15,
});

module.exports = config;
