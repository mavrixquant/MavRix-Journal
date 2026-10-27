import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ensureFreshAccessToken, apiJson } from './client';
import { setTypingState } from '@/shared/chat/chatStream';
import { toast } from 'sonner';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';


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


const MAX_FAILURES = 3;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 8000;

export function useSSEBridge({ enabled = true, currentUserId = null } = {}) {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);

  const esRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const failuresRef = useRef(0);
  const userIdRef = useRef(currentUserId);

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
      });


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

        const myId = userIdRef.current;
        if (myId && message.senderId && message.senderId !== myId) {
          apiJson(
            `/api/chat/messages/${encodeURIComponent(message.id)}/delivered`,
            { method: 'POST' }
          ).catch(() => {});
        }
      });


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


      es.addEventListener('chat:cleared', (e) => {
        let payload;
        try {
          payload = JSON.parse(e.data);
        } catch {
          return;
        }
        const { conversationId } = payload || {};
        if (!conversationId) return;

        queryClient.invalidateQueries({ queryKey: ['chat', 'messages', conversationId] });
        queryClient.invalidateQueries({ queryKey: ['chat', 'conversation', conversationId] });
        queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      });


      es.addEventListener('friend:request:new', (e) => {
        queryClient.invalidateQueries({ queryKey: ['friends', 'requests'] });
        queryClient.invalidateQueries({ queryKey: ['friends', 'status'] });

        try {
          const payload = JSON.parse(e.data);
          const from = payload?.request?.fromUser;
          const name =
            [from?.firstName, from?.lastName].filter(Boolean).join(' ') ||
            from?.email ||
            'Someone';
          toast('New friend request', {
            description: `${name} wants to be friends.`,
            duration: 6000,
          });
        } catch {
        }
      });


      es.addEventListener('friend:request:accepted', (e) => {
        queryClient.invalidateQueries({ queryKey: ['friends'] });
        queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });

        try {
          const payload = JSON.parse(e.data);
          const peer = payload?.peer;
          const name =
            [peer?.firstName, peer?.lastName].filter(Boolean).join(' ') ||
            peer?.email ||
            'Someone';
          toast.success('Friend request accepted', {
            description: `You and ${name} are now friends.`,
          });
        } catch {
        }
      });


      es.addEventListener('friend:request:declined', () => {
        queryClient.invalidateQueries({ queryKey: ['friends', 'requests'] });
        queryClient.invalidateQueries({ queryKey: ['friends', 'status'] });
      });


      es.addEventListener('friend:request:cancelled', () => {
        queryClient.invalidateQueries({ queryKey: ['friends', 'requests'] });
        queryClient.invalidateQueries({ queryKey: ['friends', 'status'] });
      });


      es.addEventListener('friend:removed', () => {
        queryClient.invalidateQueries({ queryKey: ['friends'] });
        queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      });


      es.addEventListener('block:new', () => {
        queryClient.invalidateQueries({ queryKey: ['friends'] });
        queryClient.invalidateQueries({ queryKey: ['chat'] });
      });


      es.addEventListener('block:removed', () => {
        queryClient.invalidateQueries({ queryKey: ['friends'] });
        queryClient.invalidateQueries({ queryKey: ['chat'] });
      });

      // Market-data import job updates — invalidate admin queries on every
      // job state change. Invalidate the stats query only on terminal states
      // (cheap — no point refetching coverage mid-run).
      es.addEventListener('market-data:job:update', (e) => {
        queryClient.invalidateQueries({ queryKey: ['admin', 'market-data', 'jobs'] });
        try {
          const payload = JSON.parse(e.data);
          if (payload?.id) {
            queryClient.invalidateQueries({
              queryKey: ['admin', 'market-data', 'job-chunks', payload.id],
            });
          }
          if (
            payload?.status &&
            payload.status !== 'running' &&
            payload.status !== 'stopping'
          ) {
            queryClient.invalidateQueries({ queryKey: ['admin', 'market-data', 'stats'] });
            // hasData (catalog) changed - refresh so watchlist reflects new coverage
            queryClient.invalidateQueries({ queryKey: ['market-data', 'catalog'] });
          }
        } catch {}
      });

      es.addEventListener('error', () => {
        if (cancelled) return;

        setConnected(false);
        try { es.close(); } catch { }
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
        try { esRef.current.close(); } catch { }
        esRef.current = null;
      }
    };
  }, [enabled, queryClient]);

  return { connected, fallbackMode: useSSEFallback() };
}