import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { getBars as getBarsDB, refreshTail } from './marketBars.service.js';
import { resolveSymbol, SYMBOL_CATALOG, SUPPORTED_INTERVALS } from '../lib/marketData/index.js';
import { getQuote as getYahooQuote } from '../lib/marketData/yahooProvider.js';
import { getQuote as getBiquoteQuote } from '../lib/marketData/biquoteProvider.js';

function pickQuoteFn(provider) {
  return provider === 'biquote' ? getBiquoteQuote : getYahooQuote;
}

export async function listCatalog() {
  // Authoritative source of "has data" is market_bars (real OHLC rows),
  // NOT market_bar_coverage (derived cache that can drift or hold stale rows).
  // groupBy uses the (symbol, interval, time) index -> fast even on millions of rows.
  const rows = await prisma.marketBar.groupBy({
    by: ['symbol'],
  });
  const coveredSet = new Set(rows.map((r) => r.symbol));

  return {
    symbols: SYMBOL_CATALOG.map((s) => ({
      ...s,
      hasData: coveredSet.has(s.code),
    })),
    intervals: SUPPORTED_INTERVALS,
  };
}

// Bars are ALWAYS served via marketBars.service (DB-first).
export async function fetchBars(opts) {
  if (!opts?.symbol) throw new HttpError(400, 'symbol is required');
  if (!opts?.interval) throw new HttpError(400, 'interval is required');
  if (!SUPPORTED_INTERVALS.includes(opts.interval)) {
    throw new HttpError(
      400,
      `Unsupported interval "${opts.interval}". Allowed: ${SUPPORTED_INTERVALS.join(', ')}`,
    );
  }

  const result = await getBarsDB(opts);

  // Fire-and-forget tail refresh ONLY when DB has data for this pair. Empty
  // ranges stay empty (the UI shows "Coming Soon"). The refresh itself is
  // rate-limited + backoff-aware + lock-protected inside the service.
  if (result?.hasData) {
    void refreshTail(result.symbol, result.interval).catch(() => {});
  }

  return result;
}

export async function fetchQuote({ symbol }) {
  if (!symbol) throw new HttpError(400, 'symbol is required');
  const resolved = resolveSymbol(symbol);
  if (!resolved) throw new HttpError(404, `Symbol "${symbol}" not in catalog.`);
  const quoteFn = pickQuoteFn(resolved.provider);
  const quote = await quoteFn(resolved.providerSymbol);
  return { ...quote, symbol: symbol.toUpperCase(), provider: resolved.provider };
}

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
        const q = await pickQuoteFn(resolved.provider)(resolved.providerSymbol);
        return { ...q, symbol: s.toUpperCase(), provider: resolved.provider, error: null };
      } catch (err) {
        return { symbol: s.toUpperCase(), error: err.message };
      }
    }),
  );

  return { quotes };
}