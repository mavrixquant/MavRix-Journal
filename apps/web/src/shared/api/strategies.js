import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { apiJson } from './client';
import { useSSEFallback } from '@/shared/api/sse';

export const strategiesKeys = {
  all: ['strategies'],
  list: (filters) => ['strategies', 'list', filters || {}],
  detail: (id) => ['strategies', 'detail', id],
  overview: (filters) => ['strategies', 'overview', filters || {}],
  performance: (id, filters) => ['strategies', 'performance', id, filters || {}],
  trades: (strategyId) => ['strategies', 'trades', strategyId],
};

const qs = (obj = {}) => {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'all') p.set(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : '';
};

/* ── fetchers ─────────────────────────────────────────── */

export async function getStrategies({ status } = {}) {
  return (await apiJson(`/api/strategies${qs({ status })}`)).strategies;
}
export async function getStrategy(id) {
  return (await apiJson(`/api/strategies/${encodeURIComponent(id)}`)).strategy;
}
export const getStrategyOverview = (filters) => apiJson(`/api/strategies/overview${qs(filters)}`);
export const getStrategyPerformance = (id, filters) =>
  apiJson(`/api/strategies/${encodeURIComponent(id)}/performance${qs(filters)}`);

export async function createStrategy(payload) {
  return (await apiJson('/api/strategies', { method: 'POST', body: JSON.stringify(payload) })).strategy;
}
export async function updateStrategy(id, patch) {
  return (await apiJson(`/api/strategies/${encodeURIComponent(id)}`, {
    method: 'PATCH', body: JSON.stringify(patch),
  })).strategy;
}
export async function archiveStrategy(id) {
  return (await apiJson(`/api/strategies/${encodeURIComponent(id)}/archive`, { method: 'POST' })).strategy;
}
export async function duplicateStrategy(id) {
  return (await apiJson(`/api/strategies/${encodeURIComponent(id)}/duplicate`, { method: 'POST' })).strategy;
}
export const deleteStrategy = (id) =>
  apiJson(`/api/strategies/${encodeURIComponent(id)}`, { method: 'DELETE' });

// Kept for existing callers.
export async function getStrategyTrades(strategyId) {
  return (await apiJson(`/api/trades?strategyId=${encodeURIComponent(strategyId)}`)).trades;
}

/* ── queries ──────────────────────────────────────────── */

// Plain list: used by trade pickers and filters. Shape unchanged.
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

export function useStrategyOverview(filters) {
  const sseFallback = useSSEFallback();
  return useQuery({
    queryKey: strategiesKeys.overview(filters),
    queryFn: () => getStrategyOverview(filters),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    refetchInterval: sseFallback ? 60_000 : false,
  });
}

export function useStrategyPerformance(id, filters) {
  const sseFallback = useSSEFallback();
  return useQuery({
    queryKey: strategiesKeys.performance(id, filters),
    queryFn: () => getStrategyPerformance(id, filters),
    enabled: !!id,
    staleTime: 15_000,
    placeholderData: keepPreviousData,
    refetchInterval: sseFallback ? 30_000 : false,
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

/* ── mutations ────────────────────────────────────────── */

function useInvalidateStrategies() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: strategiesKeys.all });
    qc.invalidateQueries({ queryKey: ['trades'] });
  };
}

export function useCreateStrategy() {
  const invalidate = useInvalidateStrategies();
  return useMutation({ mutationFn: createStrategy, onSuccess: invalidate });
}
export function useUpdateStrategy() {
  const invalidate = useInvalidateStrategies();
  return useMutation({ mutationFn: ({ id, patch }) => updateStrategy(id, patch), onSuccess: invalidate });
}
export function useArchiveStrategy() {
  const invalidate = useInvalidateStrategies();
  return useMutation({ mutationFn: archiveStrategy, onSuccess: invalidate });
}
export function useDuplicateStrategy() {
  const invalidate = useInvalidateStrategies();
  return useMutation({ mutationFn: duplicateStrategy, onSuccess: invalidate });
}
export function useDeleteStrategy() {
  const invalidate = useInvalidateStrategies();
  return useMutation({ mutationFn: deleteStrategy, onSuccess: invalidate });
}
