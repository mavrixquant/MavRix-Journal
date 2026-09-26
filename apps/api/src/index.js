import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';

import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { errorHandler, notFound } from './middleware/error.js';

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

// Disable HTTP caching for all API responses.
// Prevents stale or cross-user data being served from the browser cache.
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.use('/api', apiRouter);

app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`[api] listening on http://localhost:${env.port} (${env.nodeEnv})`);
});