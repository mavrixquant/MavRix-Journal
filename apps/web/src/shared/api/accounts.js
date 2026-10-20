import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiJson } from './client';
import { useSSEFallback } from '@/shared/api/sse';

export const accountsKeys = {
  all: ['accounts'],
  detail: (id) => ['accounts', id],
};

export async function getAccounts() {
  const data = await apiJson('/api/accounts');
  return data.accounts;
}

export async function createAccount(_userId, accountData) {
  const data = await apiJson('/api/accounts', {
    method: 'POST',
    body: JSON.stringify(accountData),
  });
  return data.account;
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


export function useAccounts({ refetchInterval } = {}) {
  const sseFallback = useSSEFallback();

  const interval =
    refetchInterval !== undefined
      ? refetchInterval
      : sseFallback
        ? 10_000
        : false;

  return useQuery({
    queryKey: accountsKeys.all,
    queryFn: getAccounts,
    refetchInterval: interval,
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => createAccount(null, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountsKeys.all });
    },
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ accountId, data }) => updateAccount(accountId, data),
    onSuccess: (_result, { accountId }) => {
      qc.invalidateQueries({ queryKey: accountsKeys.all });
      qc.invalidateQueries({ queryKey: accountsKeys.detail(accountId) });
    },
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (accountId) => deleteAccount(accountId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: accountsKeys.all });
      qc.invalidateQueries({ queryKey: ['trades'] });
    },
  });
}

export function useUpdateColumnConfigs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ accountId, columnConfigs }) =>
      updateAccountColumnConfigs(accountId, columnConfigs),
    onSuccess: (_result, { accountId }) => {
      qc.invalidateQueries({ queryKey: accountsKeys.all });
      qc.invalidateQueries({ queryKey: accountsKeys.detail(accountId) });
    },
  });
}

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
    if (!cancelled) timer = setTimeout(tick, 10_000);
  };

  tick();
  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
  };
}
