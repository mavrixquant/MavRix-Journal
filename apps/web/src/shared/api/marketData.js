import {
  useQuery,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { apiJson } from './client';

export const marketDataKeys = {
  all: ['market-data'],
  catalog: () => ['market-data', 'catalog'],
  bars: (symbol, interval, from, to) =>
    ['market-data', 'bars', symbol, interval, from || '', to || ''],
  quote: (symbol) => ['market-data', 'quote', symbol],
  quotes: (symbolsKey) => ['market-data', 'quotes', symbolsKey],
};

export async function getCatalog() {
  return apiJson('/api/market-data/catalog');
}

export async function getBars({
  symbol,
  interval,
  from,
  to,
  before,
  after,
  limit,
}) {
  const params = new URLSearchParams();
  params.set('symbol', symbol);
  params.set('interval', interval);
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (before) params.set('before', before);
  if (after) params.set('after', after);
  if (limit) params.set('limit', String(limit));
  return apiJson(`/api/market-data/bars?${params.toString()}`);
}

export async function getQuote(symbol) {
  return apiJson(`/api/market-data/quote?symbol=${encodeURIComponent(symbol)}`);
}

export async function getQuotes(symbols) {
  const params = new URLSearchParams({ symbols: symbols.join(',') });
  return apiJson(`/api/market-data/quotes?${params.toString()}`);
}

const ONE_HOUR = 60 * 60 * 1000;
const PAGE_SIZE = 1000;

export function useMarketCatalog() {
  return useQuery({
    queryKey: marketDataKeys.catalog(),
    queryFn: getCatalog,
    staleTime: ONE_HOUR,
    gcTime: ONE_HOUR * 2,
  });
}

// ---------------------------------------------------------------------------
// DB-first infinite bars query.
//
// Two modes:
//   • Explicit range (from && to set) — page forward via `after`, user
//     browses the range chronologically.
//   • Default — page backward via `before`, live-edge chart like TradingView.
// ---------------------------------------------------------------------------
export function useMarketBars({ symbol, interval, from, to, enabled = true }) {
  const isExplicitRange = !!(from && to);

  return useInfiniteQuery({
    queryKey: marketDataKeys.bars(symbol, interval, from, to),
    queryFn: ({ pageParam }) => {
      const params = { symbol, interval, limit: PAGE_SIZE };
      if (isExplicitRange) {
        params.from = from;
        params.to = to;
        if (pageParam) params.after = pageParam;
      } else {
        if (pageParam) params.before = pageParam;
      }
      return getBars(params);
    },
    initialPageParam: null,
    getNextPageParam: (last) => {
      if (!last) return undefined;
      const lastBar = last.bars[last.bars.length - 1];
      const firstBar = last.bars[0];
      if (!lastBar || !firstBar) return undefined;

      if (isExplicitRange) {
        if (!last.hasMoreNewer) return undefined;
        return toIsoSec(lastBar.time);
      }
      if (!last.hasMoreOlder) return undefined;
      return toIsoSec(firstBar.time);
    },
    enabled: enabled && !!symbol && !!interval,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    refetchInterval: (data) => {
      // Poll while the server is still filling in the background.
      const firstPage = data?.pages?.[0];
      if (firstPage?.filling) return 2000;
      return false;
    },
    retry: (n, err) => (err?.status >= 400 && err?.status < 500 ? false : n < 2),
  });
}

function toIsoSec(time) {
  if (typeof time === 'string') return `${time}T00:00:00.000Z`;
  return new Date(time * 1000).toISOString();
}

export function useMarketQuote(symbol, { enabled = true } = {}) {
  return useQuery({
    queryKey: marketDataKeys.quote(symbol),
    queryFn: () => getQuote(symbol),
    enabled: enabled && !!symbol,
    staleTime: 20_000,
    refetchInterval: 30_000,
    retry: (n, err) => (err?.status >= 400 && err?.status < 500 ? false : n < 2),
  });
}

export function useMarketQuotes(symbols, { enabled = true } = {}) {
  const key = [...symbols].sort().join(',');
  return useQuery({
    queryKey: marketDataKeys.quotes(key),
    queryFn: () => getQuotes(symbols),
    enabled: enabled && symbols.length > 0,
    staleTime: 20_000,
    refetchInterval: 45_000,
    retry: (n, err) => (err?.status >= 400 && err?.status < 500 ? false : n < 2),
  });
}
