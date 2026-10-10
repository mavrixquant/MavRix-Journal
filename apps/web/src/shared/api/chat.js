// apps/web/src/shared/api/chat.js
//
// React Query hooks + fetchers for the chat feature.
//
// Cache keys:
//   ['chat', 'conversations']                - my conversation list
//   ['chat', 'conversation', conversationId] - one conversation's metadata
//   ['chat', 'messages', conversationId]     - infinite message history
//   ['chat', 'users', 'search', q]           - user search (caller debounces)
//
// Pagination model: useInfiniteQuery where pages[0] holds the NEWEST page.
// Within each page, messages are ascending (oldest ? newest).
// fetchNextPage() loads older messages by passing the oldest createdAt as
// `before`.
//
// SSE integration: shared/api/sse.js mutates the messages cache directly
// on chat:message:new / :edited / :deleted - no refetch for those events.

import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { apiJson } from './client.js';
import { useSSEFallback } from './sse.js';
import { subscribeTyping, getTypingUserIds } from '@/shared/chat/chatStream.js';

/* ------------------------------------------------------------------ */
/*  Query keys                                                         */
/* ------------------------------------------------------------------ */

export const chatKeys = {
  all: ['chat'],
  conversations: () => ['chat', 'conversations'],
  conversation: (id) => ['chat', 'conversation', id],
  messages: (id) => ['chat', 'messages', id],
  userSearch: (q) => ['chat', 'users', 'search', q],
};

/* ------------------------------------------------------------------ */
/*  Raw fetchers                                                       */
/* ------------------------------------------------------------------ */

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

