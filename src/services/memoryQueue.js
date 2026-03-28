const { EventEmitter } = require('events');
const logger = require('../utils/logger');
const screenshotService = require('./screenshotService');
const pdfService = require('./pdfService');

class MemoryQueue extends EventEmitter {
  constructor(name, processFn) {
    super();
    this.name = name;
    this.processFn = processFn;
    this.queue = [];
    this.active = 0;
    this.concurrency = 5;
    this.jobCounter = 0;
    this.status = 'active'; // can be stopped during shutdown
  }

  async add(name, data, options = {}) {
    this.jobCounter++;
    const job = { id: `${this.name}-${this.jobCounter}`, data, options };
    this.queue.push(job);
    logger.info(`[MemoryQueue] Added job ${job.id}`);
    
    // Start processing asynchronously without awaiting
    setImmediate(() => this.processNext());
    
    // Return a mock job object mimicking BullMQ's .waitUntilFinished
    return {
      id: job.id,
      waitUntilFinished: () => this.waitForJob(job.id, options.timeout || 60000)
    };
  }

  async processNext() {
    if (this.active >= this.concurrency || this.queue.length === 0 || this.status === 'stopped') {
      return;
    }
    
    this.active++;
    const job = this.queue.shift();
    
    try {
      logger.info(`[MemoryQueue] Processing job ${job.id}`);
      
      const timeoutMs = job.options.timeout || 60000;
      let timeoutHandle;
      
      const timeoutPromise = new Promise((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error(`Job ${job.id} timed out after ${timeoutMs}ms`)), timeoutMs);
      });
      
      // Prevent unhandled promise rejections on successful resolution
      timeoutPromise.catch(() => {});
      
      const resultBuffer = await Promise.race([
        this.processFn(job.data),
        timeoutPromise
      ]);
      
      clearTimeout(timeoutHandle);
      
      // BullMQ queues pass around base64 strings so we do the same
      const resultBase64 = resultBuffer.toString('base64');
      this.emit(`completed:${job.id}`, resultBase64);
    } catch (err) {
      logger.error(`[MemoryQueue] Job ${job.id} failed:`, err);
      this.emit(`failed:${job.id}`, err);
    } finally {
      this.active--;
      // Try processing the next one
      setImmediate(() => this.processNext());
    }
  }

  waitForJob(jobId, timeoutMs) {
    return new Promise((resolve, reject) => {
      const fallbackTimeout = setTimeout(() => {
        reject(new Error(`Job ${jobId} timed out waiting in memory queue`));
      }, timeoutMs + 30000); // 30s buffer for queue wait time

      this.once(`completed:${jobId}`, (result) => {
        clearTimeout(fallbackTimeout);
        resolve(result);
      });
      
      this.once(`failed:${jobId}`, (err) => {
        clearTimeout(fallbackTimeout);
        reject(err);
      });
    });
  }
}

const memoryScreenshotQueue = new MemoryQueue('screenshotQueue', screenshotService.capture);
const memoryPdfQueue = new MemoryQueue('pdfQueue', pdfService.capture);

module.exports = {
  memoryScreenshotQueue,
  memoryPdfQueue
};
