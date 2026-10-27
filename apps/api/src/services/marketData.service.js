import { HttpError } from '../middleware/error.js';
import { getBars as getBarsDB, refreshTail } from './marketBars.service.js';
import { resolveSymbol, SYMBOL_CATALOG, SUPPORTED_INTERVALS } from '../lib/marketData/index.js';
import { getQuote as getYahooQuote } from '../lib/marketData/yahooProvider.js';
import { getQuote as getBiquoteQuote } from '../lib/marketData/biquoteProvider.js';

function pickQuoteFn(provider) {
  return provider === 'biquote' ? getBiquoteQuote : getYahooQuote;
}

export function listCatalog() {
  return { symbols: SYMBOL_CATALOG, intervals: SUPPORTED_INTERVALS };
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
  return { symbol: symbol.toUpperCase(), provider: resolved.provider, ...quote };
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
        return { symbol: s.toUpperCase(), provider: resolved.provider, ...q, error: null };
      } catch (err) {
        return { symbol: s.toUpperCase(), error: err.message };
      }
    }),
  );

  return { quotes };
}