const { getCurrentMonthUsage, recordUsage } = require('../services/usageService');

async function usageTracker(req, res, next) {
  const usage = await getCurrentMonthUsage(req.apiKey.id);

  if (usage >= req.user.monthlyLimit) {
    return res.status(429).json({
      error: {
        message: 'Monthly usage limit exceeded. Upgrade your plan for more requests.',
        code: 'QUOTA_EXCEEDED',
        used: usage,
        limit: req.user.monthlyLimit,
      },
    });
  }

  // Set usage headers
  res.setHeader('X-RateLimit-Limit', req.user.monthlyLimit);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, req.user.monthlyLimit - usage - 1));

  // Record usage after response is sent
  const startTime = Date.now();
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    recordUsage(req.apiKey.id, req.path, res.statusCode, responseTime);
  });

  next();
}

module.exports = usageTracker;
