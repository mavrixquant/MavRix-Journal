import pino from 'pino';
import { hostname } from 'node:os';

// Pino logger instance with structured JSON output
// Levels: fatal (60), error (50), warn (40), info (30), debug (20), trace (10)
// Use process.env directly to avoid circular dependency with config/env.js
const isProd = (process.env.NODE_ENV || 'development') === 'production';
const logger = pino({
  level: isProd ? 'info' : 'debug',
  redact: {
    // Redact sensitive fields from logs
    paths: ['password', 'token', 'accessToken', 'refreshToken', 'secret', 'apiKey', 'Bearer'],
    censor: '[REDACTED]',
  },
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    pid: process.pid,
    hostname: isProd ? undefined : hostname(),
  },
});

// Convenience wrappers matching console.log/error/warn patterns
export const log = (namespace, message, ...args) => {
  if (typeof message === 'string' && args.length > 0) {
    logger.info({ namespace, args }, message);
  } else if (typeof message === 'string') {
    logger.info({ namespace }, message);
  } else {
    logger.info({ namespace, obj: message });
  }
};

export const warn = (namespace, message, ...args) => {
  if (typeof message === 'string') {
    logger.warn({ namespace, args }, message);
  } else {
    logger.warn({ namespace, obj: message });
  }
};

export const error = (namespace, errorOrMessage, ...args) => {
  if (typeof errorOrMessage === 'string') {
    const err = args.find(a => a instanceof Error);
    if (err) {
      logger.error({ namespace, error: err, args }, errorOrMessage);
    } else {
      logger.error({ namespace, args }, errorOrMessage);
    }
  } else if (errorOrMessage instanceof Error) {
    logger.error({ namespace, error: errorOrMessage, args }, errorOrMessage.message);
  } else {
    logger.error({ namespace, obj: errorOrMessage }, 'Unknown error');
  }
};

// Request context logging with correlation ID
export const requestLogger = (req, message, data = {}) => {
  logger.info({
    reqId: req.id || req.headers['x-request-id'],
    method: req.method,
    url: req.url,
    userId: req.user?.id,
    namespace: data.namespace || 'request',
    ...data,
  }, message);
};

// Export pino instance directly for advanced usage
export default logger;