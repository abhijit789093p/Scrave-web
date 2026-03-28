const { z } = require('zod');

// Block private/internal IPs to prevent SSRF
const urlSchema = z.string().url().refine((url) => {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    // Block common private ranges and metadata endpoints
    const blocked = [
      /^localhost$/i,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^0\./,
      /^\[::1\]/,
    ];
    if (blocked.some((r) => r.test(hostname))) return false;
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    return true;
  } catch {
    return false;
  }
}, { message: 'Invalid or blocked URL' });

const advancedOptions = {
  injectCss: z.string().max(10000).optional(),
  waitForSelector: z.string().max(255).optional(),
  clickSelector: z.string().max(255).optional(),
};

const screenshotSchema = z.object({
  url: urlSchema,
  width: z.number().int().min(320).max(3840).default(1280),
  height: z.number().int().min(240).max(2160).default(720),
  fullPage: z.boolean().default(false),
  format: z.enum(['png', 'jpeg']).default('png'),
  quality: z.number().int().min(1).max(100).optional(),
  delay: z.number().int().min(0).max(10000).default(0),
  ...advancedOptions,
});

const pdfSchema = z.object({
  url: urlSchema,
  format: z.enum(['A4', 'Letter', 'Legal', 'Tabloid']).default('A4'),
  landscape: z.boolean().default(false),
  printBackground: z.boolean().default(true),
  margin: z.object({
    top: z.string().default('1cm'),
    right: z.string().default('1cm'),
    bottom: z.string().default('1cm'),
    left: z.string().default('1cm'),
  }).default({}),
  ...advancedOptions,
});

module.exports = { screenshotSchema, pdfSchema };
