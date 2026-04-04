const { Queue, QueueEvents } = require('bullmq');
const config = require('../config');
const { memoryScreenshotQueue, memoryPdfQueue } = require('./memoryQueue');

const isRedisMode = config.QUEUE_MODE === 'redis';
const connection = { url: config.REDIS_URL || 'redis://localhost:6379' };

// BullMQ specific instantiation (only used if isRedisMode)
let screenshotQueue, screenshotEvents;
let pdfQueue, pdfEvents;

if (isRedisMode) {
  screenshotQueue = new Queue('screenshotQueue', { connection });
  screenshotEvents = new QueueEvents('screenshotQueue', { connection });

  pdfQueue = new Queue('pdfQueue', { connection });
  pdfEvents = new QueueEvents('pdfQueue', { connection });
}

// Wrap BullMQ job so waitUntilFinished() works without passing events from routes
function wrapJob(job, events) {
  const originalWait = job.waitUntilFinished.bind(job);
  job.waitUntilFinished = () => originalWait(events);
  return job;
}

async function addScreenshotJob(options, tierInfo) {
  const jobOptions = {
    removeOnComplete: true, removeOnFail: true, timeout: 60000,
    priority: tierInfo?.priority || 3,
    tier: tierInfo?.tier || 'free',
    tierConcurrency: tierInfo?.tierConcurrency || 2,
  };

  if (isRedisMode) {
    const job = await screenshotQueue.add('capture', options, { ...jobOptions, priority: jobOptions.priority });
    return wrapJob(job, screenshotEvents);
  } else {
    return await memoryScreenshotQueue.add('capture', options, jobOptions);
  }
}

async function addPdfJob(options, tierInfo) {
  const jobOptions = {
    removeOnComplete: true, removeOnFail: true, timeout: 60000,
    priority: tierInfo?.priority || 3,
    tier: tierInfo?.tier || 'free',
    tierConcurrency: tierInfo?.tierConcurrency || 2,
  };

  if (isRedisMode) {
    const job = await pdfQueue.add('capture', options, { ...jobOptions, priority: jobOptions.priority });
    return wrapJob(job, pdfEvents);
  } else {
    return await memoryPdfQueue.add('capture', options, jobOptions);
  }
}

module.exports = { addScreenshotJob, addPdfJob, connection };
