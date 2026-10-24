import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';

import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { eventsRoutes } from './routes/events.routes.js';
import { errorHandler, notFound } from './middleware/error.js';
import { startCalendarSync, stopCalendarSync } from './lib/calendarSync.js';
import { ensureSuperadmin } from './lib/adminBootstrap.js';
import { ensureMaveAi } from './services/maveAiBootstrap.js';

const app = express();

app.use(helmet());
app.use(compression());
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json({ limit: '12mb' }));
app.use(cookieParser());
app.use(morgan(env.isProd ? 'combined' : 'dev'));

app.use('/api/events', eventsRoutes);
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
});
app.use('/api', apiRouter);
app.use(notFound);
app.use(errorHandler);

const server = app.listen(env.port, async () => {
  console.log(`[api] listening on http://localhost:${env.port} (${env.nodeEnv})`);
  try { await ensureSuperadmin(); } catch (err) { console.error('[admin] bootstrap failed:', err); }
  try { await ensureMaveAi(); } catch (err) { console.error('[mave-ai] bootstrap failed:', err); }
  if (env.calendar.syncEnabled) startCalendarSync();
  
  // Background market sync removed. We rely strictly on lazy loading.
});

const shutdown = (signal) => {
  console.log(`[api] received ${signal}, shutting down…`);
  stopCalendarSync();
  server.close(() => process.exit(0));
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));