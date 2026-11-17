

// ============================================================================
// FREE DATA PROVIDER STRATEGY
// ============================================================================
// Yahoo Finance (no API key, unlimited calls):
//   - Futures: NQ, ES, YM, GC, CL + micros (60 days 1min, 5+ years daily)
//   - Crypto: BTC, ETH, SOL (60 days 1min)
//   - Forex: EURUSD=X, GBPUSD=X (limited, fallback to AV)
//
// Alpha Vantage (free tier, 25 calls/day):
//   - Forex intraday: EURUSD, GBPUSD, USDJPY, AUDUSD, USDCAD, USDCHF, NZDUSD, EURGBP, EURJPY, GBPJPY (60 days 1min)
//   - Crypto daily: BTC, ETH, SOL (20+ years daily)
//   - Metals daily: XAU, XAG (20+ years daily)
//
// Biquote (free, no key):
//   - Forex: Full support as fallback
//   - Metals: XAUUSD, XAGUSD intraday
// ============================================================================

// Yahoo: Futures + Crypto (primary source for 1min intraday)
export const YAHOO_SYMBOL_MAP = {
  // Micro Futures (CME)
  MNQ: 'MNQ=F',
  MES: 'MES=F',
  MYM: 'MYM=F',
  MGC: 'MGC=F',
  MCL: 'MCL=F',

  // Regular Futures
  NQ: 'NQ=F',
  ES: 'ES=F',
  YM: 'YM=F',
  GC: 'GC=F',
  CL: 'CL=F',

  // Crypto (60 days 1min via Yahoo)
  BTCUSD: 'BTC-USD',
  ETHUSD: 'ETH-USD',
  SOLUSD: 'SOL-USD',
};

// Alpha Vantage: Forex intraday + Crypto/Metals daily
export const ALPHA_VANTAGE_SYMBOL_MAP = {
  // Forex (intraday supported on free tier)
  EURUSD: 'EUR',
  GBPUSD: 'GBP',
  USDJPY: 'JPY',
  AUDUSD: 'AUD',
  USDCAD: 'CAD',
  USDCHF: 'CHF',
  NZDUSD: 'NZD',
  EURGBP: 'EUR/GBP',
  EURJPY: 'EUR/JPY',
  GBPJPY: 'GBP/JPY',

  // Crypto daily (free tier only supports daily)
  // Note: Use Yahoo for 1min, AV for daily fills
  // BTCUSD: 'BTC',  // Daily only - use Yahoo for intraday
  // ETHUSD: 'ETH',
  // SOLUSD: 'SOL',

  // Metals daily (free tier supports these)
  XAUUSD: 'XAU',
  XAGUSD: 'XAG',
};

// Biquote: Forex + Metals (excellent free coverage)
export const BIQUOTE_SYMBOL_MAP = {
  // Forex (full support)
  EURUSD: 'EURUSD',
  GBPUSD: 'GBPUSD',
  USDJPY: 'USDJPY',
  AUDUSD: 'AUDUSD',
  USDCAD: 'USDCAD',
  USDCHF: 'USDCHF',
  NZDUSD: 'NZDUSD',
  EURGBP: 'EURGBP',
  EURJPY: 'EURJPY',
  GBPJPY: 'GBPJPY',

  // Metals (intraday support)
  XAUUSD: 'XAUUSD',
  XAGUSD: 'XAGUSD',
};

// Symbol categories for smart provider selection
export const SYMBOL_CATEGORIES = {
  futures: ['NQ', 'MNQ', 'ES', 'MES', 'YM', 'MYM', 'GC', 'MGC', 'CL', 'MCL'],
  forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY'],
  crypto: ['BTCUSD', 'ETHUSD', 'SOLUSD'],
  metals: ['XAUUSD', 'XAGUSD'],
};

