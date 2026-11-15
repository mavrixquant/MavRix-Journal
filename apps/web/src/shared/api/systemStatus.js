import { useQuery } from '@tanstack/react-query';
import { apiJson } from './client';

export const systemStatusKeys = {
  status: () => ['system-status'],
};

const CACHE_KEY = 'mavrix:system-status:v1';

export async function fetchSystemStatus() {
  const data = await apiJson('/api/system/status');
  // FIXED 2026-11-15 — persist the last-known status. If the next fetch
  // errors (or the app boots while the API is cold on Render free tier),
  // useQuery can fall back to this instead of returning undefined, which
  // previously made MaintenanceGate fail-open.
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ...data, _cachedAt: Date.now() }));
  } catch {}
  return data;
}

function readCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Polls /api/system/status. Fail-closed at the gate level — this hook just
 * supplies the freshest available data.
 *
 * FIXED 2026-11-15:
 *  - placeholderData from sessionStorage so a cold boot has SOMETHING to
 *    gate against instead of `undefined`.
 *  - Faster refetch intervals (10s vs 30s) so any stale cache clears
 *    faster.
 *  - More retries on transient failure.
 */
export function useSystemStatus({ enabled = true } = {}) {
  return useQuery({
    queryKey: systemStatusKeys.status(),
    queryFn: fetchSystemStatus,
    enabled,
    placeholderData: () => readCache(),
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: 2,
    retryDelay: (n) => Math.min(1000 * 2 ** n, 5000),
  });
}