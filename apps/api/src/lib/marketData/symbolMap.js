// apps/api/src/lib/marketData/symbolMap.js
//
// Translates internal symbol codes → Yahoo Finance tickers.
//
// Futures: append `=F` for the continuous front-month contract.
// Crypto:  append `-USD`.
// Forex:   NOT here — served by Biquote (separate provider).
//
// Yahoo always returns the resolved ticker in `meta.symbol`, so if a symbol
// ever changes upstream (rare), the reverse lookup still works for display.

export const YAHOO_SYMBOL_MAP = {
  // ---- CME / CBOT equity-index futures ----
  NQ:  'NQ=F',
  MNQ: 'MNQ=F',
  ES:  'ES=F',
  MES: 'MES=F',
  YM:  'YM=F',
  MYM: 'MYM=F',

  // ---- COMEX / NYMEX commodity futures ----
  GC:  'GC=F',
  MGC: 'MGC=F',
  CL:  'CL=F',
  MCL: 'MCL=F',

  // ---- Crypto (Yahoo free feed) ----
  BTCUSD: 'BTC-USD',
  ETHUSD: 'ETH-USD',
  SOLUSD: 'SOL-USD',
};

export const YAHOO_TO_INTERNAL = Object.fromEntries(
  Object.entries(YAHOO_SYMBOL_MAP).map(([internal, yahoo]) => [yahoo, internal])
);

/**
 * Resolve an internal symbol code to a Yahoo ticker.
 * Accepts either form: `NQ` or `NQ=F` or `BTC-USD`.
 * Returns null when the symbol is not in the catalog.
 */
export function toYahoo(internalSymbol) {
  const raw = String(internalSymbol || '').trim().toUpperCase();
  if (!raw) return null;

  // Already a Yahoo ticker?
  if (raw.endsWith('=F') || raw.includes('-USD')) return raw;

  return YAHOO_SYMBOL_MAP[raw] ?? null;
}

/** Reverse: Yahoo ticker → internal code (for display). */
export function toInternal(yahooSymbol) {
  return YAHOO_TO_INTERNAL[yahooSymbol] ?? yahooSymbol;
}

export function isSupported(internalSymbol) {
  return toYahoo(internalSymbol) !== null;
}

/**
 * Fixed catalog shown in the SymbolSearch UI. Add new entries here and the
 * frontend picks them up automatically via GET /api/market-data/catalog.
 */
export const SYMBOL_CATALOG = [
  // --- Equity index futures ---
  { code: 'NQ',  yahoo: 'NQ=F',  label: 'Nasdaq 100',       category: 'Futures',     exchange: 'CME'   },
  { code: 'MNQ', yahoo: 'MNQ=F', label: 'Micro Nasdaq 100', category: 'Futures',     exchange: 'CME'   },
  { code: 'ES',  yahoo: 'ES=F',  label: 'S&P 500',          category: 'Futures',     exchange: 'CME'   },
  { code: 'MES', yahoo: 'MES=F', label: 'Micro S&P 500',    category: 'Futures',     exchange: 'CME'   },
  { code: 'YM',  yahoo: 'YM=F',  label: 'Dow 30',           category: 'Futures',     exchange: 'CBOT'  },
  { code: 'MYM', yahoo: 'MYM=F', label: 'Micro Dow 30',     category: 'Futures',     exchange: 'CBOT'  },

  // --- Commodity futures ---
  { code: 'GC',  yahoo: 'GC=F',  label: 'Gold',             category: 'Commodities', exchange: 'COMEX' },
  { code: 'MGC', yahoo: 'MGC=F', label: 'Micro Gold',       category: 'Commodities', exchange: 'COMEX' },
  { code: 'CL',  yahoo: 'CL=F',  label: 'Crude Oil (WTI)',  category: 'Commodities', exchange: 'NYMEX' },
  { code: 'MCL', yahoo: 'MCL=F', label: 'Micro Crude Oil',  category: 'Commodities', exchange: 'NYMEX' },

  // --- Crypto ---
  { code: 'BTCUSD', yahoo: 'BTC-USD', label: 'Bitcoin',  category: 'Crypto' },
  { code: 'ETHUSD', yahoo: 'ETH-USD', label: 'Ethereum', category: 'Crypto' },
  { code: 'SOLUSD', yahoo: 'SOL-USD', label: 'Solana',   category: 'Crypto' },
];

/** Supported chart intervals exposed to the frontend. */
export const SUPPORTED_INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'];