// apps/web/src/features/admin/api.js
//
// React Query hooks for every admin endpoint. All calls go through the
// shared apiJson wrapper which injects the Bearer token and handles 401s.

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiJson } from '@/shared/api/client';

/* ------------------------------------------------------------------ */
/*  Query keys                                                        */
/* ------------------------------------------------------------------ */
export const adminKeys = {
  me:       ['admin', 'me'],
  stats:    ['admin', 'stats'],
  health:   ['admin', 'health'],
  users:    (filters) => ['admin', 'users', filters],
  user:     (id) => ['admin', 'user', id],
  accounts: (filters) => ['admin', 'accounts', filters],
  account:  (id) => ['admin', 'account', id],
  trades:   (filters) => ['admin', 'trades', filters],
  audit:    (filters) => ['admin', 'audit', filters],
  sessions: ['admin', 'sessions'],
  settings: ['admin', 'settings'],
  calLogs:  ['admin', 'calendar', 'logs'],
};

/* ------------------------------------------------------------------ */
/*  Me / Dashboard                                                    */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Users                                                             */
/* ------------------------------------------------------------------ */

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
    placeholderData: (prev) => prev,   // keep old page visible while new loads
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

/* ------------------------------------------------------------------ */
/*  Accounts                                                          */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Trades                                                            */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Audit log                                                         */
/* ------------------------------------------------------------------ */

export function useAdminAuditLog(filters = {}) {
  return useQuery({
    queryKey: adminKeys.audit(filters),
    queryFn: () => apiJson(`/api/admin/audit${buildQS(filters)}`),
    staleTime: 10_000,
    placeholderData: (prev) => prev,
  });
}

/* ------------------------------------------------------------------ */
/*  Settings                                                          */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Sessions                                                          */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Broadcast                                                         */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/*  Calendar                                                          */
/* ------------------------------------------------------------------ */

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