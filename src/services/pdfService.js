const { getBrowser } = require('./browser');

async function capture(options) {
  let context;
  try {
    const browser = await getBrowser();
    context = await browser.newContext({
      acceptDownloads: false // Security: prevent clickSelector from triggering downloads
    });
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(30000);

    await page.goto(options.url, { waitUntil: 'networkidle' });

    if (options.injectCss) {
      await page.addStyleTag({ content: options.injectCss });
    }

    if (options.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, { timeout: 10000 }).catch(() => {});
    }

    if (options.clickSelector) {
      await page.click(options.clickSelector, { timeout: 5000 }).catch(() => {});
    }

    if (options.printBackground) {
      await page.emulateMedia({ media: 'screen' });
    }

    const buffer = await page.pdf({
      format: options.format,
      landscape: options.landscape,
      printBackground: options.printBackground,
      margin: options.margin,
    });

    return buffer;
  } finally {
    if (context) await context.close();
  }
}

module.exports = { capture };
