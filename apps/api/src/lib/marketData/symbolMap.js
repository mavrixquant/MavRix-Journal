// apps/api/src/lib/marketData/symbolMap.js
//
// Central symbol catalog. Every entry declares WHICH PROVIDER serves it:
//
//   provider: 'yahoo'   →  yahooProvider.js  (futures, crypto)
//   provider: 'biquote' →  biquoteProvider.js (forex, metals)
//
// Adding a symbol here is all that's needed — the service routes it
// automatically, and the frontend catalog picks it up on next load.

/* ------------------------------------------------------------------ */
/*  Yahoo map (unchanged from Phase 1)                                */
/* ------------------------------------------------------------------ */

export const YAHOO_SYMBOL_MAP = {
  NQ:  'NQ=F',
  MNQ: 'MNQ=F',
  ES:  'ES=F',
  MES: 'MES=F',
  YM:  'YM=F',
  MYM: 'MYM=F',
  GC:  'GC=F',
  MGC: 'MGC=F',
  CL:  'CL=F',
  MCL: 'MCL=F',
  BTCUSD: 'BTC-USD',
  ETHUSD: 'ETH-USD',
  SOLUSD: 'SOL-USD',
};

/* ------------------------------------------------------------------ */
/*  Biquote map — MT5 symbol codes                                    */
/* ------------------------------------------------------------------ */

export const BIQUOTE_SYMBOL_MAP = {
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
  XAUUSD: 'XAUUSD',
  XAGUSD: 'XAGUSD',
};

/* ------------------------------------------------------------------ */
/*  Unified resolver                                                  */
/* ------------------------------------------------------------------ */

/**
 * Given an internal symbol, return { provider, providerSymbol } or null.
 */
export function resolveSymbol(internalSymbol) {
  const raw = String(internalSymbol || '').trim().toUpperCase();
  if (!raw) return null;

  // Direct Yahoo ticker?
  if (raw.endsWith('=F') || raw.includes('-USD')) {
    return { provider: 'yahoo', providerSymbol: raw };
  }

  if (YAHOO_SYMBOL_MAP[raw]) {
    return { provider: 'yahoo', providerSymbol: YAHOO_SYMBOL_MAP[raw] };
  }
  if (BIQUOTE_SYMBOL_MAP[raw]) {
    return { provider: 'biquote', providerSymbol: BIQUOTE_SYMBOL_MAP[raw] };
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  Unified catalog — grouped by category                             */
/* ------------------------------------------------------------------ */

export const SYMBOL_CATALOG = [

  // ---------- Forex (Biquote / MT5) ----------
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
  
  // ---------- Spot metals (Biquote) ----------
  { code: 'XAUUSD', label: 'Gold Spot / USD',   category: 'Metals', exchange: 'MT5', provider: 'biquote' },
  { code: 'XAGUSD', label: 'Silver Spot / USD', category: 'Metals', exchange: 'MT5', provider: 'biquote' },

  // ---------- Equity index futures (Yahoo) ----------
  { code: 'NQ',  label: 'Nasdaq 100',       category: 'Futures',     exchange: 'CME',   provider: 'yahoo' },
  { code: 'MNQ', label: 'Micro Nasdaq 100', category: 'Futures',     exchange: 'CME',   provider: 'yahoo' },
  { code: 'ES',  label: 'S&P 500',          category: 'Futures',     exchange: 'CME',   provider: 'yahoo' },
  { code: 'MES', label: 'Micro S&P 500',    category: 'Futures',     exchange: 'CME',   provider: 'yahoo' },
  { code: 'YM',  label: 'Dow 30',           category: 'Futures',     exchange: 'CBOT',  provider: 'yahoo' },
  { code: 'MYM', label: 'Micro Dow 30',     category: 'Futures',     exchange: 'CBOT',  provider: 'yahoo' },

  // ---------- Commodity futures (Yahoo) ----------
  { code: 'GC',  label: 'Gold Futures',     category: 'Commodities', exchange: 'COMEX', provider: 'yahoo' },
  { code: 'MGC', label: 'Micro Gold',       category: 'Commodities', exchange: 'COMEX', provider: 'yahoo' },
  { code: 'CL',  label: 'Crude Oil (WTI)',  category: 'Commodities', exchange: 'NYMEX', provider: 'yahoo' },
  { code: 'MCL', label: 'Micro Crude Oil',  category: 'Commodities', exchange: 'NYMEX', provider: 'yahoo' },

  // ---------- Crypto (Yahoo) ----------
  { code: 'BTCUSD', label: 'Bitcoin',  category: 'Crypto', provider: 'yahoo' },
  { code: 'ETHUSD', label: 'Ethereum', category: 'Crypto', provider: 'yahoo' },
  { code: 'SOLUSD', label: 'Solana',   category: 'Crypto', provider: 'yahoo' },
];

export const SUPPORTED_INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'];

export function isSupported(symbol) {
  return resolveSymbol(symbol) !== null;
}