// apps/api/src/services/marketData.service.js
//
// Thin business-logic layer. Validates input, delegates to the provider,
// shapes the response. The controller stays HTTP-only.

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
  return {
    symbols: SYMBOL_CATALOG,
    intervals: SUPPORTED_INTERVALS,
  };
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
    throw new HttpError(
      400,
      `Unsupported interval "${interval}". Allowed: ${SUPPORTED_INTERVALS.join(', ')}`
    );
  }

  if (range && !VALID_RANGES.has(range)) {
    throw new HttpError(400, `Unsupported range "${range}"`);
  }

  const yahooSymbol = toYahoo(symbol);
  if (!yahooSymbol) {
    throw new HttpError(
      404,
      `Symbol "${symbol}" is not in the market data catalog.`
    );
  }

  const bars = await providerGetBars(yahooSymbol, interval, range);

  return {
    symbol,
    yahooSymbol,
    interval,
    range: range || null,
    count: bars.length,
    bars,
  };
}

/* ------------------------------------------------------------------ */
/*  Quote                                                             */
/* ------------------------------------------------------------------ */

export async function fetchQuote({ symbol }) {
  if (!symbol) throw new HttpError(400, 'symbol is required');

  const yahooSymbol = toYahoo(symbol);
  if (!yahooSymbol) {
    throw new HttpError(
      404,
      `Symbol "${symbol}" is not in the market data catalog.`
    );
  }

  const quote = await providerGetQuote(yahooSymbol);
  return { symbol, yahooSymbol, ...quote };
}