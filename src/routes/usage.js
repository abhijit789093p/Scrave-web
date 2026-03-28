const { Router } = require('express');
const { getUsageSummary } = require('../services/usageService');

const router = Router();

router.get('/usage', async (req, res) => {
  const summary = await getUsageSummary(req.apiKey.id, req.user.monthlyLimit);
  res.json({
    tier: req.user.tier,
    ...summary,
  });
});

module.exports = router;
