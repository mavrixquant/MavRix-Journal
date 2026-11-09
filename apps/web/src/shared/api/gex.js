import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiJson } from './client.js';
import { useSSEFallback } from './sse.js';
import { useEffect } from 'react';
import { DEFAULT_GEX_SYMBOL, GEX_SYMBOLS } from '@mavrix/shared';


export const gexKeys = {
  all: ['gex'],
  days: (symbol) => ['gex', 'days', symbol],
  day: (date, symbol) => ['gex', 'day', date, symbol],
  adminDays: (symbol) => ['gex', 'admin', 'days', symbol],
};


// ---------------------------------------------------------------------------
// User fetchers — symbol-aware, symbol optional (defaults to NQ server-side).
// ---------------------------------------------------------------------------

function withSymbol(symbol) {
  const params = new URLSearchParams();
  if (symbol) params.set('symbol', symbol);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function getGexDays(symbol) {
  const data = await apiJson(`/api/gex${withSymbol(symbol)}`);
  return data.days;
}

export async function getGexDay(date, symbol) {
  const data = await apiJson(
    `/api/gex/${encodeURIComponent(date)}${withSymbol(symbol)}`
  );
  return data.day;
}


// ---------------------------------------------------------------------------
// Admin fetchers / mutations.
// ---------------------------------------------------------------------------

export async function getAdminGexDays(symbol) {
  const data = await apiJson(`/api/admin/gex${withSymbol(symbol)}`);
  return data.days;
}

export async function upsertAdminGex({
  date,
  symbol,
  levels,
  converted,
  sourceTimezone,
  overwrite = false,
}) {
  const qs = overwrite ? '?overwrite=true' : '';
  const data = await apiJson(`/api/admin/gex${qs}`, {
    method: 'POST',
    body: JSON.stringify({ date, symbol, levels, converted, sourceTimezone }),
  });
  return data.day;
}

export async function deleteAdminGex(date, symbol) {
  return apiJson(
    `/api/admin/gex/${encodeURIComponent(date)}${withSymbol(symbol)}`,
    { method: 'DELETE' }
  );
}


const FIVE_MIN = 5 * 60_000;
const THIRTY_SEC = 30_000;

export function useGexDays(symbol = DEFAULT_GEX_SYMBOL) {
  const sseFallback = useSSEFallback();
  return useQuery({
    queryKey: gexKeys.days(symbol),
    queryFn: () => getGexDays(symbol),
    enabled: !!symbol,
    staleTime: FIVE_MIN,
    refetchInterval: sseFallback ? 60_000 : false,
  });
}

export function useGexDay(date, symbol = DEFAULT_GEX_SYMBOL) {
  return useQuery({
    queryKey: gexKeys.day(date, symbol),
    queryFn: () => getGexDay(date, symbol),
    enabled: !!date && !!symbol,
    staleTime: FIVE_MIN,
  });
}


// ---------------------------------------------------------------------------
// Prefetch warm-up.
//
// Called once from GexPage on mount. Silently warms the day list AND the
// newest day's detail for every GEX symbol. This makes switching between NQ
// and ES instant — no sequential blank-state fetch -> date-effect -> fetch
// round-trip that previously caused the visible lag.
//
// Idempotent: respects staleTime (5 min), so re-running within the same
// session is a no-op for any symbol already warm.
// ---------------------------------------------------------------------------
export function useGexPrefetch() {
  const qc = useQueryClient();

  useEffect(() => {
    let cancelled = false;

    (async () => {
      for (const sym of GEX_SYMBOLS) {
        if (cancelled) return;

        try {
          // 1. Warm the day list (no-op if fresh).
          await qc.prefetchQuery({
            queryKey: gexKeys.days(sym),
            queryFn: () => getGexDays(sym),
            staleTime: FIVE_MIN,
          });

          if (cancelled) return;

          // 2. Prefetch the newest day's detail — the exact date the page
          //    auto-selects the moment the user switches to this symbol.
          const days = qc.getQueryData(gexKeys.days(sym));
          if (!Array.isArray(days) || days.length === 0) continue;

          qc.prefetchQuery({
            queryKey: gexKeys.day(days[0].date, sym),
            queryFn: () => getGexDay(days[0].date, sym),
            staleTime: FIVE_MIN,
          });
        } catch {
          // Silent — a prefetch failure must never affect the page.
        }
      }
    })();

    return () => { cancelled = true; };
  }, [qc]);
}


export function useAdminGexDays(symbol = DEFAULT_GEX_SYMBOL) {
  return useQuery({
    queryKey: gexKeys.adminDays(symbol),
    queryFn: () => getAdminGexDays(symbol),
    enabled: !!symbol,
    staleTime: THIRTY_SEC,
  });
}

export function useAdminUpsertGex() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: upsertAdminGex,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gexKeys.all });
    },
  });
}

export function useAdminDeleteGex() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ date, symbol }) => deleteAdminGex(date, symbol),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gexKeys.all });
    },
  });
}