// Resolve symbol with smart provider selection based on data needs
export function resolveSymbol(internalSymbol, provider = 'auto') {
  const raw = String(internalSymbol || '').trim().toUpperCase();
  if (!raw) return null;

  const isFutures = SYMBOL_CATEGORIES.futures.includes(raw);
  const isCrypto = SYMBOL_CATEGORIES.crypto.includes(raw);
  const isForex = SYMBOL_CATEGORIES.forex.includes(raw);
  const isMetals = SYMBOL_CATEGORIES.metals.includes(raw);

  // ================================================================
  // FUTURES: Yahoo primary, no AV (intraday premium only)
  // ================================================================
  if (isFutures) {
    if (YAHOO_SYMBOL_MAP[raw]) {
      return {
        provider: 'yahoo',
        providerSymbol: YAHOO_SYMBOL_MAP[raw],
        fallbackProviders: [], // No free fallback for futures intraday
        category: 'futures',
        note: 'Yahoo: 60 days 1min max',
      };
    }
  }

  // ================================================================
  // CRYPTO: Yahoo primary for 1min, Alpha Vantage for daily fills
  // ================================================================
  if (isCrypto) {
    if (YAHOO_SYMBOL_MAP[raw]) {
      return {
        provider: 'yahoo',
        providerSymbol: YAHOO_SYMBOL_MAP[raw],
        fallbackProviders: [], // Yahoo is best for crypto intraday
        category: 'crypto',
        note: 'Yahoo: 60 days 1min, use AV for daily historical',
      };
    }
  }

  // ================================================================
  // FOREX: Alpha Vantage primary, Biquote fallback, Yahoo last resort
  // ================================================================
  if (isForex) {
    // AV: Best free forex coverage
    if ((provider === 'auto' || provider === 'alphavantage') && ALPHA_VANTAGE_SYMBOL_MAP[raw]) {
      return {
        provider: 'alphavantage',
        providerSymbol: ALPHA_VANTAGE_SYMBOL_MAP[raw],
        fallbackProviders: ['biquote', 'yahoo'],
        category: 'forex',
        note: 'AV: 60 days 1min, fallback to Biquote/Yahoo',
      };
    }

    // Biquote: Strong forex backup
    if ((provider === 'auto' || provider === 'biquote') && BIQUOTE_SYMBOL_MAP[raw]) {
      return {
        provider: 'biquote',
        providerSymbol: BIQUOTE_SYMBOL_MAP[raw],
        fallbackProviders: ['yahoo'],
        category: 'forex',
        note: 'Biquote: Good forex coverage',
      };
    }

    // Yahoo: Last resort for forex
    if (provider === 'auto' || provider === 'yahoo') {
      const yahooSymbol = `${raw}=X`;
      if (YAHOO_SYMBOL_MAP[raw] || YAHOO_SYMBOL_MAP[yahooSymbol] || YAHOO_SYMBOL_MAP[raw.replace('USD', '') + 'USD=X']) {
        return {
          provider: 'yahoo',
          providerSymbol: YAHOO_SYMBOL_MAP[raw] || yahooSymbol,
          fallbackProviders: [],
          category: 'forex',
          note: 'Yahoo: Limited forex, prefer AV',
        };
      }
    }
  }

  // ================================================================
  // METALS: Biquote primary, Alpha Vantage for daily
  // ================================================================
  if (isMetals) {
    // Biquote: Best for intraday metals
    if ((provider === 'auto' || provider === 'biquote') && BIQUOTE_SYMBOL_MAP[raw]) {
      return {
        provider: 'biquote',
        providerSymbol: BIQUOTE_SYMBOL_MAP[raw],
        fallbackProviders: ['alphavantage'],
        category: 'metals',
        note: 'Biquote: Intraday metals, fallback to AV daily',
      };
    }

    // Alpha Vantage: Daily historical
    if ((provider === 'auto' || provider === 'alphavantage') && ALPHA_VANTAGE_SYMBOL_MAP[raw]) {
      return {
        provider: 'alphavantage',
        providerSymbol: ALPHA_VANTAGE_SYMBOL_MAP[raw],
        fallbackProviders: [],
        category: 'metals',
        note: 'AV: Daily only, 20+ years history',
      };
    }
  }

  // ================================================================
  // Generic fallback: Try Yahoo first, then others
  // ================================================================
  if (provider === 'auto' || provider === 'yahoo') {
    // Check futures
    if (YAHOO_SYMBOL_MAP[raw]) {
      return {
        provider: 'yahoo',
        providerSymbol: YAHOO_SYMBOL_MAP[raw],
        fallbackProviders: [],
        category: isFutures ? 'futures' : (isCrypto ? 'crypto' : 'other'),
        note: 'Yahoo: Primary source',
      };
    }
  }

  return null;
}


