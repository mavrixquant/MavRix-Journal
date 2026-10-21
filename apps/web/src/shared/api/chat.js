import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { apiJson } from './client.js';
import { useSSEFallback } from './sse.js';
import {
  subscribeTyping,
  getTypingUserIds,
  getTypingConversationIds,
} from '@/shared/chat/chatStream.js';

export const chatKeys = {
  all: ['chat'],
  conversations: () => ['chat', 'conversations'],
  conversation: (id) => ['chat', 'conversation', id],
  messages: (id) => ['chat', 'messages', id],
  userSearch: (q) => ['chat', 'users', 'search', q],
  discoverGroups: (filterKey) => ['chat', 'groups', 'discover', filterKey],
  groupMembers: (groupId) => ['chat', 'groups', 'members', groupId],
};

export async function fetchConversations() {
  const data = await apiJson('/api/chat/conversations');
  return data.conversations;
}

export async function fetchConversation(id) {
  const data = await apiJson(`/api/chat/conversations/${encodeURIComponent(id)}`);
  return data.conversation;
}

export async function createConversation(peerId) {
  const data = await apiJson('/api/chat/conversations', {
    method: 'POST',
    body: JSON.stringify({ peerId }),
  });
  return data.conversation;
}

export async function updateConversation(id, patch) {
  return apiJson(`/api/chat/conversations/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export async function clearChat(conversationId) {
  return apiJson(
    `/api/chat/conversations/${encodeURIComponent(conversationId)}/clear`,
    { method: 'POST' }
  );
}

// ---------------------------------------------------------------------------
// Reset AI memory — deletes every message in an AI DM and aborts any
// in-flight generation, giving the assistant a clean slate.
// Backend rejects non-AI conversations with a 400.
// ---------------------------------------------------------------------------
export async function resetAiMemory(conversationId) {
  return apiJson(
    `/api/chat/conversations/${encodeURIComponent(conversationId)}/reset-memory`,
    { method: 'POST' }
  );
}

export async function stopAi(conversationId) {
  return apiJson(
    `/api/chat/conversations/${encodeURIComponent(conversationId)}/stop-ai`,
    { method: 'POST' }
  );
}

export async function fetchMessages(id, { before, limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (before) params.set('before', before);
  params.set('limit', String(limit));
  const data = await apiJson(
    `/api/chat/conversations/${encodeURIComponent(id)}/messages?${params.toString()}`
  );
  return data;
}

export async function sendMessage(conversationId, { body, replyToId }) {
  const data = await apiJson(
    `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
    { method: 'POST', body: JSON.stringify({ body, replyToId: replyToId || null }) }
  );
  return data.message;
}

export async function editMessage(messageId, body) {
  const data = await apiJson(`/api/chat/messages/${encodeURIComponent(messageId)}`, {
    method: 'PATCH',
    body: JSON.stringify({ body }),
  });
  return data.message;
}

export async function deleteMessage(messageId, scope) {
  const qs = scope === 'all' ? '?scope=all' : '?scope=me';
  return apiJson(`/api/chat/messages/${encodeURIComponent(messageId)}${qs}`, {
    method: 'DELETE',
  });
}

export async function markConversationRead(conversationId) {
  return apiJson(`/api/chat/conversations/${encodeURIComponent(conversationId)}/read`, {
    method: 'PATCH',
  });
}

export async function markMessageDelivered(messageId) {
  return apiJson(`/api/chat/messages/${encodeURIComponent(messageId)}/delivered`, {
    method: 'POST',
  });
}

export async function sendTyping(conversationId, isTyping) {
  return apiJson(
    `/api/chat/conversations/${encodeURIComponent(conversationId)}/typing`,
    { method: 'POST', body: JSON.stringify({ isTyping: !!isTyping }) }
  );
}

export async function searchUsers(q) {
  const data = await apiJson(`/api/chat/users/search?q=${encodeURIComponent(q)}`);
  return data.users;
}

export async function fetchDiscoverableGroups({ q, limit } = {}) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (limit) params.set('limit', String(limit));
  const qs = params.toString();
  const data = await apiJson(`/api/chat/groups/discover${qs ? `?${qs}` : ''}`);
  return data.groups;
}

export async function joinGroup(groupId) {
  const data = await apiJson(`/api/chat/groups/${encodeURIComponent(groupId)}/join`, {
    method: 'POST',
  });
  return data.conversation;
}

export async function leaveGroup(groupId) {
  return apiJson(`/api/chat/groups/${encodeURIComponent(groupId)}/leave`, {
    method: 'POST',
  });
}

export async function fetchGroupMembers(groupId) {
  const data = await apiJson(`/api/chat/groups/${encodeURIComponent(groupId)}/members`);
  return data.members;
}