export async function fetchMessages(id, { before, limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (before) params.set('before', before);
  params.set('limit', String(limit));
  const data = await apiJson(
    `/api/chat/conversations/${encodeURIComponent(id)}/messages?${params.toString()}`
  );
  return data; // { messages, hasMore, nextCursor }
}

export async function sendMessage(conversationId, { body, replyToId }) {
  const data = await apiJson(
    `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: 'POST',
      body: JSON.stringify({ body, replyToId: replyToId || null }),
    }
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
  return apiJson(
    `/api/chat/conversations/${encodeURIComponent(conversationId)}/read`,
    { method: 'PATCH' }
  );
}

export async function sendTyping(conversationId, isTyping) {
  return apiJson(
    `/api/chat/conversations/${encodeURIComponent(conversationId)}/typing`,
    {
      method: 'POST',
      body: JSON.stringify({ isTyping: !!isTyping }),
    }
  );
}

export async function searchUsers(q) {
  const data = await apiJson(
    `/api/chat/users/search?q=${encodeURIComponent(q)}`
  );
  return data.users;
}

/* ------------------------------------------------------------------ */
/*  Hooks - reads                                                      */
/* ------------------------------------------------------------------ */

/**
 * List my conversations.
 *
 * Polls every 20s ONLY if the SSE bridge has fallen back. Otherwise relies
 * on the SSE chat:message:new broadcast + explicit invalidations after
 * create/send/edit/delete.
 */
export function useChatConversations() {
  const sseFallback = useSSEFallback();
  return useQuery({
    queryKey: chatKeys.conversations(),
    queryFn: fetchConversations,
    staleTime: 15_000,
    refetchInterval: sseFallback ? 20_000 : false,
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

/**
 * Paginated message history.
 */
export function useChatMessages(conversationId, { limit = 50 } = {}) {
  const sseFallback = useSSEFallback();
  return useInfiniteQuery({
    queryKey: chatKeys.messages(conversationId),
    queryFn: ({ pageParam }) =>
      fetchMessages(conversationId, { before: pageParam, limit }),
    enabled: !!conversationId,
    initialPageParam: null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
    staleTime: 15_000,
    refetchInterval: sseFallback ? 20_000 : false,
  });
}

/**
 * Debounced user search. Returns `[]` when the term is under 2 chars.
 * Caller is expected to debounce the string before passing it in.
 */
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

/**
 * Live "is the peer typing?" indicator for the given conversation.
 * Subscribes to the chatStream pub/sub fed by the SSE bridge.
 *
 * @param {string}      conversationId
 * @param {string|null} excludeUserId  - usually the current user's id
 * @returns {string[]}                 - user ids of the other side typing
 */
export function useTypingIndicator(conversationId, excludeUserId) {
  const [userIds, setUserIds] = useState(() =>
    conversationId ? getTypingUserIds(conversationId, excludeUserId) : []
  );

  useEffect(() => {
    if (!conversationId) {
      setUserIds([]);
      return undefined;
    }
    const update = () =>
      setUserIds(getTypingUserIds(conversationId, excludeUserId));
    update();
    const unsub = subscribeTyping(update);
    // TTL expiry is time-based, not event-based - poll just enough to
    // catch the moment a stale typing flag drops off.
    const iv = setInterval(update, 1500);
    return () => {
      unsub();
      clearInterval(iv);
    };
  }, [conversationId, excludeUserId]);

  return userIds;
}

/* ------------------------------------------------------------------ */
/*  Hooks - mutations                                                  */
/* ------------------------------------------------------------------ */

export function useCreateConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: createConversation,
    onSuccess: (conv) => {
      // Inject the new (or existing) conversation into the list cache
      // immediately so the UI can render the thread without waiting for
      // the refetch to land.
      qc.setQueryData(chatKeys.conversations(), (old) => {
        if (!Array.isArray(old)) return old;
        if (old.some((c) => c.id === conv.id)) return old;
        return [conv, ...old];
      });
      // Then refetch to sync with the server's authoritative ordering.
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

/* ------------------------------------------------------------------ */
/*  Send - optimistic append                                           */
/* ------------------------------------------------------------------ */

let __tempCounter = 0;
function nextTempId() {
  __tempCounter += 1;
  return `__optimistic__${Date.now()}_${__tempCounter}`;
}

/**
 * Send a message with optimistic append.
 *
 * Caller usage:
 *   const send = useSendMessage();
 *   send.mutate({ conversationId, body, replyToId, senderId });
 *
 *   `senderId` is used only to stamp the optimistic message so the UI can
 *   render it on the right side before the server echo arrives.
 */
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
          body,
          replyToId: replyToId || null,
          createdAt: new Date().toISOString(),
          editedAt: null,
          deletedAt: null,
          deleted: false,
          _optimistic: true,
        };
        const [first, ...rest] = old.pages;
        return {
          ...old,
          pages: [
            { ...first, messages: [...first.messages, optimistic] },
            ...rest,
          ],
        };
      });

      return { tempId, previous, conversationId };
    },

    onSuccess: (message, _vars, ctx) => {
      if (!ctx) return;
      // Swap the optimistic entry for the server-confirmed message.
      qc.setQueryData(chatKeys.messages(ctx.conversationId), (old) => {
        if (!old || !Array.isArray(old.pages) || old.pages.length === 0) return old;
        const [first, ...rest] = old.pages;
        // Remove BOTH the optimistic temp id AND any pre-existing real copy.
        // The server broadcasts chat:message:new to the SENDER too, so the
        // SSE echo and this success handler race ? either can land first.
        // Removing both, then appending once, is idempotent either way.
        const cleaned = first.messages.filter(
          (m) => m.id !== ctx.tempId && m.id !== message.id
        );
        const updated = { ...first, messages: [...cleaned, message] };
        return { ...old, pages: [updated, ...rest] };
      });
      // Sidebar preview + ordering.
      qc.invalidateQueries({ queryKey: chatKeys.conversations() });
    },

    onError: (_err, _vars, ctx) => {
      if (!ctx) return;
      // Roll back the optimistic entry.
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

/**
 * Edit a message. Optimistically rewrites the body + editedAt in-place.
 */
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

/**
 * Delete a message. Two scopes:
 *   scope='me'  ? hide locally (no server broadcast)
 *   scope='all' ? soft-delete for everyone (sender only)
 */
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
          // Remove entirely - the thread doesn't render a tombstone for this.
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.filter((m) => m.id !== messageId),
            })),
          };
        }
        // scope='all' ? keep in place, body nulled, marked deleted.
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

/* ------------------------------------------------------------------ */
/*  Read + typing - fire-and-forget                                    */
/* ------------------------------------------------------------------ */

/**
 * Mark a conversation read. Fires whenever the thread is focused and a
 * new inbound message lands. Throttled by the caller.
 */
export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (conversationId) => markConversationRead(conversationId),
    onSuccess: (_r, conversationId) => {
      // Zero-out the sidebar badge locally.
      qc.setQueryData(chatKeys.conversations(), (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        );
      });
    },
  });
}

/**
 * Fire-and-forget typing event. Errors are swallowed because typing is
 * ephemeral - a dropped signal just means the peer sees "..." disappear.
 */
export function useSendTyping() {
  return useMutation({
    mutationFn: ({ conversationId, isTyping }) =>
      sendTyping(conversationId, isTyping),
    // Never retry; never surface errors.
    retry: false,
    onError: () => {},
  });
}