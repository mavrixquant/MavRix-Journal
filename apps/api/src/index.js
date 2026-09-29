// apps/api/src/index.js
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { eventsRoutes } from './routes/events.routes.js';
import { errorHandler, notFound } from './middleware/error.js';
import { startCalendarSync, stopCalendarSync } from './lib/calendarSync.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: env.clientOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());
app.use(morgan(env.isProd ? 'combined' : 'dev'));

// ---------------------------------------------------------------------------
// SSE — mounted BEFORE the /api no-cache middleware and BEFORE the main API
// router, because:
//   - SSE needs its own Cache-Control header (the no-cache middleware would
//     conflict with EventSource's expectations)
//   - It manages its own long-lived response lifecycle
//   - Only the events route uses this prefix
// ---------------------------------------------------------------------------
app.use('/api/events', eventsRoutes);

// Disable HTTP caching for all OTHER API responses.
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.use('/api', apiRouter);

app.use(notFound);
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Boot: start the HTTP server, then kick off the calendar sync loop.
// Sync runs in-process — no external cron, no queue.
// ---------------------------------------------------------------------------
const server = app.listen(env.port, () => {
  console.log(
    `[api] listening on http://localhost:${env.port} (${env.nodeEnv})`
  );

  if (env.calendar.syncEnabled) {
    startCalendarSync();
  }
});

// Graceful shutdown — stop the sync loop before the process exits.
const shutdown = (signal) => {
  console.log(`[api] received ${signal}, shutting down…`);
  stopCalendarSync();
  server.close(() => {
    console.log('[api] HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));