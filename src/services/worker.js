const { Worker } = require('bullmq');
const { connection } = require('./queue');
const screenshotService = require('./screenshotService');
const pdfService = require('./pdfService');
const logger = require('../utils/logger');
const { getBrowser } = require('./browser');
const config = require('../config');

function startWorker() {
  // Pre-warm the Playwright instance
  getBrowser().catch(err => logger.error('Failed to pre-warm browser:', err));

  if (config.QUEUE_MODE !== 'redis') {
    logger.info('Running in Memory queue mode. BullMQ workers disabled.');
    return;
  }

  logger.info('Initializing BullMQ workers with concurrency: 5');

  const screenshotWorker = new Worker('screenshotQueue', async (job) => {
    logger.info(`Processing screenshot job ${job.id} for ${job.data.url}`);
    const buffer = await screenshotService.capture(job.data);
    return buffer.toString('base64');
  }, { connection, concurrency: 5 });

  const pdfWorker = new Worker('pdfQueue', async (job) => {
    logger.info(`Processing pdf job ${job.id} for ${job.data.url}`);
    const buffer = await pdfService.capture(job.data);
    return buffer.toString('base64');
  }, { connection, concurrency: 5 });

  screenshotWorker.on('completed', (job) => logger.info(`Screenshot job ${job.id} completed`));
  screenshotWorker.on('failed', (job, err) => logger.error(`Screenshot job ${job.id} failed:`, err));

  pdfWorker.on('completed', (job) => logger.info(`PDF job ${job.id} completed`));
  pdfWorker.on('failed', (job, err) => logger.error(`PDF job ${job.id} failed:`, err));
}

module.exports = { startWorker };
