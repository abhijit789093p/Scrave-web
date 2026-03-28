const { Router } = require('express');
const { pdfSchema } = require('../utils/validate');
const { addPdfJob } = require('../services/queue');

const router = Router();

router.post('/pdf', async (req, res, next) => {
  try {
    const parsed = pdfSchema.parse(req.body);

    const job = await addPdfJob(parsed);

    const resultBase64 = await job.waitUntilFinished().catch(err => {
      throw new Error('PDF generation failed: ' + err.message);
    });

    const buffer = Buffer.from(resultBase64, 'base64');

    res.setHeader('Content-Type', 'application/pdf');
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
