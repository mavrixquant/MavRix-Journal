// apps/web/src/shared/api/gex.js
//
// React Query hooks + raw fetchers for GEX day data.
//
// Two surfaces:
//   User  → useGexDays(), useGexDay(date)
//   Admin → useAdminGexDays(), useAdminUpsertGex(), useAdminDeleteGex()
//
// SSE invalidation:
//   The API does NOT broadcast on GEX mutations today (mutations are rare
//   and admin-scoped). Instead we lean on React Query's staleTime plus the
//   `useSSEFallback` polling safety net — same pattern used by accounts.js
//   and trades.js.
//
// Overwrite flow:
//   POST /api/admin/gex returns 409 when the date already exists.
//   The mutation throws an Error with `.status === 409` and
//   `.body.details.existing` populated. Callers catch that, show a
//   confirmation, then re-call with `{ overwrite: true }`.

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiJson } from './client.js';
import { useSSEFallback } from './sse.js';

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

// All GEX queries share the ['gex', ...] prefix so a single
// invalidateQueries({ queryKey: ['gex'] }) refreshes everything.
export const gexKeys = {
  all: ['gex'],
  days: () => ['gex', 'days'],
  day: (date) => ['gex', 'day', date],
  adminDays: () => ['gex', 'admin', 'days'],
};

/* ------------------------------------------------------------------ */
/*  Raw fetchers                                                       */
/* ------------------------------------------------------------------ */

/* ---------------- User ---------------- */

export async function getGexDays() {
  const data = await apiJson('/api/gex');
  return data.days;
}

export async function getGexDay(date) {
  const data = await apiJson(`/api/gex/${encodeURIComponent(date)}`);
  return data.day;
}

/* ---------------- Admin ---------------- */

export async function getAdminGexDays() {
  const data = await apiJson('/api/admin/gex');
  return data.days;
}

/**
 * Upsert a day's levels.
 *
 * @param {object}  payload
 * @param {string}  payload.date             — "YYYY-MM-DD"
 * @param {Array}   payload.levels           — [{ type, price, label }]
 * @param {string}  payload.converted        — pipe-string
 * @param {string}  [payload.sourceTimezone] — e.g. "Asia/Kolkata"
 * @param {boolean} [payload.overwrite]      — when true, bypasses the 409
 *
 * @throws {Error} when the server rejects. `.status === 409` means the
 *                 date exists and the caller must confirm overwrite.
 *                 `.body.details.existing` carries the current metadata.
 */
export async function upsertAdminGex({
  date,
  levels,
  converted,
  sourceTimezone,
  overwrite = false,
}) {
  const qs = overwrite ? '?overwrite=true' : '';
  const data = await apiJson(`/api/admin/gex${qs}`, {
    method: 'POST',
    body: JSON.stringify({ date, levels, converted, sourceTimezone }),
  });
  return data.day;
}

export async function deleteAdminGex(date) {
  return apiJson(`/api/admin/gex/${encodeURIComponent(date)}`, {
    method: 'DELETE',
  });
}

/* ------------------------------------------------------------------ */
/*  Hooks — User                                                       */
/* ------------------------------------------------------------------ */

const FIVE_MIN = 5 * 60_000;
const THIRTY_SEC = 30_000;

/**
 * List of uploaded GEX days (metadata only, newest first).
 * Polls every 60s ONLY if SSE has fallen back.
 */
export function useGexDays() {
  const sseFallback = useSSEFallback();
  return useQuery({
    queryKey: gexKeys.days(),
    queryFn: getGexDays,
    staleTime: FIVE_MIN,
    refetchInterval: sseFallback ? 60_000 : false,
  });
}

/**
 * Full payload for one date — levels + converted string.
 * Pass `null` / `undefined` to disable (e.g. nothing selected yet).
 */
export function useGexDay(date) {
  return useQuery({
    queryKey: gexKeys.day(date),
    queryFn: () => getGexDay(date),
    enabled: !!date,
    staleTime: FIVE_MIN,
  });
}

/* ------------------------------------------------------------------ */
/*  Hooks — Admin                                                      */
/* ------------------------------------------------------------------ */

/**
 * Admin list — same shape as the user list, plus `uploadedBy`.
 * Shorter staleTime so a freshly-upserted day shows up immediately.
 */
export function useAdminGexDays() {
  return useQuery({
    queryKey: gexKeys.adminDays(),
    queryFn: getAdminGexDays,
    staleTime: THIRTY_SEC,
  });
}

/**
 * Upsert mutation.
 * Invalidates the whole ['gex'] subtree so both user and admin lists refresh.
 */
export function useAdminUpsertGex() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: upsertAdminGex,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gexKeys.all });
    },
  });
}

/**
 * Delete mutation — superadmin only on the server side.
 */
export function useAdminDeleteGex() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (date) => deleteAdminGex(date),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gexKeys.all });
    },
  });
}