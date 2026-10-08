// apps/web/src/shared/api/marketData.js
//
// React Query hooks for the market data API.

import { useQuery } from '@tanstack/react-query';
import { apiJson } from './client';

export const marketDataKeys = {
  all: ['market-data'],
  catalog: () => ['market-data', 'catalog'],
  bars: (symbol, interval, range) => ['market-data', 'bars', symbol, interval, range || 'default'],
  quote: (symbol) => ['market-data', 'quote', symbol],
  quotes: (symbolsKey) => ['market-data', 'quotes', symbolsKey],
};

/* ------------------------------------------------------------------ */
/*  Raw fetchers                                                       */
/* ------------------------------------------------------------------ */

export async function getCatalog() {
  return apiJson('/api/market-data/catalog');
}

export async function getBars({ symbol, interval, range }) {
  const params = new URLSearchParams({ symbol, interval });
  if (range) params.set('range', range);
  return apiJson(`/api/market-data/bars?${params.toString()}`);
}

export async function getQuote(symbol) {
  return apiJson(`/api/market-data/quote?symbol=${encodeURIComponent(symbol)}`);
}

export async function getQuotes(symbols) {
  const params = new URLSearchParams({ symbols: symbols.join(',') });
  return apiJson(`/api/market-data/quotes?${params.toString()}`);
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

const ONE_HOUR = 60 * 60 * 1000;

export function useMarketCatalog() {
  return useQuery({
    queryKey: marketDataKeys.catalog(),
    queryFn: getCatalog,
    staleTime: ONE_HOUR,
    gcTime: ONE_HOUR * 2,
  });
}

export function useMarketBars({ symbol, interval, range, enabled = true }) {
  return useQuery({
    queryKey: marketDataKeys.bars(symbol, interval, range),
    queryFn: () => getBars({ symbol, interval, range }),
    enabled: enabled && !!symbol && !!interval,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    retry: (n, err) => (err?.status >= 400 && err?.status < 500 ? false : n < 2),
  });
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