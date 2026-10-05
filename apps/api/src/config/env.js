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
  //
  // If no user with role='superadmin' exists at boot, the API will create
  // (or promote) the user named by these two env vars. Once a superadmin
  // exists, these values are ignored — remove them from .env after first
  // successful boot to reduce blast radius.
  // ---------------------------------------------------------------------------
  admin: {
    bootstrapEmail: process.env.ADMIN_BOOTSTRAP_EMAIL || '',
    bootstrapPassword: process.env.ADMIN_BOOTSTRAP_PASSWORD || '',
  },

  // ---------------------------------------------------------------------------
  // Economic Calendar (Biquote — https://biquote.io)
  //
  // Biquote requires no API key. These controls govern the background sync loop
  // that polls GET /api/calendar and upserts into the EconomicEvent table.
  //
  // The sync fetches in weekly chunks because Biquote caps a single request at
  // 500 events. A 75-day window with a single request always returns the same
  // first 500 events — chunking by week makes coverage complete.
  // ---------------------------------------------------------------------------
  calendar: {
    // Master switch. Set CALENDAR_SYNC_ENABLED=false to disable polling
    // entirely (useful during local dev without network, or if Biquote is down).
    syncEnabled: process.env.CALENDAR_SYNC_ENABLED !== 'false',

    // Gap between completed syncs. Default 60_000 ms = once per minute.
    // The scheduling is recursive: this is the delay AFTER a sync finishes,
    // not a setInterval — so a slow sync cannot cause overlap.
    syncIntervalMs: Number(process.env.CALENDAR_SYNC_INTERVAL_MS || 60_000),

    // How many days ahead to fetch on each sync.
    forwardDays: Number(process.env.CALENDAR_FORWARD_DAYS || 45),

    // How many days back to keep in the cache. On each sync, events older
    // than this are pruned.
    backwardDays: Number(process.env.CALENDAR_BACKWARD_DAYS || 30),

    // Size of each fetch chunk, in days. Biquote caps a single request at
    // 500 events. A 7-day window rarely exceeds that even during heavy weeks
    // (NFP + CPI + FOMC + ECB). Reduce to 3 if a week returns exactly 500.
    chunkDays: Number(process.env.CALENDAR_CHUNK_DAYS || 7),

    // Per-request HTTP timeout. Prevents a hung Biquote response from
    // stalling the whole sync loop.
    fetchTimeoutMs: Number(process.env.CALENDAR_FETCH_TIMEOUT_MS || 15_000),

    // Biquote base URL. Overridable for testing.
    baseUrl: process.env.BIQUOTE_BASE_URL || 'https://biquote.io',
  },
};