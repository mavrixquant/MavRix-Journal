// apps/api/src/services/marketData.service.js
//
// Business logic. Routes each symbol to its declared provider via
// resolveSymbol() — the caller never needs to know which feed it is.

import { HttpError } from '../middleware/error.js';
import {
  resolveSymbol,
  SYMBOL_CATALOG,
  SUPPORTED_INTERVALS,
} from '../lib/marketData/index.js';

import {
  getBars as getYahooBars,
  getQuote as getYahooQuote,
} from '../lib/marketData/yahooProvider.js';

import {
  getBars as getBiquoteBars,
  getQuote as getBiquoteQuote,
} from '../lib/marketData/biquoteProvider.js';

/* ------------------------------------------------------------------ */
/*  Provider dispatch                                                 */
/* ------------------------------------------------------------------ */

function pickBarsFn(provider) {
  return provider === 'biquote' ? getBiquoteBars : getYahooBars;
}

function pickQuoteFn(provider) {
  return provider === 'biquote' ? getBiquoteQuote : getYahooQuote;
}

/* ------------------------------------------------------------------ */
/*  Catalog                                                           */
/* ------------------------------------------------------------------ */

export function listCatalog() {
  return { symbols: SYMBOL_CATALOG, intervals: SUPPORTED_INTERVALS };
}

/* ------------------------------------------------------------------ */
/*  Bars                                                              */
/* ------------------------------------------------------------------ */

export async function fetchBars({ symbol, interval }) {
  if (!symbol) throw new HttpError(400, 'symbol is required');
  if (!interval) throw new HttpError(400, 'interval is required');

  if (!SUPPORTED_INTERVALS.includes(interval)) {
    throw new HttpError(
      400,
      `Unsupported interval "${interval}". Allowed: ${SUPPORTED_INTERVALS.join(', ')}`
    );
  }

  const resolved = resolveSymbol(symbol);
  if (!resolved) {
    throw new HttpError(404, `Symbol "${symbol}" not in catalog.`);
  }

  const barsFn = pickBarsFn(resolved.provider);

  if (typeof barsFn !== 'function') {
    console.error(
      `[marketData] provider "${resolved.provider}" has no getBars function`,
    );
    throw new HttpError(500, `Provider "${resolved.provider}" is misconfigured.`);
  }

  const bars = await barsFn(resolved.providerSymbol, interval);

  if (!Array.isArray(bars)) {
    console.error(
      `[marketData] provider "${resolved.provider}" returned non-array for ${symbol}/${interval}:`,
      typeof bars,
      bars,
    );
    throw new HttpError(502, `Provider "${resolved.provider}" returned invalid bar data.`);
  }

  return {
    symbol: symbol.toUpperCase(),
    provider: resolved.provider,
    providerSymbol: resolved.providerSymbol,
    interval,
    count: bars.length,
    bars,
  };
}

/* ------------------------------------------------------------------ */
/*  Quote                                                             */
/* ------------------------------------------------------------------ */

export async function fetchQuote({ symbol }) {
  if (!symbol) throw new HttpError(400, 'symbol is required');

  const resolved = resolveSymbol(symbol);
  if (!resolved) throw new HttpError(404, `Symbol "${symbol}" not in catalog.`);

  const quoteFn = pickQuoteFn(resolved.provider);

  if (typeof quoteFn !== 'function') {
    console.error(
      `[marketData] provider "${resolved.provider}" has no getQuote function`,
    );
    throw new HttpError(500, `Provider "${resolved.provider}" is misconfigured.`);
  }

  const quote = await quoteFn(resolved.providerSymbol);
  return { symbol: symbol.toUpperCase(), provider: resolved.provider, ...quote };
}

/* ------------------------------------------------------------------ */
/*  Batch quotes                                                      */
/* ------------------------------------------------------------------ */

const MAX_BATCH = 30;

export async function fetchQuotes({ symbols }) {
  if (!Array.isArray(symbols) || symbols.length === 0) {
    throw new HttpError(400, 'symbols is required and must be a non-empty array.');
  }
  if (symbols.length > MAX_BATCH) {
    throw new HttpError(400, `Max ${MAX_BATCH} symbols per request.`);
  }

  const quotes = await Promise.all(
    symbols.map(async (s) => {
      try {
        const resolved = resolveSymbol(s);
        if (!resolved) throw new Error(`Symbol "${s}" not in catalog.`);
        const quoteFn = pickQuoteFn(resolved.provider);
        if (typeof quoteFn !== 'function') {
          throw new Error(`Provider "${resolved.provider}" is misconfigured.`);
        }
        const q = await quoteFn(resolved.providerSymbol);
        return { symbol: s.toUpperCase(), provider: resolved.provider, ...q, error: null };
      } catch (err) {
        return { symbol: s.toUpperCase(), error: err.message };
      }
    })
  );

  return { quotes };
}