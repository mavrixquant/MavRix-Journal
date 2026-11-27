import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';

import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { eventsRoutes } from './routes/events.routes.js';
import { maintenanceGate } from './middleware/maintenance.js';
import { csrfGuard } from './middleware/csrf.js';
import { errorHandler, notFound } from './middleware/error.js';
import { startCalendarSync, stopCalendarSync } from './lib/calendarSync.js';
import { ensureSuperadmin } from './lib/adminBootstrap.js';
import { ensureMaveAi } from './services/maveAiBootstrap.js';
import { ensureDefaultChannels } from './services/channelBootstrap.js';
import { markInterruptedJobs } from './services/adminMarketData.service.js';
import logger, { log, warn, error } from './lib/logger.js';
import { metricsMiddleware, httpRequestCount } from './lib/metrics.js';

const app = express();

app.use(helmet());
app.use(compression());
app.use(cors({
  origin: env.clientOrigin,
  credentials: true,
  // Admin GEX export returns the server-chosen filename in this header; it
  // must be exposed or the browser can't read it on a cross-origin response.
  exposedHeaders: ['X-Suggested-Filename'],
}));
app.use(express.json({ limit: '12mb' }));
app.use(cookieParser());
app.use(morgan(env.isProd ? 'combined' : 'dev'));

// FIXED 2026-11-15 — maintenance gate runs BEFORE every /api route,
// including SSE. If maintenance is ON, non-superadmin requests get a 503
// before any controller/DB work is done. The gate itself respects the
// allowlist (/api/health, /api/system/status, /api/auth/*) and the
// superadmin token, so the superadmin can always log in and toggle it off.
app.use('/api', maintenanceGate);
// FIXED 2026-11-18 — origin validation for cookie-authenticated mutations.
app.use('/api', csrfGuard);

app.use('/api/events', eventsRoutes);
app.use(metricsMiddleware);
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});
app.use('/api', apiRouter);
app.use(notFound);
app.use(errorHandler);

const server = app.listen(env.port, async () => {
  log('api', `listening on http://localhost:${env.port} (${env.nodeEnv})`);
  try { await ensureSuperadmin(); } catch (err) { log('admin', 'bootstrap failed', err); }
  try { await ensureMaveAi(); } catch (err) { log('mave-ai', 'bootstrap failed', err); }
  try { await ensureDefaultChannels(); } catch (err) { log('channels', 'bootstrap failed', err); }
  try { await markInterruptedJobs(); } catch (err) { log('market-data', 'boot sweep failed', err); }
  if (env.calendar.syncEnabled) startCalendarSync();
});

const shutdown = (signal) => {
  log('api', `received ${signal}, shutting down`);
  stopCalendarSync();
  server.close(() => process.exit(0));
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Export logger for use in other modules
export { logger, log, warn, error };