
import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiJson } from '@/shared/api/client';

export const adminKeys = {
  me:         ['admin', 'me'],
  stats:      ['admin', 'stats'],
  health:     ['admin', 'health'],
  users:      (filters) => ['admin', 'users', filters],
  user:       (id) => ['admin', 'user', id],
  accounts:   (filters) => ['admin', 'accounts', filters],
  account:    (id) => ['admin', 'account', id],
  trades:     (filters) => ['admin', 'trades', filters],
  strategies: (filters) => ['admin', 'strategies', filters],
  strategy:   (id) => ['admin', 'strategy', id],
  audit:      (filters) => ['admin', 'audit', filters],
  sessions:   ['admin', 'sessions'],
  settings:   ['admin', 'settings'],
  calLogs:    ['admin', 'calendar', 'logs'],
};


export function useAdminMe() {
  return useQuery({
    queryKey: adminKeys.me,
    queryFn: () => apiJson('/api/admin/me'),
    staleTime: 60_000,
  });
}

export function useAdminStats() {
  return useQuery({
    queryKey: adminKeys.stats,
    queryFn: () => apiJson('/api/admin/stats'),
    staleTime: 30_000,
  });
}

export function useAdminHealth() {
  return useQuery({
    queryKey: adminKeys.health,
    queryFn: () => apiJson('/api/admin/health'),
    refetchInterval: 30_000,
  });
}


function buildQS(filters) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters || {})) {
    if (v === undefined || v === null || v === '') continue;
    params.set(k, String(v));
  }
  const s = params.toString();
  return s ? `?${s}` : '';
}

export function useAdminUsers(filters = {}) {
  return useQuery({
    queryKey: adminKeys.users(filters),
    queryFn: () => apiJson(`/api/admin/users${buildQS(filters)}`),
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  });
}

export function useAdminUser(userId) {
  return useQuery({
    queryKey: adminKeys.user(userId),
    queryFn: () => apiJson(`/api/admin/users/${userId}`),
    enabled: !!userId,
  });
}

function useInvalidateAdminUser() {
  const qc = useQueryClient();
  return (userId) => {
    qc.invalidateQueries({ queryKey: ['admin', 'users'] });
    if (userId) qc.invalidateQueries({ queryKey: adminKeys.user(userId) });
    qc.invalidateQueries({ queryKey: adminKeys.stats });
    qc.invalidateQueries({ queryKey: ['admin', 'audit'] });
  };
}

export function useAdminUpdateUser() {
  const invalidate = useInvalidateAdminUser();
  return useMutation({
    mutationFn: ({ userId, patch }) =>
      apiJson(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSuccess: (_r, vars) => invalidate(vars.userId),
  });
}

export function useAdminVerifyEmail() {
  const invalidate = useInvalidateAdminUser();
  return useMutation({
    mutationFn: (userId) =>
      apiJson(`/api/admin/users/${userId}/verify-email`, { method: 'POST' }),
    onSuccess: (_r, userId) => invalidate(userId),
  });
}

export function useAdminUnverifyEmail() {
  const invalidate = useInvalidateAdminUser();
  return useMutation({
    mutationFn: (userId) =>
      apiJson(`/api/admin/users/${userId}/unverify-email`, { method: 'POST' }),
    onSuccess: (_r, userId) => invalidate(userId),
  });
}

export function useAdminTriggerPasswordReset() {
  return useMutation({
    mutationFn: (userId) =>
      apiJson(`/api/admin/users/${userId}/password-reset`, { method: 'POST' }),
  });
}

export function useAdminBanUser() {
  const invalidate = useInvalidateAdminUser();
  return useMutation({
    mutationFn: ({ userId, reason }) =>
      apiJson(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason || null }),
      }),
    onSuccess: (_r, vars) => invalidate(vars.userId),
  });
}

export function useAdminUnbanUser() {
  const invalidate = useInvalidateAdminUser();
  return useMutation({
    mutationFn: (userId) =>
      apiJson(`/api/admin/users/${userId}/unban`, { method: 'POST' }),
    onSuccess: (_r, userId) => invalidate(userId),
  });
}

export function useAdminForceLogout() {
  return useMutation({
    mutationFn: (userId) =>
      apiJson(`/api/admin/users/${userId}/force-logout`, { method: 'POST' }),
  });
}

export function useAdminDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId) =>
      apiJson(`/api/admin/users/${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: adminKeys.stats });
      qc.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
  });
}


export function useAdminAccounts(filters = {}) {
  return useQuery({
    queryKey: adminKeys.accounts(filters),
    queryFn: () => apiJson(`/api/admin/accounts${buildQS(filters)}`),
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  });
}

export function useAdminAccount(accountId) {
  return useQuery({
    queryKey: adminKeys.account(accountId),
    queryFn: () => apiJson(`/api/admin/accounts/${accountId}`),
    enabled: !!accountId,
  });
}

export function useAdminUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ accountId, patch }) =>
      apiJson(`/api/admin/accounts/${accountId}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'accounts'] });
      qc.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
  });
}

