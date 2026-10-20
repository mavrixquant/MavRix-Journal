const required = (key) => {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env var: ${key}`);
  return v;
};

const optional = (key, fallback = '') => process.env[key] || fallback;

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

  admin: {
    bootstrapEmail: process.env.ADMIN_BOOTSTRAP_EMAIL || '',
    bootstrapPassword: process.env.ADMIN_BOOTSTRAP_PASSWORD || '',
  },

  calendar: {
    syncEnabled: process.env.CALENDAR_SYNC_ENABLED !== 'false',
    syncIntervalMs: Number(process.env.CALENDAR_SYNC_INTERVAL_MS || 60_000),
    forwardDays: Number(process.env.CALENDAR_FORWARD_DAYS || 45),
    backwardDays: Number(process.env.CALENDAR_BACKWARD_DAYS || 30),
    chunkDays: Number(process.env.CALENDAR_CHUNK_DAYS || 7),
    fetchTimeoutMs: Number(process.env.CALENDAR_FETCH_TIMEOUT_MS || 15_000),
    baseUrl: process.env.BIQUOTE_BASE_URL || 'https://biquote.io',
  },

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

  ai: {
    masterKey: optional('MAVE_AI_MASTER_KEY'),

    providerPriority: optional('MAVE_AI_PROVIDER_PRIORITY', 'openrouter,groq,gemini,deepseek')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),

    keys: {
      openrouter: optional('MAVE_AI_OPENROUTER_KEY'),
      groq:       optional('MAVE_AI_GROQ_KEY'),
      gemini:     optional('MAVE_AI_GEMINI_KEY'),
      deepseek:   optional('MAVE_AI_DEEPSEEK_KEY'),
      openai:     optional('MAVE_AI_OPENAI_KEY'),
      anthropic:  optional('MAVE_AI_ANTHROPIC_KEY'),
    },

    historyLimit:     Number(optional('MAVE_AI_HISTORY_LIMIT', 20)),
    userRatePerHour:  Number(optional('MAVE_AI_USER_RATE_PER_HOUR', 20)),
    maxTokens:        Number(optional('MAVE_AI_MAX_TOKENS', 1024)),
    requestTimeoutMs: Number(optional('MAVE_AI_TIMEOUT_MS', 30_000)),
  },
};