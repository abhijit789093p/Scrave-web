const Stripe = require('stripe');
const config = require('../config');
const { getPool } = require('../db/connection');
const logger = require('../utils/logger');

const stripe = config.STRIPE_SECRET_KEY ? new Stripe(config.STRIPE_SECRET_KEY) : null;

const PRICE_TO_TIER = {
  pro: { tier: 'pro', limit: config.TIER_LIMITS.pro },
  business: { tier: 'business', limit: config.TIER_LIMITS.business },
};

async function createCheckoutSession(userId, email, plan) {
  if (!stripe) throw Object.assign(new Error('Stripe not configured'), { status: 503 });

  const tierInfo = PRICE_TO_TIER[plan];
  if (!tierInfo) throw Object.assign(new Error('Invalid plan'), { status: 400 });

  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
  const user = rows[0];

  if (!user.stripe_customer_id) {
    const customer = await stripe.customers.create({ email, metadata: { userId: String(userId) } });
    await pool.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customer.id, userId]);
    user.stripe_customer_id = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: user.stripe_customer_id,
    mode: 'subscription',
    line_items: [{
      price_data: {
        currency: 'usd',
        recurring: { interval: 'month' },
        product_data: {
          name: `Scrave ${plan.charAt(0).toUpperCase() + plan.slice(1)}`,
          description: `${tierInfo.limit.toLocaleString()} requests/month`,
        },
        unit_amount: plan === 'pro' ? 900 : 3900,
      },
      quantity: 1,
    }],
    metadata: { userId: String(userId), plan },
    success_url: `${config.NODE_ENV === 'production' ? 'https' : 'http'}://localhost:${config.PORT}/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.NODE_ENV === 'production' ? 'https' : 'http'}://localhost:${config.PORT}/#pricing`,
  });

  return { url: session.url, sessionId: session.id };
}

async function handleWebhook(rawBody, signature) {
  if (!stripe) return;

  const event = stripe.webhooks.constructEvent(rawBody, signature, config.STRIPE_WEBHOOK_SECRET);
  const pool = getPool();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { userId, plan } = session.metadata;
      const tierInfo = PRICE_TO_TIER[plan];
      if (tierInfo && userId) {
        await pool.query('UPDATE users SET tier = $1, monthly_limit = $2 WHERE id = $3',
          [tierInfo.tier, tierInfo.limit, parseInt(userId)]);
        logger.info(`User ${userId} upgraded to ${plan}`);
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const customerId = sub.customer;
      await pool.query('UPDATE users SET tier = $1, monthly_limit = $2 WHERE stripe_customer_id = $3',
        ['free', config.TIER_LIMITS.free, customerId]);
      logger.info(`Customer ${customerId} downgraded to free`);
      break;
    }
    default:
      break;
  }
}

async function createPortalSession(userId) {
  if (!stripe) throw Object.assign(new Error('Stripe not configured'), { status: 503 });

  const pool = getPool();
  const { rows } = await pool.query('SELECT stripe_customer_id FROM users WHERE id = $1', [userId]);
  if (!rows[0]?.stripe_customer_id) {
    throw Object.assign(new Error('No billing account found'), { status: 404 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: rows[0].stripe_customer_id,
    return_url: `${config.NODE_ENV === 'production' ? 'https' : 'http'}://localhost:${config.PORT}/`,
  });

  return { url: session.url };
}

module.exports = { createCheckoutSession, handleWebhook, createPortalSession };
