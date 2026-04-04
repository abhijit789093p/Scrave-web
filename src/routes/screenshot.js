const { Router } = require('express');
const { screenshotSchema } = require('../utils/validate');
const { addScreenshotJob } = require('../services/queue');
const config = require('../config');

const router = Router();

router.post('/screenshot', async (req, res, next) => {
  try {
    const parsed = screenshotSchema.parse(req.body);

    const tier = req.user?.tier || 'free';
    const tierInfo = {
      tier,
      priority: config.TIER_PRIORITY[tier] || 3,
      tierConcurrency: config.TIER_CONCURRENCY[tier] || 2,
    };

    // Add job to queue with priority
    const job = await addScreenshotJob(parsed, tierInfo);

    // Wait for the worker to finish
    const resultBase64 = await job.waitUntilFinished().catch(err => {
      throw new Error('Screenshot generation failed: ' + err.message);
    });

    const buffer = Buffer.from(resultBase64, 'base64');

    const contentType = parsed.format === 'jpeg' ? 'image/jpeg' : 'image/png';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (err) {
    if (err.name === 'ZodError') {
      return res.status(400).json({
        error: { message: 'Validation error', code: 'VALIDATION_ERROR', details: err.errors },
      });
    }
    next(err);
  }
});

module.exports = router;
