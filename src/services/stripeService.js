const Stripe = require('stripe');
const config = require('../config');
const { getDb } = require('../db/connection');
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

  const db = getDb();
  let user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

  // Create Stripe customer if needed
  if (!user.stripe_customer_id) {
    const customer = await stripe.customers.create({ email, metadata: { userId: String(userId) } });
    db.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').run(customer.id, userId);
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
    success_url: `http://localhost:${config.PORT}/?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `http://localhost:${config.PORT}/#pricing`,
  });

  return { url: session.url, sessionId: session.id };
}

async function handleWebhook(rawBody, signature) {
  if (!stripe) return;

  const event = stripe.webhooks.constructEvent(rawBody, signature, config.STRIPE_WEBHOOK_SECRET);
  const db = getDb();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { userId, plan } = session.metadata;
      const tierInfo = PRICE_TO_TIER[plan];
      if (tierInfo && userId) {
        db.prepare('UPDATE users SET tier = ?, monthly_limit = ? WHERE id = ?')
          .run(tierInfo.tier, tierInfo.limit, parseInt(userId));
        logger.info(`User ${userId} upgraded to ${plan}`);
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      const customerId = sub.customer;
      db.prepare('UPDATE users SET tier = ?, monthly_limit = ? WHERE stripe_customer_id = ?')
        .run('free', config.TIER_LIMITS.free, customerId);
      logger.info(`Customer ${customerId} downgraded to free`);
      break;
    }
    default:
      break;
  }
}

async function createPortalSession(userId) {
  if (!stripe) throw Object.assign(new Error('Stripe not configured'), { status: 503 });

  const db = getDb();
  const user = db.prepare('SELECT stripe_customer_id FROM users WHERE id = ?').get(userId);
  if (!user?.stripe_customer_id) {
    throw Object.assign(new Error('No billing account found'), { status: 404 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `http://localhost:${config.PORT}/`,
  });

  return { url: session.url };
}

module.exports = { createCheckoutSession, handleWebhook, createPortalSession };