export async function fetchAdminGroups(filters = {}) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v === undefined || v === null || v === '') continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  return apiJson(`/api/admin/groups${qs ? `?${qs}` : ''}`);
}

export async function fetchAdminGroup(groupId) {
  const data = await apiJson(`/api/admin/groups/${encodeURIComponent(groupId)}`);
  return data.group;
}

export async function createGroup(payload) {
  const data = await apiJson('/api/admin/groups', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.group;
}

export async function updateGroup(groupId, patch) {
  const data = await apiJson(`/api/admin/groups/${encodeURIComponent(groupId)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  return data.group;
}

export async function deleteGroup(groupId) {
  return apiJson(`/api/admin/groups/${encodeURIComponent(groupId)}`, { method: 'DELETE' });
}

export async function addGroupMember(groupId, userId) {
  return apiJson(`/api/admin/groups/${encodeURIComponent(groupId)}/members`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function removeGroupMember(groupId, userId) {
  return apiJson(
    `/api/admin/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`,
    { method: 'DELETE' }
  );
}

export async function setGroupMemberRole(groupId, userId, role) {
  return apiJson(
    `/api/admin/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(userId)}`,
    { method: 'PATCH', body: JSON.stringify({ role }) }
  );
}

export function useChatConversations({ enabled = true } = {}) {
  const sseFallback = useSSEFallback();
  return useQuery({
    queryKey: chatKeys.conversations(),
    queryFn: fetchConversations,
    staleTime: 15_000,
    refetchInterval: sseFallback ? 20_000 : false,
    enabled,
  });
}

export function useChatConversation(conversationId) {
  return useQuery({
    queryKey: chatKeys.conversation(conversationId),
    queryFn: () => fetchConversation(conversationId),
    enabled: !!conversationId,
    staleTime: 30_000,
  });
}

export function useChatMessages(conversationId, { limit = 50 } = {}) {
  const sseFallback = useSSEFallback();
  return useInfiniteQuery({
    queryKey: chatKeys.messages(conversationId),
    queryFn: ({ pageParam }) =>
      fetchMessages(conversationId, { before: pageParam, limit }),
    enabled: !!conversationId,
    initialPageParam: null,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    staleTime: 15_000,
    refetchInterval: sseFallback ? 20_000 : false,
  });
}

export function useChatUserSearch(q) {
  const trimmed = String(q || '').trim();
  const enabled = trimmed.length >= 2;
  return useQuery({
    queryKey: chatKeys.userSearch(trimmed),
    queryFn: () => searchUsers(trimmed),
    enabled,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useDiscoverableGroups({ q = '', limit, enabled = true } = {}) {
  const sseFallback = useSSEFallback();
  const filterKey = `${q || ''}|${limit ?? ''}`;
  return useQuery({
    queryKey: chatKeys.discoverGroups(filterKey),
    queryFn: () => fetchDiscoverableGroups({ q, limit }),
    enabled,
    staleTime: 20_000,
    refetchInterval: sseFallback ? 60_000 : false,
    placeholderData: (prev) => prev,
  });
}

export function useGroupMembers(groupId, { enabled = true } = {}) {
  return useQuery({
    queryKey: chatKeys.groupMembers(groupId),
    queryFn: () => fetchGroupMembers(groupId),
    enabled: enabled && !!groupId,
    staleTime: 30_000,
  });
}

export function useTypingIndicator(conversationId, excludeUserId) {
  const [userIds, setUserIds] = useState(() =>
    conversationId ? getTypingUserIds(conversationId, excludeUserId) : []
  );

  useEffect(() => {
    if (!conversationId) {
      setUserIds([]);
      return undefined;
    }
    const update = () => setUserIds(getTypingUserIds(conversationId, excludeUserId));
    update();
    const unsub = subscribeTyping(update);
    const iv = setInterval(update, 1500);
    return () => {
      unsub();
      clearInterval(iv);
    };
  }, [conversationId, excludeUserId]);

  return userIds;
}

export function useTypingConversations(excludeUserId) {
  const [set, setSet] = useState(() => getTypingConversationIds(excludeUserId));

  useEffect(() => {
    const update = () => setSet(getTypingConversationIds(excludeUserId));
    update();
    const unsub = subscribeTyping(update);
    const iv = setInterval(update, 1500);
    return () => {
      unsub();
      clearInterval(iv);
    };
  }, [excludeUserId]);

  return set;
}

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createConversation,
    onSuccess: (conv) => {
      qc.setQueryData(chatKeys.conversations(), (old) => {
        if (!Array.isArray(old)) return old;
        if (old.some((c) => c.id === conv.id)) return old;
        return [conv, ...old];
      });
      qc.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

export function useUpdateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, patch }) => updateConversation(conversationId, patch),
    onSuccess: (_r, { conversationId }) => {
      qc.invalidateQueries({ queryKey: chatKeys.conversations() });
      qc.invalidateQueries({ queryKey: chatKeys.conversation(conversationId) });
    },
  });
}

export function useClearChat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId) => clearChat(conversationId),
    onSuccess: (_r, conversationId) => {
      qc.invalidateQueries({ queryKey: chatKeys.messages(conversationId) });
      qc.invalidateQueries({ queryKey: chatKeys.conversations() });
      qc.invalidateQueries({ queryKey: chatKeys.conversation(conversationId) });
    },
  });
}

// ---------------------------------------------------------------------------
// Reset AI memory — hard-deletes all messages in an AI DM.
// The SSE `chat:cleared` broadcast also invalidates the same caches, so
// this onSuccess is belt-and-suspenders for the SSE-fallback path.
// ---------------------------------------------------------------------------
export function useResetAiMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId) => resetAiMemory(conversationId),
    onSuccess: (_r, conversationId) => {
      qc.invalidateQueries({ queryKey: chatKeys.messages(conversationId) });
      qc.invalidateQueries({ queryKey: chatKeys.conversation(conversationId) });
      qc.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

export function useStopAi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId) => stopAi(conversationId),
    onSuccess: (_r, conversationId) => {
      // Real "Interrupted" message arrives via SSE. Fall back to refetch
      // in case SSE is not connected.
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: chatKeys.messages(conversationId) });
        qc.invalidateQueries({ queryKey: chatKeys.conversations() });
      }, 800);
    },
  });
}

let __tempCounter = 0;
function nextTempId() {
  __tempCounter += 1;
  return `__optimistic__${Date.now()}_${__tempCounter}`;
}

export function useSendMessage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId, body, replyToId }) =>
      sendMessage(conversationId, { body, replyToId }),

    onMutate: async ({ conversationId, body, replyToId, senderId }) => {
      const key = chatKeys.messages(conversationId);
      await qc.cancelQueries({ queryKey: key });

      const tempId = nextTempId();
      const previous = qc.getQueryData(key);

      qc.setQueryData(key, (old) => {
        if (!old || !Array.isArray(old.pages) || old.pages.length === 0) return old;
        const optimistic = {
          id: tempId,
          conversationId,
          senderId: senderId || null,
          sender: null,
          body,
          replyToId: replyToId || null,
          createdAt: new Date().toISOString(),
          editedAt: null,
          deletedAt: null,
          deleted: false,
          deliveredAt: null,
          readAt: null,
          _optimistic: true,
        };
        const [first, ...rest] = old.pages;
        return {
          ...old,
          pages: [{ ...first, messages: [...first.messages, optimistic] }, ...rest],
        };
      });

      return { tempId, previous, conversationId };
    },

    onSuccess: (message, _vars, ctx) => {
      if (!ctx) return;
      qc.setQueryData(chatKeys.messages(ctx.conversationId), (old) => {
        if (!old || !Array.isArray(old.pages) || old.pages.length === 0) return old;
        const [first, ...rest] = old.pages;
        const cleaned = first.messages.filter(
          (m) => m.id !== ctx.tempId && m.id !== message.id
        );
        const updated = { ...first, messages: [...cleaned, message] };
        return { ...old, pages: [updated, ...rest] };
      });
      qc.invalidateQueries({ queryKey: chatKeys.conversations() });
    },

    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      qc.setQueryData(chatKeys.messages(ctx.conversationId), (old) => {
        if (!old || !Array.isArray(old.pages)) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            messages: page.messages.filter((m) => m.id !== ctx.tempId),
          })),
        };
      });
    },
  });
}

export function useEditMessage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, body }) => editMessage(messageId, body),

    onMutate: async ({ conversationId, messageId, body }) => {
      const key = chatKeys.messages(conversationId);
      const previous = qc.getQueryData(key);
      qc.setQueryData(key, (old) => {
        if (!old || !Array.isArray(old.pages)) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            messages: page.messages.map((m) =>
              m.id === messageId
                ? { ...m, body, editedAt: new Date().toISOString() }
                : m
            ),
          })),
        };
      });
      return { previous, conversationId };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(chatKeys.messages(ctx.conversationId), ctx.previous);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

export function useDeleteMessage() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ messageId, scope }) => deleteMessage(messageId, scope),

    onMutate: async ({ conversationId, messageId, scope }) => {
      const key = chatKeys.messages(conversationId);
      const previous = qc.getQueryData(key);

      qc.setQueryData(key, (old) => {
        if (!old || !Array.isArray(old.pages)) return old;
        if (scope === 'me') {
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.filter((m) => m.id !== messageId),
            })),
          };
        }
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            messages: page.messages.map((m) =>
              m.id === messageId
                ? { ...m, body: null, deleted: true, deletedAt: new Date().toISOString() }
                : m
            ),
          })),
        };
      });

      return { previous, conversationId };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        qc.setQueryData(chatKeys.messages(ctx.conversationId), ctx.previous);
      }
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
  });
}

export function useJoinGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groupId) => joinGroup(groupId),
    onSuccess: (conv) => {
      qc.setQueryData(chatKeys.conversations(), (old) => {
        if (!Array.isArray(old)) return [conv];
        if (old.some((c) => c.id === conv.id)) return old;
        return [conv, ...old];
      });
      qc.invalidateQueries({ queryKey: chatKeys.conversations() });
      qc.invalidateQueries({ queryKey: ['chat', 'groups', 'discover'] });
      qc.invalidateQueries({ queryKey: chatKeys.groupMembers(conv.id) });
    },
  });
}

export function useLeaveGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (groupId) => leaveGroup(groupId),
    onSuccess: (_r, groupId) => {
      qc.setQueryData(chatKeys.conversations(), (old) => {
        if (!Array.isArray(old)) return old;
        return old.filter((c) => c.id !== groupId);
      });
      qc.removeQueries({ queryKey: chatKeys.messages(groupId) });
      qc.removeQueries({ queryKey: chatKeys.groupMembers(groupId) });
      qc.removeQueries({ queryKey: chatKeys.conversation(groupId) });
      qc.invalidateQueries({ queryKey: chatKeys.conversations() });
      qc.invalidateQueries({ queryKey: ['chat', 'groups', 'discover'] });
    },
  });
}

function useInvalidateAdminGroup() {
  const qc = useQueryClient();
  return (groupId) => {
    qc.invalidateQueries({ queryKey: ['admin', 'groups'] });
    qc.invalidateQueries({ queryKey: ['admin', 'audit'] });
    if (groupId) qc.invalidateQueries({ queryKey: ['admin', 'group', groupId] });
    qc.invalidateQueries({ queryKey: chatKeys.conversations() });
    qc.invalidateQueries({ queryKey: ['chat', 'groups', 'discover'] });
    if (groupId) qc.invalidateQueries({ queryKey: chatKeys.groupMembers(groupId) });
  };
}

export function useAdminGroups(filters = {}) {
  return useQuery({
    queryKey: ['admin', 'groups', filters],
    queryFn: () => fetchAdminGroups(filters),
    staleTime: 15_000,
    placeholderData: (prev) => prev,
  });
}

export function useAdminGroup(groupId) {
  return useQuery({
    queryKey: ['admin', 'group', groupId],
    queryFn: () => fetchAdminGroup(groupId),
    enabled: !!groupId,
  });
}

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createGroup,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'groups'] });
      qc.invalidateQueries({ queryKey: ['admin', 'audit'] });
      qc.invalidateQueries({ queryKey: ['chat', 'groups', 'discover'] });
    },
  });
}

export function useUpdateGroup() {
  const invalidate = useInvalidateAdminGroup();
  return useMutation({
    mutationFn: ({ groupId, patch }) => updateGroup(groupId, patch),
    onSuccess: (_r, vars) => invalidate(vars.groupId),
  });
}

export function useDeleteGroup() {
  const invalidate = useInvalidateAdminGroup();
  return useMutation({
    mutationFn: (groupId) => deleteGroup(groupId),
    onSuccess: (_r, groupId) => invalidate(groupId),
  });
}

export function useAddGroupMember() {
  const invalidate = useInvalidateAdminGroup();
  return useMutation({
    mutationFn: ({ groupId, userId }) => addGroupMember(groupId, userId),
    onSuccess: (_r, vars) => invalidate(vars.groupId),
  });
}

export function useRemoveGroupMember() {
  const invalidate = useInvalidateAdminGroup();
  return useMutation({
    mutationFn: ({ groupId, userId }) => removeGroupMember(groupId, userId),
    onSuccess: (_r, vars) => invalidate(vars.groupId),
  });
}

export function useSetGroupMemberRole() {
  const invalidate = useInvalidateAdminGroup();
  return useMutation({
    mutationFn: ({ groupId, userId, role }) => setGroupMemberRole(groupId, userId, role),
    onSuccess: (_r, vars) => invalidate(vars.groupId),
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId) => markConversationRead(conversationId),
    onSuccess: (_r, conversationId) => {
      qc.setQueryData(chatKeys.conversations(), (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        );
      });
    },
  });
}

export function useMarkDelivered() {
  return useMutation({
    mutationFn: (messageId) => markMessageDelivered(messageId),
    retry: false,
    onError: () => {},
  });
}

export function useSendTyping() {
  return useMutation({
    mutationFn: ({ conversationId, isTyping }) => sendTyping(conversationId, isTyping),
    retry: false,
    onError: () => {},
  });
}