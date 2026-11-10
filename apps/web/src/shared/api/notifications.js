import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiJson } from './client';

export const notificationKeys = {
  all: ['notifications'],
  list: (filters) => ['notifications', 'list', filters || {}],
  unreadCount: (section) => ['notifications', 'unread-count', section || 'all'],
};

/* -------------------------- fetchers -------------------------- */

export async function fetchNotifications({ section, unreadOnly, limit } = {}) {
  const params = new URLSearchParams();
  if (section) params.set('section', section);
  if (unreadOnly) params.set('unreadOnly', 'true');
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();
  const data = await apiJson(`/api/notifications${qs ? `?${qs}` : ''}`);
  return data.notifications;
}

export async function fetchUnreadCount(section) {
  const params = new URLSearchParams();
  if (section) params.set('section', section);
  const qs = params.toString();
  const data = await apiJson(`/api/notifications/unread-count${qs ? `?${qs}` : ''}`);
  return data.count;
}

export async function markRead(id) {
  const data = await apiJson(
    `/api/notifications/${encodeURIComponent(id)}/read`,
    { method: 'POST' }
  );
  return data.notification;
}

export async function markAllRead(section) {
  return apiJson('/api/notifications/read-all', {
    method: 'POST',
    body: JSON.stringify({ section }),
  });
}

export async function deleteNotification(id) {
  return apiJson(`/api/notifications/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function clearReadNotifications() {
  return apiJson('/api/notifications/read-clear', { method: 'POST' });
}

/* -------------------------- hooks -------------------------- */

export function useNotifications({ section, unreadOnly, limit = 100, enabled = true } = {}) {
  return useQuery({
    queryKey: notificationKeys.list({ section, unreadOnly, limit }),
    queryFn: () => fetchNotifications({ section, unreadOnly, limit }),
    enabled,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}

export function useUnreadNotificationCount({ section, enabled = true } = {}) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(section),
    queryFn: () => fetchUnreadCount(section),
    enabled,
    staleTime: 15_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (section) => markAllRead(section),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => deleteNotification(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}

export function useClearReadNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => clearReadNotifications(),
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
/* -------- friend requests: mark all pending request notifications read ---- */

export async function markFriendRequestsRead() {
  return apiJson('/api/notifications/read-friends', { method: 'POST' });
}

export function useMarkFriendRequestsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markFriendRequestsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
