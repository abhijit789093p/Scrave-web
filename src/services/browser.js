const { chromium } = require('playwright');
const logger = require('../utils/logger');

let browser = null;
let launching = false;

async function launchBrowser() {
  if (launching) return;
  launching = true;
  try {
    browser = await chromium.launch({
      args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    });
    browser.on('disconnected', () => {
      logger.warn('Browser disconnected — will relaunch on next request');
      browser = null;
    });
    logger.info('Playwright browser launched');
  } finally {
    launching = false;
  }
}

async function getBrowser() {
  if (!browser) {
    await launchBrowser();
  }
  return browser;
}

async function closeBrowser() {
  if (browser) {
    await browser.close();
    browser = null;
    logger.info('Browser closed');
  }
}

module.exports = { getBrowser, closeBrowser };
