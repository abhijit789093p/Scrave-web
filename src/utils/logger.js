function timestamp() {
  return new Date().toISOString();
}

const config = require('../config');

function formatLog(level, args) {
  if (config.NODE_ENV === 'production') {
    return [JSON.stringify({ timestamp: timestamp(), level, message: args.join(' ') })];
  }
  return [`[${timestamp()}] ${level.toUpperCase()}:`, ...args];
}

const logger = {
  info: (...args) => console.log(...formatLog('info', args)),
  warn: (...args) => console.warn(...formatLog('warn', args)),
  error: (...args) => console.error(...formatLog('error', args)),
};

module.exports = logger;