export const SYMBOL_CATALOG = [

  { code: 'EURUSD', label: 'Euro / US Dollar',       category: 'Forex', exchange: 'MT5', provider: 'biquote' },
  { code: 'GBPUSD', label: 'British Pound / US Dollar', category: 'Forex', exchange: 'MT5', provider: 'biquote' },
  { code: 'USDJPY', label: 'US Dollar / Japanese Yen',   category: 'Forex', exchange: 'MT5', provider: 'biquote' },
  { code: 'AUDUSD', label: 'Australian Dollar / USD',     category: 'Forex', exchange: 'MT5', provider: 'biquote' },
  { code: 'USDCAD', label: 'US Dollar / Canadian Dollar', category: 'Forex', exchange: 'MT5', provider: 'biquote' },
  { code: 'USDCHF', label: 'US Dollar / Swiss Franc',     category: 'Forex', exchange: 'MT5', provider: 'biquote' },
  { code: 'NZDUSD', label: 'New Zealand Dollar / USD',    category: 'Forex', exchange: 'MT5', provider: 'biquote' },
  { code: 'EURGBP', label: 'Euro / British Pound',        category: 'Forex', exchange: 'MT5', provider: 'biquote' },
  { code: 'EURJPY', label: 'Euro / Japanese Yen',         category: 'Forex', exchange: 'MT5', provider: 'biquote' },
  { code: 'GBPJPY', label: 'British Pound / Japanese Yen', category: 'Forex', exchange: 'MT5', provider: 'biquote' },
  
  { code: 'XAUUSD', label: 'Gold Spot / USD',   category: 'Metals', exchange: 'MT5', provider: 'biquote' },
  { code: 'XAGUSD', label: 'Silver Spot / USD', category: 'Metals', exchange: 'MT5', provider: 'biquote' },

  { code: 'NQ',  label: 'Nasdaq 100',       category: 'Futures',     exchange: 'CME',   provider: 'yahoo' },
  { code: 'MNQ', label: 'Micro Nasdaq 100', category: 'Futures',     exchange: 'CME',   provider: 'yahoo' },
  { code: 'ES',  label: 'S&P 500',          category: 'Futures',     exchange: 'CME',   provider: 'yahoo' },
  { code: 'MES', label: 'Micro S&P 500',    category: 'Futures',     exchange: 'CME',   provider: 'yahoo' },
  { code: 'YM',  label: 'Dow 30',           category: 'Futures',     exchange: 'CBOT',  provider: 'yahoo' },
  { code: 'MYM', label: 'Micro Dow 30',     category: 'Futures',     exchange: 'CBOT',  provider: 'yahoo' },

  { code: 'GC',  label: 'Gold Futures',     category: 'Commodities', exchange: 'COMEX', provider: 'yahoo' },
  { code: 'MGC', label: 'Micro Gold',       category: 'Commodities', exchange: 'COMEX', provider: 'yahoo' },
  { code: 'CL',  label: 'Crude Oil (WTI)',  category: 'Commodities', exchange: 'NYMEX', provider: 'yahoo' },
  { code: 'MCL', label: 'Micro Crude Oil',  category: 'Commodities', exchange: 'NYMEX', provider: 'yahoo' },

  { code: 'BTCUSD', label: 'Bitcoin',  category: 'Crypto', provider: 'yahoo' },
  { code: 'ETHUSD', label: 'Ethereum', category: 'Crypto', provider: 'yahoo' },
  { code: 'SOLUSD', label: 'Solana',   category: 'Crypto', provider: 'yahoo' },
];

export const SUPPORTED_INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'];

export function isSupported(symbol) {
  return resolveSymbol(symbol) !== null;
}