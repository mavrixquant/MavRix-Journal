// apps/web/src/shared/api/sse.js
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ensureFreshAccessToken, apiJson } from './client';
import { setTypingState } from '@/shared/chat/chatStream';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/* ------------------------------------------------------------------ */
/*  Fallback store - when SSE fails 3x we let hooks resume polling.   */
/* ------------------------------------------------------------------ */

let fallbackMode = false;
const fallbackListeners = new Set();

function setFallbackMode(v) {
  if (fallbackMode === v) return;
  fallbackMode = v;
  fallbackListeners.forEach((fn) => fn());
}
function subscribeFallback(fn) {
  fallbackListeners.add(fn);
  return () => fallbackListeners.delete(fn);
}
function getFallbackMode() {
  return fallbackMode;
}

export function useSSEFallback() {
  return useSyncExternalStore(
    subscribeFallback,
    getFallbackMode,
    getFallbackMode
  );
}

/* ------------------------------------------------------------------ */
/*  Chat cache helpers                                                 */
/* ------------------------------------------------------------------ */

function appendMessage(queryClient, conversationId, message) {
  queryClient.setQueryData(['chat', 'messages', conversationId], (old) => {
    if (!old || !Array.isArray(old.pages) || old.pages.length === 0) return old;
    const [first, ...rest] = old.pages;
    if (first.messages.some((m) => m.id === message.id)) return old;
    return {
      ...old,
      pages: [
        { ...first, messages: [...first.messages, message] },
        ...rest,
      ],
    };
  });
}

function patchMessage(queryClient, conversationId, messageId, patch) {
  queryClient.setQueryData(['chat', 'messages', conversationId], (old) => {
    if (!old || !Array.isArray(old.pages)) return old;
    return {
      ...old,
      pages: old.pages.map((page) => ({
        ...page,
        messages: page.messages.map((m) =>
          m.id === messageId ? { ...m, ...patch } : m
        ),
      })),
    };
  });
}

/* ------------------------------------------------------------------ */
/*  The bridge hook                                                    */
/* ------------------------------------------------------------------ */

const MAX_FAILURES = 3;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 8000;

/**
 * Opens a single SSE connection per logged-in user.
 *
 * @param {object}  opts
 * @param {boolean} opts.enabled
 * @param {string}  opts.currentUserId — the logged-in user's id. Used to
 *   decide whether an inbound chat:message:new needs a delivery ack.
 *   Changes to this value do NOT reconnect the stream (ref-based).
 */
