// apps/web/src/services/trades.service.js
import { apiJson } from './api';

const POLL_INTERVAL_MS = 5000;

// Local copy of the shared ID generator.
// Keep in sync with packages/shared/src/tradeId.js.
export function generateTradeId(trade) {
  const { date, entryTime, exitTime, direction, symbol } = trade;
  const parts = [date, entryTime, exitTime, direction || '', symbol || '']
    .map(String)
    .map((s) => s.trim().replace(/[^a-zA-Z0-9]/g, '_'));
  return parts.join('_');
}

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
    if (!cancelled) timer = setTimeout(tick, POLL_INTERVAL_MS);
  };

  tick();
  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
  };
}