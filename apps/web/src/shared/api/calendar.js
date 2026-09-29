// apps/web/src/shared/api/calendar.js
//
// Economic Calendar API client + React Query hooks.
//
// Backend contract:
//   GET  /api/calendar?from=&to=&currency=&impact=&limit=
//        → { events: [...] }
//   GET  /api/calendar/currencies
//        → { currencies: [{ currency, count, firstEventAt, lastEventAt }] }
//   GET  /api/calendar/meta
//        → { totalEvents, earliestEventAt, latestEventAt }
//   POST /api/calendar/sync
//        → { ok, chunks, fetched, created, updated, pruned, elapsedMs }
//
// The background sync on the API updates the DB every 60s. When a sync
// materially changes anything (actual/forecast/previous), the API broadcasts
// an SSE `invalidate` with [['calendar']] to every connected client. The
// bridge in shared/api/sse.js already routes that to queryClient.invalidateQueries,
// so any active calendar query refreshes without polling.

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiJson } from './client';
import { useSSEFallback } from './sse';

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

// All calendar queries share the ['calendar', ...] prefix so a single
// invalidate(['calendar']) broadcast refreshes events, currencies, and meta
// in one shot.
export const calendarKeys = {
  all: ['calendar'],
  events: (filters) => ['calendar', 'events', filters],
  currencies: () => ['calendar', 'currencies'],
  meta: () => ['calendar', 'meta'],
};

/* ------------------------------------------------------------------ */
/*  Raw API calls                                                      */
/* ------------------------------------------------------------------ */

function buildEventsQuery({ from, to, currencies = [], impacts = [], limit }) {
  const params = new URLSearchParams();
  params.set('from', from);
  params.set('to', to);
  if (currencies.length > 0) params.set('currency', currencies.join(','));
  if (impacts.length > 0) params.set('impact', impacts.join(','));
  if (limit) params.set('limit', String(limit));
  return params.toString();
}

export async function getCalendarEvents({ from, to, currencies, impacts, limit }) {
  const qs = buildEventsQuery({ from, to, currencies, impacts, limit });
  const data = await apiJson(`/api/calendar?${qs}`);
  return data.events;
}

export async function getCalendarCurrencies() {
  const data = await apiJson('/api/calendar/currencies');
  return data.currencies;
}

export async function getCalendarMeta() {
  return apiJson('/api/calendar/meta');
}

export async function triggerCalendarSync() {
  return apiJson('/api/calendar/sync', { method: 'POST' });
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

const FIVE_MIN = 5 * 60_000;
const THIRTY_MIN = 30 * 60_000;

/**
 * Calendar events for a date range, with optional currency/impact filters.
 *
 * Pass `enabled: false` (or omit from/to) to skip the request — used when
 * the calendar page is mounted but the filter state isn't ready yet.
 */
export function useCalendarEvents(
  { from, to, currencies = [], impacts = [], limit } = {},
  { enabled = true } = {}
) {
  const sseFallback = useSSEFallback();

  // When the SSE bridge has given up (3 failed reconnects), poll every 60s
  // as a safety net. Otherwise rely on SSE invalidation from the sync loop.
  const refetchInterval = sseFallback ? 60_000 : false;

  // Stable key from the filter values. Sort currencies/impacts so
  // [USD, EUR] and [EUR, USD] hit the same cache entry.
  const filterKey = {
    from: from || '',
    to: to || '',
    currencies: [...currencies].sort(),
    impacts: [...impacts].sort(),
    limit: limit || null,
  };

  return useQuery({
    queryKey: calendarKeys.events(filterKey),
    queryFn: () =>
      getCalendarEvents({ from, to, currencies, impacts, limit }),
    enabled: enabled && !!from && !!to,
    staleTime: FIVE_MIN,
    refetchInterval,
    placeholderData: (prev) => prev, // keep old data while filters change
  });
}

/**
 * Distinct currencies present in the cache, with event counts.
 * Used to populate the currency filter dropdown.
 */
export function useCalendarCurrencies({ enabled = true } = {}) {
  return useQuery({
    queryKey: calendarKeys.currencies(),
    queryFn: getCalendarCurrencies,
    enabled,
    staleTime: THIRTY_MIN,
  });
}

/**
 * Lightweight header metadata: total events, date span.
 */
export function useCalendarMeta({ enabled = true } = {}) {
  return useQuery({
    queryKey: calendarKeys.meta(),
    queryFn: getCalendarMeta,
    enabled,
    staleTime: FIVE_MIN,
  });
}

/**
 * Manually trigger a sync on the API. Useful as a "Sync now" button.
 * On success, invalidates the whole calendar key prefix so events,
 * currencies, and meta all refresh in one shot.
 */
export function useSyncCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: triggerCalendarSync,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: calendarKeys.all });
    },
  });
}