export function useSSEBridge({ enabled = true, currentUserId = null } = {}) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);

  const esRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const failuresRef = useRef(0);
  const userIdRef = useRef(currentUserId);

  // Keep the ref in sync without restarting the SSE stream on login.
  useEffect(() => {
    userIdRef.current = currentUserId;
  }, [currentUserId]);

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;

    const connect = async () => {
      if (cancelled) return;

      const token = await ensureFreshAccessToken();
      if (cancelled) return;

      if (!token) {
        scheduleReconnect();
        return;
      }

      const url = `${BASE_URL}/api/events?token=${encodeURIComponent(token)}`;
      const es = new EventSource(url);
      esRef.current = es;

      es.addEventListener('open', () => {
        if (cancelled) return;
        failuresRef.current = 0;
        setConnected(true);
        setFallbackMode(false);
        queryClient.invalidateQueries();
      });

      es.addEventListener('hello', () => {
        // Handshake acknowledged.
      });

      /* ---------------- Generic query invalidation ---------------- */

      es.addEventListener('invalidate', (e) => {
        let payload;
        try {
          payload = JSON.parse(e.data);
        } catch {
          console.warn('[sse] malformed payload', e.data);
          return;
        }
        const keys = Array.isArray(payload?.keys) ? payload.keys : [];
        keys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      });

      /* ---------------- Chat: new message ---------------- */

      es.addEventListener('chat:message:new', (e) => {
        let payload;
        try {
          payload = JSON.parse(e.data);
        } catch {
          return;
        }
        const { conversationId, message } = payload || {};
        if (!conversationId || !message) return;

        appendMessage(queryClient, conversationId, message);
        queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });

        if (message.senderId) {
          setTypingState(conversationId, message.senderId, false);
        }

        // Auto-ack delivery for inbound messages. Fire-and-forget; a dropped
        // ack just means the sender sees ✓ until the peer opens the thread.
        const myId = userIdRef.current;
        if (myId && message.senderId && message.senderId !== myId) {
          apiJson(
            `/api/chat/messages/${encodeURIComponent(message.id)}/delivered`,
            { method: 'POST' }
          ).catch(() => {});
        }
      });

      /* ---------------- Chat: edit ---------------- */

      es.addEventListener('chat:message:edited', (e) => {
        let payload;
        try {
          payload = JSON.parse(e.data);
        } catch {
          return;
        }
        const { conversationId, messageId, body, editedAt } = payload || {};
        if (!conversationId || !messageId) return;
        patchMessage(queryClient, conversationId, messageId, { body, editedAt });
        queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      });

      /* ---------------- Chat: delete for everyone ---------------- */

      es.addEventListener('chat:message:deleted', (e) => {
        let payload;
        try {
          payload = JSON.parse(e.data);
        } catch {
          return;
        }
        const { conversationId, messageId } = payload || {};
        if (!conversationId || !messageId) return;
        patchMessage(queryClient, conversationId, messageId, {
          body: null,
          deleted: true,
          deletedAt: new Date().toISOString(),
        });
        queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      });

      /* ---------------- Chat: delivered ---------------- */

      es.addEventListener('chat:message:delivered', (e) => {
        let payload;
        try {
          payload = JSON.parse(e.data);
        } catch {
          return;
        }
        const { conversationId, messageId, deliveredAt } = payload || {};
        if (!conversationId || !messageId) return;
        patchMessage(queryClient, conversationId, messageId, { deliveredAt });
      });

      /* ---------------- Chat: read receipt ---------------- */

      es.addEventListener('chat:read', (e) => {
        let payload;
        try {
          payload = JSON.parse(e.data);
        } catch {
          return;
        }
        const { conversationId, readerUserId, readAt } = payload || {};
        if (!conversationId || !readerUserId || !readAt) return;

        const readTs = new Date(readAt).getTime();

        // Mark all OWN messages in this conversation whose createdAt <= readAt
        // as read. The reader's own messages are skipped (we shouldn't tick
        // our own inbound messages on their behalf).
        queryClient.setQueryData(['chat', 'messages', conversationId], (old) => {
          if (!old || !Array.isArray(old.pages)) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((m) => {
                if (m.senderId === readerUserId) return m;
                if (m.readAt) return m;
                if (new Date(m.createdAt).getTime() > readTs) return m;
                return { ...m, readAt };
              }),
            })),
          };
        });
      });

      /* ---------------- Chat: typing (ephemeral) ---------------- */

      es.addEventListener('chat:typing', (e) => {
        let payload;
        try {
          payload = JSON.parse(e.data);
        } catch {
          return;
        }
        const { conversationId, userId, isTyping } = payload || {};
        if (!conversationId || !userId) return;
        setTypingState(conversationId, userId, !!isTyping);
      });

      es.addEventListener('error', () => {
        if (cancelled) return;

        setConnected(false);
        try { es.close(); } catch { /* noop */ }
        esRef.current = null;

        failuresRef.current += 1;
        if (failuresRef.current >= MAX_FAILURES) {
          setFallbackMode(true);
          return;
        }
        scheduleReconnect();
      });
    };

    const scheduleReconnect = () => {
      if (cancelled) return;
      const delay = Math.min(
        RECONNECT_BASE_MS * 2 ** Math.max(0, failuresRef.current - 1),
        RECONNECT_MAX_MS
      );
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, delay);
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (esRef.current) {
        try { esRef.current.close(); } catch { /* noop */ }
        esRef.current = null;
      }
    };
  }, [enabled, queryClient]);

  return { connected, fallbackMode: useSSEFallback() };
}