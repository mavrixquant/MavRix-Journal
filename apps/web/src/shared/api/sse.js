// apps/web/src/shared/api/sse.js
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ensureFreshAccessToken } from './client';
import { setTypingState } from '@/shared/chat/chatStream';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/* ------------------------------------------------------------------ */
/*  Fallback store — when SSE fails 3x we let hooks resume polling.   */
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

/** Read the current fallback flag inside a React component. */
export function useSSEFallback() {
  return useSyncExternalStore(
    subscribeFallback,
    getFallbackMode,
    getFallbackMode
  );
}

/* ------------------------------------------------------------------ */
/*  Chat cache helpers — mutate the messages infiniteQuery in place.  */
/*  pages[0] holds the NEWEST page; each page's messages are          */
/*  ascending (oldest → newest within the page).                      */
/* ------------------------------------------------------------------ */

function appendMessage(queryClient, conversationId, message) {
  queryClient.setQueryData(['chat', 'messages', conversationId], (old) => {
    if (!old || !Array.isArray(old.pages) || old.pages.length === 0) return old;
    const [first, ...rest] = old.pages;
    // Dedupe — the sender may already have the message via its HTTP response.
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
 * On `invalidate`, invalidates the corresponding React Query keys.
 * On chat events, mutates the chat caches directly (fast path) and lightly
 * invalidates the conversation list so ordering/previews stay fresh.
 *
 * Mount exactly ONCE per app (e.g. inside AppLayout).
 */
export function useSSEBridge({ enabled = true } = {}) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);

  const esRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const failuresRef = useRef(0);

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
        // On (re)connect we may have missed events. Force a full refresh.
        queryClient.invalidateQueries();
      });

      es.addEventListener('hello', () => {
        // Handshake acknowledged. Nothing to do — 'open' already fired.
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

        // Fast path — splice the message into the open thread's cache.
        appendMessage(queryClient, conversationId, message);

        // Slow path — refresh the sidebar (preview text, ordering, unread).
        queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });

        // Clear the sender's typing flag for this conversation.
        if (message.senderId) {
          setTypingState(conversationId, message.senderId, false);
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
        // Feeds the chatStream pub/sub → useTypingIndicator()
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