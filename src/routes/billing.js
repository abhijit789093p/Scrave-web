const { Router } = require('express');
const express = require('express');
const stripeService = require('../services/stripeService');
const authMiddleware = require('../middleware/auth');

const router = Router();

// Stripe webhook (needs raw body — must be before json parser)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    const signature = req.headers['stripe-signature'];
    await stripeService.handleWebhook(req.body, signature);
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

// Create checkout session (authenticated)
router.post('/checkout', authMiddleware, async (req, res, next) => {
  try {
    const { plan } = req.body;
    if (!plan || !['pro', 'business'].includes(plan)) {
      return res.status(400).json({ error: { message: 'Plan must be "pro" or "business"', code: 'VALIDATION_ERROR' } });
    }
    const result = await stripeService.createCheckoutSession(req.user.id, req.user.email, plan);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Customer portal (authenticated)
router.post('/portal', authMiddleware, async (req, res, next) => {
  try {
    const result = await stripeService.createPortalSession(req.user.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
