// apps/web/src/shared/api/sse.js
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ensureFreshAccessToken } from '@/services/api';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/* ------------------------------------------------------------------ */
/*  Fallback store — when SSE fails 3x we let hooks resume polling.   */
/*  Uses useSyncExternalStore so any component can subscribe without  */
/*  prop-drilling through context.                                     */
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
/*  The bridge hook                                                    */
/* ------------------------------------------------------------------ */

const MAX_FAILURES = 3;
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 8000;

/**
 * Opens a single SSE connection per logged-in user.
 * On every `invalidate` event, invalidates the corresponding React Query keys.
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
        // Not logged in (or refresh failed). Try again shortly.
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

      es.addEventListener('error', () => {
        if (cancelled) return;

        setConnected(false);
        try { es.close(); } catch { /* noop */ }
        esRef.current = null;

        failuresRef.current += 1;
        if (failuresRef.current >= MAX_FAILURES) {
          // Give up on SSE — hooks will resume polling.
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