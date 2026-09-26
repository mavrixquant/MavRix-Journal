// apps/web/src/services/accounts.service.js
import { apiJson } from './api';

const POLL_INTERVAL_MS = 5000;

export async function createAccount(_userId, accountData) {
  const data = await apiJson('/api/accounts', {
    method: 'POST',
    body: JSON.stringify(accountData),
  });
  return data.account;
}

export async function getAccounts(_userId) {
  const data = await apiJson('/api/accounts');
  return data.accounts;
}

export async function updateAccount(accountId, accountData) {
  const data = await apiJson(`/api/accounts/${accountId}`, {
    method: 'PATCH',
    body: JSON.stringify(accountData),
  });
  return data.account;
}

export async function deleteAccount(accountId) {
  return apiJson(`/api/accounts/${accountId}`, { method: 'DELETE' });
}

export async function updateAccountColumnConfigs(accountId, columnConfigs) {
  const data = await apiJson(`/api/accounts/${accountId}/column-configs`, {
    method: 'PATCH',
    body: JSON.stringify({ columnConfigs }),
  });
  return data.account;
}

// Polling-based replacement for Firebase onSnapshot.
export function subscribeToAccounts(_userId, callback) {
  let cancelled = false;
  let timer = null;

  const tick = async () => {
    if (cancelled) return;
    try {
      const accounts = await getAccounts();
      if (!cancelled) callback(accounts);
    } catch (err) {
      console.error('[accounts] poll error:', err);
    }
    if (!cancelled) timer = setTimeout(tick, POLL_INTERVAL_MS);
  };

  tick();
  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
  };
}