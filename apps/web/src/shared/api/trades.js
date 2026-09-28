// apps/web/src/shared/api/trades.js
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiJson } from './client';
import { accountsKeys } from './accounts';
import { useSSEFallback } from '@/shared/api/sse';

// ---------- Trade ID generator (canonical source: @/shared/trading/tradeId) ----------
export { generateTradeId } from '@/shared/trading/tradeId';

// ---------- Query keys ----------
export const tradesKeys = {
  all: ['trades'],
  byAccount: (accountId) => ['trades', accountId],
};

// ---------- Raw API calls ----------
export async function getTrades(accountId) {
  const data = await apiJson(
    `/api/trades?accountId=${encodeURIComponent(accountId)}`
  );
  return data.trades;
}

export async function createTrade(accountId, tradeData) {
  const data = await apiJson('/api/trades', {
    method: 'POST',
    body: JSON.stringify({ ...tradeData, accountId }),
  });
  return data.trade;
}

export async function createTrades(accountId, tradesArray) {
  return apiJson('/api/trades/bulk', {
    method: 'POST',
    body: JSON.stringify({ accountId, trades: tradesArray }),
  });
}

export async function updateTrade(tradeId, tradeData) {
  const data = await apiJson(`/api/trades/${tradeId}`, {
    method: 'PATCH',
    body: JSON.stringify(tradeData),
  });
  return data.trade;
}

export async function deleteTrade(tradeId) {
  return apiJson(`/api/trades/${tradeId}`, { method: 'DELETE' });
}

export async function deleteTradesByAccountId(accountId) {
  return apiJson(`/api/trades/by-account/${accountId}`, { method: 'DELETE' });
}

export async function addCustomColumn(accountId, columnName) {
  return apiJson(`/api/trades/by-account/${accountId}/columns`, {
    method: 'POST',
    body: JSON.stringify({ name: columnName }),
  });
}

export async function deleteCustomColumn(accountId, columnName) {
  return apiJson(
    `/api/trades/by-account/${accountId}/columns/${encodeURIComponent(columnName)}`,
    { method: 'DELETE' }
  );
}

export async function renameCustomColumn(accountId, oldName, newName) {
  return apiJson(
    `/api/trades/by-account/${accountId}/columns/${encodeURIComponent(oldName)}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ newName }),
    }
  );
}

// ---------- Hooks ----------

/**
 * Trades for a given account.
 * Pass `null` / `undefined` to disable the query (e.g. no account selected yet).
 */
export function useTrades(accountId, { refetchInterval } = {}) {
  const sseFallback = useSSEFallback();

  const interval =
    refetchInterval !== undefined
      ? refetchInterval
      : sseFallback
        ? 10_000
        : false;

  return useQuery({
    queryKey: tradesKeys.byAccount(accountId),
    queryFn: () => getTrades(accountId),
    enabled: !!accountId,
    refetchInterval: accountId ? interval : false,
  });
}

/** Bulk-import trades. Invalidates the account's trade list on success. */
export function useBulkCreateTrades() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ accountId, trades }) => createTrades(accountId, trades),
    onSuccess: (_result, { accountId }) => {
      qc.invalidateQueries({ queryKey: tradesKeys.byAccount(accountId) });
    },
  });
}

export function useCreateTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ accountId, data }) => createTrade(accountId, data),
    onSuccess: (_result, { accountId }) => {
      qc.invalidateQueries({ queryKey: tradesKeys.byAccount(accountId) });
    },
  });
}

export function useUpdateTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ tradeId, data }) => updateTrade(tradeId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tradesKeys.all });
    },
  });
}

export function useDeleteTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tradeId) => deleteTrade(tradeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tradesKeys.all });
    },
  });
}

export function useDeleteTradesByAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (accountId) => deleteTradesByAccountId(accountId),
    onSuccess: (_result, accountId) => {
      qc.invalidateQueries({ queryKey: tradesKeys.byAccount(accountId) });
      qc.invalidateQueries({ queryKey: accountsKeys.all });
    },
  });
}

export function useAddCustomColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ accountId, name }) => addCustomColumn(accountId, name),
    onSuccess: (_r, { accountId }) => {
      qc.invalidateQueries({ queryKey: tradesKeys.byAccount(accountId) });
    },
  });
}

export function useDeleteCustomColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ accountId, name }) => deleteCustomColumn(accountId, name),
    onSuccess: (_r, { accountId }) => {
      qc.invalidateQueries({ queryKey: tradesKeys.byAccount(accountId) });
    },
  });
}

export function useRenameCustomColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ accountId, oldName, newName }) =>
      renameCustomColumn(accountId, oldName, newName),
    onSuccess: (_r, { accountId }) => {
      qc.invalidateQueries({ queryKey: tradesKeys.byAccount(accountId) });
    },
  });
}

// ---------- Deprecated polling helper (kept for compat) ----------
export function subscribeToTrades(accountId, callback) {
  let cancelled = false;
  let timer = null;

  const tick = async () => {
    if (cancelled) return;
    try {
      const trades = await getTrades(accountId);
      if (!cancelled) callback(trades);
    } catch (err) {
      console.error('[trades] poll error:', err);
    }
    if (!cancelled) timer = setTimeout(tick, 10_000);
  };

  tick();
  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
  };
}