export function useAdminReassignAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ accountId, newUserId }) =>
      apiJson(`/api/admin/accounts/${accountId}/reassign`, {
        method: 'POST',
        body: JSON.stringify({ newUserId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'accounts'] });
      qc.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
  });
}

export function useAdminDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (accountId) =>
      apiJson(`/api/admin/accounts/${accountId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'accounts'] });
      qc.invalidateQueries({ queryKey: adminKeys.stats });
      qc.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
  });
}


export function useAdminTrades(filters = {}) {
  return useQuery({
    queryKey: adminKeys.trades(filters),
    queryFn: () => apiJson(`/api/admin/trades${buildQS(filters)}`),
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  });
}

export function useAdminDeleteTrade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (tradeId) =>
      apiJson(`/api/admin/trades/${tradeId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'trades'] });
      qc.invalidateQueries({ queryKey: adminKeys.stats });
      qc.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
  });
}

export function useAdminDeleteTradesByAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (accountId) =>
      apiJson(`/api/admin/trades/by-account/${accountId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'trades'] });
      qc.invalidateQueries({ queryKey: adminKeys.stats });
      qc.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
  });
}


export function useAdminStrategies(filters = {}) {
  return useQuery({
    queryKey: adminKeys.strategies(filters),
    queryFn: () => apiJson(`/api/admin/strategies${buildQS(filters)}`),
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  });
}

export function useAdminStrategy(strategyId) {
  return useQuery({
    queryKey: adminKeys.strategy(strategyId),
    queryFn: () => apiJson(`/api/admin/strategies/${strategyId}`),
    enabled: !!strategyId,
  });
}

export function useAdminDeleteStrategy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (strategyId) =>
      apiJson(`/api/admin/strategies/${strategyId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'strategies'] });
      qc.invalidateQueries({ queryKey: adminKeys.stats });
      qc.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
  });
}


export function useAdminAuditLog(filters = {}) {
  return useQuery({
    queryKey: adminKeys.audit(filters),
    queryFn: () => apiJson(`/api/admin/audit${buildQS(filters)}`),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}


export function useAdminSettings() {
  return useQuery({
    queryKey: adminKeys.settings,
    queryFn: () => apiJson('/api/admin/settings'),
  });
}

export function useAdminUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch) =>
      apiJson('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(patch),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.settings });
      qc.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
  });
}


export function useAdminSessions() {
  return useQuery({
    queryKey: adminKeys.sessions,
    queryFn: () => apiJson('/api/admin/sessions'),
    refetchInterval: 15_000,
  });
}

export function useAdminDisconnectSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId) =>
      apiJson(`/api/admin/sessions/${userId}/disconnect`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.sessions });
    },
  });
}


export function useAdminBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) =>
      apiJson('/api/admin/broadcast', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
  });
}


export function useAdminCalendarLogs() {
  return useQuery({
    queryKey: adminKeys.calLogs,
    queryFn: () => apiJson('/api/admin/calendar/logs'),
    staleTime: 5_000,
  });
}

export function useAdminCalendarSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiJson('/api/admin/calendar/sync', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: adminKeys.calLogs });
      qc.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
  });
}

export function useAdminCalendarWipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiJson('/api/admin/calendar/cache', { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
  });
}
// ---------------------------------------------------------------------------
// Market data cache — coverage stats, async import jobs, wipe.
//
// Imports are async: POST /import returns 202 { jobId }. Progress is polled
// via GET /jobs (fast when a job is running, slow otherwise) and pushed via
// the `market-data:job:update` SSE event (see shared/api/sse.js).
// ---------------------------------------------------------------------------
export function useAdminMarketDataStats() {
  return useQuery({
    queryKey: ['admin', 'market-data', 'stats'],
    queryFn: () => apiJson('/api/admin/market-data/stats'),
    staleTime: 15_000,
  });
}

export function useAdminMarketDataJobs({ enabled = true } = {}) {
  return useQuery({
    queryKey: ['admin', 'market-data', 'jobs'],
    queryFn: () => apiJson('/api/admin/market-data/jobs'),
    enabled,
    // Fast poll while a job is running; slow idle poll to catch jobs started
    // from another tab (or after this tab reloaded).
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data?.jobs) return false;
      const anyRunning = data.jobs.some(
        (j) => j.status === 'running' || j.status === 'stopping'
      );
      return anyRunning ? 1500 : 10_000;
    },
    refetchOnWindowFocus: true,
  });
}

export function useAdminStartMarketDataImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) =>
      apiJson('/api/admin/market-data/import', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'market-data', 'jobs'] });
      qc.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
  });
}

export function useAdminStopMarketDataImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId) =>
      apiJson(`/api/admin/market-data/jobs/${encodeURIComponent(jobId)}/stop`, {
        method: 'POST',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'market-data', 'jobs'] });
      qc.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
  });
}

export function useAdminMarketDataWipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) =>
      apiJson('/api/admin/market-data/cache', {
        method: 'DELETE',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'market-data', 'stats'] });
      qc.invalidateQueries({ queryKey: ['admin', 'market-data', 'jobs'] });
      qc.invalidateQueries({ queryKey: ['admin', 'audit'] });
    },
  });
}