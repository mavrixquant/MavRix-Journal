import client from 'prom-client';
import { env } from '../config/env.js';

// Register all metrics at module load
const register = new client.Registry();

// Basic metrics setup
client.collectDefaultMetrics({ register });

// HTTP Request duration histogram
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status', 'namespace'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

// Request count counter
export const httpRequestCount = new client.Counter({
  name: 'http_request_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status', 'namespace'],
  registers: [register],
});

// Active SSE connections gauge
export const activeSseConnections = new client.Gauge({
  name: 'sse_connections_active',
  help: 'Number of active Server-Sent Events connections',
  registers: [register],
});

// Database operation duration histogram
export const dbOperationDuration = new client.Histogram({
  name: 'db_operation_duration_seconds',
  help: 'Duration of database operations in seconds',
  labelNames: ['operation', 'model'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 5],
  registers: [register],
});

// API error counter
export const apiErrors = new client.Counter({
  name: 'api_errors_total',
  help: 'Total number of API errors by type',
  labelNames: ['type', 'route', 'status'],
  registers: [register],
});

// Trade processing metrics
export const tradeProcessing = new client.Counter({
  name: 'trade_processing_total',
  help: 'Trade processing events',
  labelNames: ['action', 'symbol', 'outcome'],
  registers: [register],
});

// Backtest session completion counter
export const backtestSessionsCompleted = new client.Counter({
  name: 'backtest_sessions_completed_total',
  help: 'Completed backtest sessions by outcome',
  labelNames: ['outcome', 'symbol'],
  registers: [register],
});

// Market data import metrics
export const marketDataImport = new client.Counter({
  name: 'market_data_import_total',
  help: 'Market data import events',
  labelNames: ['provider', 'symbol', 'interval', 'status'],
  registers: [register],
});

// Cache hit ratio
export const cacheHits = new client.Counter({
  name: 'cache_hits_total',
  help: 'Cache hit/miss counts',
  labelNames: ['type', 'outcome'],
  registers: [register],
});

// Get metrics in Prometheus format
export const getMetrics = async () => {
  return register.metrics();
};

// Reset all metrics (useful for testing)
export const resetMetrics = () => {
  register.resetMetrics();
};

// Express middleware to track HTTP requests
export const metricsMiddleware = (req, res, next) => {
  const start = process.hrtime.bigint();
  const reqId = req.headers['x-request-id'] || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  req.id = reqId;

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationNs = Number(end - start);
    const durationSeconds = durationNs / 1e9;
    const route = req.route?.path || req.path;

    const labels = {
      method: req.method,
      route,
      status: String(res.statusCode),
      namespace: req.namespace || 'api',
    };

    httpRequestDuration.observe(labels, durationSeconds);
    httpRequestCount.inc(labels);
  });

  next();
};

// Error tracking middleware alternative name
export const errorTracker = (err, req, res, next) => {
  const route = req.route?.path || req.path;
  apiErrors.inc({
    type: err.constructor.name,
    route,
    status: String(err.status || 500),
  });

  // Pass to error handler
  if (next) next(err);
};

// Export register for /metrics endpoint
export default register;