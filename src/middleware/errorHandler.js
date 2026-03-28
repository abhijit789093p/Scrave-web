const logger = require('../utils/logger');
const config = require('../config');

function errorHandler(err, req, res, _next) {
  logger.error(err.message, err.stack);

  const status = err.status || 500;
  const response = {
    error: {
      message: status === 500 && config.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
      code: err.code || 'SERVER_ERROR',
    },
  };

  res.status(status).json(response);
}

module.exports = errorHandler;
