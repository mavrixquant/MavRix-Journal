import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiJson } from './client';
import { useSSEFallback } from '@/shared/api/sse';

export const backtestKeys = {
  all: ['backtest-sessions'],
  list: (filters) => ['backtest-sessions', 'list', filters || {}],
  detail: (id) => ['backtest-sessions', 'detail', id],
  trades: (id) => ['backtest-sessions', 'trades', id],
  availability: () => ['backtest-sessions', 'availability'],
};

const enc = encodeURIComponent;

/* ── fetchers ───────────────────────────────────────────────────────── */

export async function getBacktestSessions({ status } = {}) {
  const qs = status ? `?status=${enc(status)}` : '';
  return (await apiJson(`/api/backtest-sessions${qs}`)).sessions;
}
export async function getBacktestAvailability() {
  return (await apiJson('/api/backtest-sessions/availability')).availability;
}
export async function getBacktestSession(id) {
  return (await apiJson(`/api/backtest-sessions/${enc(id)}`)).session;
}
export async function createBacktestSession(payload) {
  return (await apiJson('/api/backtest-sessions', { method: 'POST', body: JSON.stringify(payload) })).session;
}
export async function updateBacktestSession(id, patch) {
  return (await apiJson(`/api/backtest-sessions/${enc(id)}`, {
    method: 'PATCH', body: JSON.stringify(patch),
  })).session;
}
export const deleteBacktestSession = (id) =>
  apiJson(`/api/backtest-sessions/${enc(id)}`, { method: 'DELETE' });

export async function getBacktestTrades(sessionId) {
  return (await apiJson(`/api/backtest-sessions/${enc(sessionId)}/trades`)).trades;
}
export async function createBacktestTrade(sessionId, payload) {
  return (await apiJson(`/api/backtest-sessions/${enc(sessionId)}/trades`, {
    method: 'POST', body: JSON.stringify(payload),
  })).trade;
}
export async function updateBacktestTrade(sessionId, tradeId, patch) {
  return (await apiJson(`/api/backtest-sessions/${enc(sessionId)}/trades/${enc(tradeId)}`, {
    method: 'PATCH', body: JSON.stringify(patch),
  })).trade;
}
export const deleteBacktestTrade = (sessionId, tradeId) =>
  apiJson(`/api/backtest-sessions/${enc(sessionId)}/trades/${enc(tradeId)}`, { method: 'DELETE' });

/* ── queries ────────────────────────────────────────────────────────── */

export function useBacktestSessions({ status, enabled = true } = {}) {
  const sseFallback = useSSEFallback();
  const filters = status ? { status } : {};
  return useQuery({
    queryKey: backtestKeys.list(filters),
    queryFn: () => getBacktestSessions({ status }),
    enabled,
    staleTime: 15_000,
    placeholderData: keepPreviousData,
    refetchInterval: sseFallback ? 30_000 : false,
  });
}

/** Which (symbol, interval) pairs have bars ready to replay, and for which dates. */
export function useBacktestAvailability({ enabled = true } = {}) {
  return useQuery({
    queryKey: backtestKeys.availability(),
    queryFn: getBacktestAvailability,
    enabled,
    staleTime: 60_000,
  });
}

export function useBacktestSession(id, { fresh = false } = {}) {
  const sseFallback = useSSEFallback();
  return useQuery({
    queryKey: backtestKeys.detail(id),
    queryFn: () => getBacktestSession(id),
    enabled: !!id,
    staleTime: fresh ? 0 : 15_000,
    refetchOnMount: fresh ? 'always' : true,
    refetchInterval: sseFallback ? 30_000 : false,
  });
}

/**
 * `fresh: true` is used by the dashboard: every number there is recomputed
 * from rows that were just loaded from the server, never from a stale cache.
 */
export function useBacktestTrades(sessionId, { fresh = false } = {}) {
  const sseFallback = useSSEFallback();
  return useQuery({
    queryKey: backtestKeys.trades(sessionId),
    queryFn: () => getBacktestTrades(sessionId),
    enabled: !!sessionId,
    staleTime: fresh ? 0 : 15_000,
    refetchOnMount: fresh ? 'always' : true,
    refetchInterval: sseFallback ? 20_000 : false,
  });
}

/* ── mutations ──────────────────────────────────────────────────────── */

export function useCreateBacktestSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createBacktestSession,
    onSuccess: () => qc.invalidateQueries({ queryKey: backtestKeys.all }),
  });
}

export function useUpdateBacktestSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }) => updateBacktestSession(id, patch),
    onSuccess: (session) => {
      if (session?.id) qc.setQueryData(backtestKeys.detail(session.id), session);
      qc.invalidateQueries({ queryKey: ['backtest-sessions', 'list'] });
    },
  });
}

export function useDeleteBacktestSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deleteBacktestSession,
    onSuccess: () => qc.invalidateQueries({ queryKey: backtestKeys.all }),
  });
}

function upsertTrade(list, trade) {
  const arr = Array.isArray(list) ? list : [];
  const i = arr.findIndex((t) => t.tradeId === trade.tradeId);
  if (i === -1) return [...arr, trade];
  const next = arr.slice();
  next[i] = trade;
  return next;
}

/** Trade mutations write the server's answer straight into the cache so the
 *  replay never waits on a refetch, then refresh the session aggregates. */
export function useCreateBacktestTrade(sessionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => createBacktestTrade(sessionId, payload),
    onSuccess: (trade) => {
      qc.setQueryData(backtestKeys.trades(sessionId), (old) => upsertTrade(old, trade));
      qc.invalidateQueries({ queryKey: backtestKeys.detail(sessionId) });
    },
  });
}

export function useUpdateBacktestTrade(sessionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tradeId, patch }) => updateBacktestTrade(sessionId, tradeId, patch),
    onSuccess: (trade) => {
      qc.setQueryData(backtestKeys.trades(sessionId), (old) => upsertTrade(old, trade));
      qc.invalidateQueries({ queryKey: backtestKeys.detail(sessionId) });
    },
  });
}

export function useDeleteBacktestTrade(sessionId) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tradeId) => deleteBacktestTrade(sessionId, tradeId),
    onSuccess: (_res, tradeId) => {
      qc.setQueryData(backtestKeys.trades(sessionId), (old) =>
        (Array.isArray(old) ? old : []).filter((t) => t.tradeId !== tradeId));
      qc.invalidateQueries({ queryKey: backtestKeys.detail(sessionId) });
    },
  });
}
