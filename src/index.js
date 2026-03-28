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

// Security & parsing
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(globalLimiter);
app.use(express.json());

// Static files (landing page)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Public routes
app.use('/api/v1', healthRoutes);
app.use('/auth', authLimiter, authRoutes);

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

async function start() {
  // Run database migrations
  migrate();

  // Start queue worker
  startWorker();

  app.listen(config.PORT, () => {
    logger.info(`Scrave API running on http://localhost:${config.PORT}`);
    logger.info(`Environment: ${config.NODE_ENV}`);
  });
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down...');
  await closeBrowser();
  closeDb();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

start().catch((err) => {
  logger.error('Failed to start:', err);
  process.exit(1);
});
