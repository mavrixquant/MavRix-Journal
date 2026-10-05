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
/*  Query keys — shared across pages                                  */
/* ------------------------------------------------------------------ */
export const adminKeys = {
  me:       ['admin', 'me'],
  stats:    ['admin', 'stats'],
  health:   ['admin', 'health'],
  users:    (filters) => ['admin', 'users', filters],
  user:     (id) => ['admin', 'user', id],
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
    refetchInterval: 30_000,     // live health pill
  });
}

/* ------------------------------------------------------------------ */
/*  Users                                                             */
/* ------------------------------------------------------------------ */

export function useAdminUsers(filters = {}) {
  const params = new URLSearchParams();
  if (filters.q)              params.set('q', filters.q);
  if (filters.role)           params.set('role', filters.role);
  if (filters.banned != null) params.set('banned', String(filters.banned));
  if (filters.page)           params.set('page', String(filters.page));
  if (filters.limit)          params.set('limit', String(filters.limit));
  const qs = params.toString();

  return useQuery({
    queryKey: adminKeys.users(filters),
    queryFn: () => apiJson(`/api/admin/users${qs ? `?${qs}` : ''}`),
    staleTime: 15_000,
  });
}

export function useAdminUser(userId) {
  return useQuery({
    queryKey: adminKeys.user(userId),
    queryFn: () => apiJson(`/api/admin/users/${userId}`),
    enabled: !!userId,
  });
}

/* ------------------------------------------------------------------ */
/*  Mutations — invalidate everything that touches the affected user  */
/* ------------------------------------------------------------------ */

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
        body: JSON.stringify({ reason }),
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
  const invalidate = useInvalidateAdminUser();
  return useMutation({
    mutationFn: (userId) =>
      apiJson(`/api/admin/users/${userId}/force-logout`, { method: 'POST' }),
    onSuccess: (_r, userId) => invalidate(userId),
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
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Audit log                                                         */
/* ------------------------------------------------------------------ */

export function useAdminAuditLog(filters = {}) {
  const params = new URLSearchParams();
  if (filters.actionPrefix) params.set('actionPrefix', filters.actionPrefix);
  if (filters.targetType)   params.set('targetType', filters.targetType);
  if (filters.q)            params.set('q', filters.q);
  if (filters.page)         params.set('page', String(filters.page));
  if (filters.limit)        params.set('limit', String(filters.limit));
  const qs = params.toString();

  return useQuery({
    queryKey: adminKeys.audit(filters),
    queryFn: () => apiJson(`/api/admin/audit${qs ? `?${qs}` : ''}`),
    staleTime: 10_000,
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