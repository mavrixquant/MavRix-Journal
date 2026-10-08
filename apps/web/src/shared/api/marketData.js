// apps/web/src/shared/api/marketData.js
//
// React Query hooks + raw fetchers for the market data API
// (Yahoo Finance proxy, see apps/api/src/routes/marketData.routes.js).
//
// Both endpoints are auth-gated. apiJson() injects the Bearer token
// and handles 401 → silent refresh → retry.

import { useQuery } from '@tanstack/react-query';
import { apiJson } from './client';

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

export const marketDataKeys = {
  all: ['market-data'],
  catalog: () => ['market-data', 'catalog'],
  bars: (symbol, interval, range) => [
    'market-data',
    'bars',
    symbol,
    interval,
    range || 'default',
  ],
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
  const data = await apiJson(`/api/market-data/bars?${params.toString()}`);
  return data; // { symbol, yahooSymbol, interval, range, count, bars }
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

const ONE_HOUR = 60 * 60 * 1000;

/**
 * Symbol catalog + supported intervals. Fetched once per session.
 * Server is the source of truth — adding a symbol in
 * apps/api/src/lib/marketData/symbolMap.js makes it appear here.
 */
export function useMarketCatalog() {
  return useQuery({
    queryKey: marketDataKeys.catalog(),
    queryFn: getCatalog,
    staleTime: ONE_HOUR,
    gcTime: ONE_HOUR * 2,
  });
}

/**
 * OHLCV bars for one symbol + interval.
 *
 * placeholderData keeps the previous symbol's candles on screen while the
 * new request is in flight — avoids a white flash when switching symbols.
 *
 * staleTime is short (30s) because Yahoo's feed updates on its own cadence
 * and the API already caches server-side (60s for 1m, 5min for 5m, etc.).
 */
export function useMarketBars({ symbol, interval, range, enabled = true }) {
  return useQuery({
    queryKey: marketDataKeys.bars(symbol, interval, range),
    queryFn: () => getBars({ symbol, interval, range }),
    enabled: enabled && !!symbol && !!interval,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    retry: (failureCount, error) => {
      // Don't retry 4xx — the response won't change.
      const status = error?.status;
      if (status && status >= 400 && status < 500) return false;
      return failureCount < 2;
    },
  });
}