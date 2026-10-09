// apps/web/src/shared/api/strategies.js
//
// React Query hooks + raw fetchers for Strategy CRUD + strategy-scoped
// trade lists. Mirrors the shape of accounts.js / trades.js.

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiJson } from './client';
import { useSSEFallback } from '@/shared/api/sse';

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

export const strategiesKeys = {
  all: ['strategies'],
  list: (filters) => ['strategies', 'list', filters || {}],
  detail: (id) => ['strategies', 'detail', id],
  trades: (strategyId) => ['strategies', 'trades', strategyId],
};

/* ------------------------------------------------------------------ */
/*  Raw fetchers                                                       */
/* ------------------------------------------------------------------ */

export async function getStrategies({ status } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  const qs = params.toString();
  const data = await apiJson(`/api/strategies${qs ? `?${qs}` : ''}`);
  return data.strategies;
}

export async function getStrategy(id) {
  const data = await apiJson(`/api/strategies/${encodeURIComponent(id)}`);
  return data.strategy;
}

export async function createStrategy(payload) {
  const data = await apiJson('/api/strategies', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.strategy;
}

export async function updateStrategy(id, patch) {
  const data = await apiJson(`/api/strategies/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return data.strategy;
}

export async function archiveStrategy(id) {
  const data = await apiJson(`/api/strategies/${encodeURIComponent(id)}/archive`, {
    method: 'POST',
  });
  return data.strategy;
}

export async function deleteStrategy(id) {
  return apiJson(`/api/strategies/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

/**
 * Fetch every trade (across all accounts of the current user) tagged with
 * this strategy. Backed by /api/trades?strategyId=… which is scoped to
 * the requesting user on the server.
 */
export async function getStrategyTrades(strategyId) {
  const data = await apiJson(
    `/api/trades?strategyId=${encodeURIComponent(strategyId)}`
  );
  return data.trades;
}

/* ------------------------------------------------------------------ */
/*  Hooks — reads                                                      */
/* ------------------------------------------------------------------ */

/**
 * List the current user's strategies.
 *
 * Polls every 60s ONLY when the SSE bridge has fallen back. Otherwise
 * relies on the SSE invalidation broadcast sent by strategy mutations
 * (see strategies.service.js → notify).
 */
export function useStrategies({ status, enabled = true } = {}) {
  const sseFallback = useSSEFallback();
  const filters = status ? { status } : {};

  return useQuery({
    queryKey: strategiesKeys.list(filters),
    queryFn: () => getStrategies({ status }),
    enabled,
    staleTime: 30_000,
    refetchInterval: sseFallback ? 60_000 : false,
  });
}

export function useStrategy(id) {
  return useQuery({
    queryKey: strategiesKeys.detail(id),
    queryFn: () => getStrategy(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useStrategyTrades(strategyId) {
  const sseFallback = useSSEFallback();
  return useQuery({
    queryKey: strategiesKeys.trades(strategyId),
    queryFn: () => getStrategyTrades(strategyId),
    enabled: !!strategyId,
    staleTime: 15_000,
    refetchInterval: sseFallback ? 30_000 : false,
  });
}

/* ------------------------------------------------------------------ */
/*  Hooks — mutations                                                  */
/* ------------------------------------------------------------------ */

function useInvalidateStrategies() {
  const qc = useQueryClient();
  return (id) => {
    qc.invalidateQueries({ queryKey: strategiesKeys.all });
    if (id) qc.invalidateQueries({ queryKey: strategiesKeys.detail(id) });
    // Trades embed a strategy snapshot — refresh them too.
    qc.invalidateQueries({ queryKey: ['trades'] });
  };
}

export function useCreateStrategy() {
  const invalidate = useInvalidateStrategies();
  return useMutation({
    mutationFn: createStrategy,
    onSuccess: (created) => invalidate(created?.id),
  });
}

export function useUpdateStrategy() {
  const invalidate = useInvalidateStrategies();
  return useMutation({
    mutationFn: ({ id, patch }) => updateStrategy(id, patch),
    onSuccess: (_res, vars) => invalidate(vars.id),
  });
}

export function useArchiveStrategy() {
  const invalidate = useInvalidateStrategies();
  return useMutation({
    mutationFn: (id) => archiveStrategy(id),
    onSuccess: (_res, id) => invalidate(id),
  });
}

export function useDeleteStrategy() {
  const invalidate = useInvalidateStrategies();
  return useMutation({
    mutationFn: (id) => deleteStrategy(id),
    onSuccess: (_res, id) => invalidate(id),
  });
}