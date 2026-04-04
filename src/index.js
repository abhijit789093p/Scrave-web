const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const logger = require('./utils/logger');
const { migrate } = require('./db/migrate');
const { closeDb } = require('./db/connection');
const { closeBrowser } = require('./services/browser');
const { startWorker } = require('./services/worker');
const { globalLimiter, authLimiter } = require('./middleware/rateLimiter');
const authMiddleware = require('./middleware/auth');
const usageTracker = require('./middleware/usageTracker');
const errorHandler = require('./middleware/errorHandler');

// Routes
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const screenshotRoutes = require('./routes/screenshot');
const pdfRoutes = require('./routes/pdf');
const usageRoutes = require('./routes/usage');
const billingRoutes = require('./routes/billing');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

// Trust proxy (Render, Railway, etc.) so rate limiter sees real client IPs
app.set('trust proxy', 1);

// Security & parsing
app.use(helmet({ contentSecurityPolicy: false }));

// CORS — restrict to app domain in production
const corsOptions = config.NODE_ENV === 'production' && config.APP_URL
  ? { origin: config.APP_URL, credentials: true }
  : {};
app.use(cors(corsOptions));

app.use(globalLimiter);

// Request body size limit — prevents payload attacks
app.use(express.json({ limit: '1mb' }));

// Static files (landing page)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Public routes
app.use('/api/v1', healthRoutes);
app.use('/auth', authRoutes);

// Protected API routes
app.use('/api/v1', authMiddleware, usageTracker, screenshotRoutes);
app.use('/api/v1', authMiddleware, usageTracker, pdfRoutes);
app.use('/api/v1', authMiddleware, usageRoutes);

// Billing routes (webhook needs raw body, so mounted separately)
app.use('/billing', billingRoutes);

// Dashboard routes (JWT protected)
app.use('/dashboard', dashboardRoutes);

// Error handler
app.use(errorHandler);

// Keep-alive self-ping to prevent Render idle shutdown
function startKeepAlive() {
  if (config.NODE_ENV !== 'production' || !config.APP_URL) return;

  const interval = config.KEEP_ALIVE_INTERVAL; // default 10 min
  setInterval(() => {
    fetch(`${config.APP_URL}/api/v1/health`)
      .then((res) => logger.info(`[KeepAlive] Ping OK (${res.status})`))
      .catch((err) => logger.warn(`[KeepAlive] Ping failed: ${err.message}`));
  }, interval);
  logger.info(`[KeepAlive] Started — pinging ${config.APP_URL} every ${interval / 1000}s`);
}

async function start() {
  // Run database migrations
  await migrate();

  // Start queue worker
  startWorker();

  app.listen(config.PORT, () => {
    logger.info(`Scrave API running on http://localhost:${config.PORT}`);
    logger.info(`Environment: ${config.NODE_ENV}`);
    startKeepAlive();
  });
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down...');
  await closeBrowser();
  await closeDb();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start().catch((err) => {
  logger.error('Failed to start:', err);
  process.exit(1);
});
