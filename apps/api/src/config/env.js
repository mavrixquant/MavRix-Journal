// apps/api/src/config/env.js
const required = (key) => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',

  databaseUrl: required('DATABASE_URL'),

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessTtl: process.env.ACCESS_TOKEN_TTL || '15m',
    refreshTtl: process.env.REFRESH_TOKEN_TTL || '30d',
  },

  isProd: (process.env.NODE_ENV || 'development') === 'production',

  // ---------------------------------------------------------------------------
  // Admin panel — first-superadmin bootstrap.
  // ---------------------------------------------------------------------------
  admin: {
    bootstrapEmail: process.env.ADMIN_BOOTSTRAP_EMAIL || '',
    bootstrapPassword: process.env.ADMIN_BOOTSTRAP_PASSWORD || '',
  },

  // ---------------------------------------------------------------------------
  // Economic Calendar (Biquote)
  // ---------------------------------------------------------------------------
  calendar: {
    syncEnabled: process.env.CALENDAR_SYNC_ENABLED !== 'false',
    syncIntervalMs: Number(process.env.CALENDAR_SYNC_INTERVAL_MS || 60_000),
    forwardDays: Number(process.env.CALENDAR_FORWARD_DAYS || 45),
    backwardDays: Number(process.env.CALENDAR_BACKWARD_DAYS || 30),
    chunkDays: Number(process.env.CALENDAR_CHUNK_DAYS || 7),
    fetchTimeoutMs: Number(process.env.CALENDAR_FETCH_TIMEOUT_MS || 15_000),
    baseUrl: process.env.BIQUOTE_BASE_URL || 'https://biquote.io',
  },

  // ---------------------------------------------------------------------------
  // Market Data (Yahoo Finance)
  //
  // No API key required. The v8 chart endpoint is undocumented but stable
  // and used by yfinance and dozens of other libraries.
  //
  // Safety rails:
  //   - yahooMaxConcurrent: max in-flight requests (see lib/marketData/queue.js)
  //   - yahooMinGapMs:      min ms between two request STARTS
  //   - yahooTimeoutMs:     per-request AbortController timeout
  //
  // Cache TTLs are per-interval — shorter for finer granularity.
  // ---------------------------------------------------------------------------
  marketData: {
    yahooBaseUrl: process.env.YAHOO_BASE_URL || 'https://query1.finance.yahoo.com',
    yahooTimeoutMs: Number(process.env.YAHOO_TIMEOUT_MS || 10_000),
    yahooMaxConcurrent: Number(process.env.YAHOO_MAX_CONCURRENT || 2),
    yahooMinGapMs: Number(process.env.YAHOO_MIN_GAP_MS || 1000),

    cacheTtl: {
      '1m':  Number(process.env.YAHOO_TTL_1M  || 60_000),
      '5m':  Number(process.env.YAHOO_TTL_5M  || 5  * 60_000),
      '15m': Number(process.env.YAHOO_TTL_15M || 15 * 60_000),
      '1h':  Number(process.env.YAHOO_TTL_1H  || 30 * 60_000),
      '4h':  Number(process.env.YAHOO_TTL_4H  || 60 * 60_000),
      '1d':  Number(process.env.YAHOO_TTL_1D  || 60 * 60_000),
    },
  },
};