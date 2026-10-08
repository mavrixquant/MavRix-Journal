// apps/api/src/services/marketData.service.js

import { HttpError } from '../middleware/error.js';
import {
  toYahoo,
  SYMBOL_CATALOG,
  SUPPORTED_INTERVALS,
} from '../lib/marketData/index.js';
import {
  getBars as providerGetBars,
  getQuote as providerGetQuote,
} from '../lib/marketData/yahooProvider.js';

/* ------------------------------------------------------------------ */
/*  Catalog                                                           */
/* ------------------------------------------------------------------ */

export function listCatalog() {
  return { symbols: SYMBOL_CATALOG, intervals: SUPPORTED_INTERVALS };
}

/* ------------------------------------------------------------------ */
/*  Bars                                                              */
/* ------------------------------------------------------------------ */

const VALID_RANGES = new Set([
  '1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max',
]);

export async function fetchBars({ symbol, interval, range }) {
  if (!symbol) throw new HttpError(400, 'symbol is required');
  if (!interval) throw new HttpError(400, 'interval is required');

  if (!SUPPORTED_INTERVALS.includes(interval)) {
    throw new HttpError(400, `Unsupported interval "${interval}". Allowed: ${SUPPORTED_INTERVALS.join(', ')}`);
  }
  if (range && !VALID_RANGES.has(range)) {
    throw new HttpError(400, `Unsupported range "${range}"`);
  }

  const yahooSymbol = toYahoo(symbol);
  if (!yahooSymbol) throw new HttpError(404, `Symbol "${symbol}" not in catalog.`);

  const bars = await providerGetBars(yahooSymbol, interval, range);
  return { symbol, yahooSymbol, interval, range: range || null, count: bars.length, bars };
}

/* ------------------------------------------------------------------ */
/*  Quote (single)                                                    */
/* ------------------------------------------------------------------ */

export async function fetchQuote({ symbol }) {
  if (!symbol) throw new HttpError(400, 'symbol is required');
  const yahooSymbol = toYahoo(symbol);
  if (!yahooSymbol) throw new HttpError(404, `Symbol "${symbol}" not in catalog.`);
  const quote = await providerGetQuote(yahooSymbol);
  return { symbol, yahooSymbol, ...quote };
}

/* ------------------------------------------------------------------ */
/*  Quotes (batched)                                                  */
/* ------------------------------------------------------------------ */

const MAX_BATCH = 30;

export async function fetchQuotes({ symbols }) {
  if (!Array.isArray(symbols) || symbols.length === 0) {
    throw new HttpError(400, 'symbols is required and must be a non-empty array.');
  }
  if (symbols.length > MAX_BATCH) {
    throw new HttpError(400, `Max ${MAX_BATCH} symbols per request.`);
  }

  const resolved = symbols.map((s) => {
    const yahooSymbol = toYahoo(s);
    if (!yahooSymbol) throw new HttpError(404, `Symbol "${s}" not in catalog.`);
    return { internal: s, yahoo: yahooSymbol };
  });

  const quotes = await Promise.all(
    resolved.map(async ({ internal, yahoo }) => {
      try {
        const q = await providerGetQuote(yahoo);
        return { symbol: internal, yahooSymbol: yahoo, ...q, error: null };
      } catch (err) {
        return { symbol: internal, yahooSymbol: yahoo, error: err.message };
      }
    })
  );

  return { quotes };
}