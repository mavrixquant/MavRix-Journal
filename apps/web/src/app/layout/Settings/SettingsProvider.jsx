// apps/web/src/app/layout/Settings/SettingsProvider.jsx
//
// Global user preferences, persisted to BOTH localStorage and the server.
//
// Behavior:
//   - Mounts once per user (keyed by user.id via RootProviders).
//   - On mount, reads the per-user localStorage cache immediately (no flash).
//   - Fires GET /api/users/preferences in the background. On success, merges
//     the server response with DEFAULT_SETTINGS and replaces local state.
//     "Server wins" — a change made offline that never reached the server is
//     lost on next hydrate. Documented trade-off for cross-device sync.
//   - Every update() writes to state immediately, caches to localStorage,
//     and schedules a debounced (600 ms) PUT. Rapid toggles coalesce.
//   - On unmount, flushes any pending PUT (fire-and-forget) so a fast close
//     doesn't lose the last change.
//   - Logged-out (userId = null) skips all server I/O.
//
// Side effects on <html> / <head>:
//   - --accent, --accent-2, --accent-soft, --accent-soft2  (accent color)
//   - injected <style> that collapses animations when reduceMotion === 'on'
//   - body[data-density] and body[data-font-size] for future CSS consumption

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { apiJson } from '@/shared/api/client';

const STORAGE_PREFIX = 'mavrix:settings';
const LEGACY_STORAGE_KEY = 'mavrix:settings';
const WRITE_DEBOUNCE_MS = 600;

/* ------------------------------------------------------------------ */
/*  Defaults                                                           */
/* ------------------------------------------------------------------ */

export const DEFAULT_SETTINGS = Object.freeze({
  appearance: {
    accentColor: '#F59E0B',
    density: 'comfortable',
    fontSize: 'medium',
    reduceMotion: 'auto',
  },
  preferences: {
    defaultLanding: 'journal',
    timeFormat: '24h',
    dateFormat: 'iso',
    confirmDestructive: true,
  },
  notifications: {
    broadcastBanner: true,
    chatNotifications: 'all',
    chatSound: true,
    showTypingInList: true,
  },
  chats: {
    enterToSend: true,
    sendReadReceipts: true,
    showTypingInThread: true,
  },
});

/* ------------------------------------------------------------------ */
/*  Storage helpers                                                    */
/* ------------------------------------------------------------------ */

function storageKey(userId) {
  return userId ? `${STORAGE_PREFIX}:${userId}` : `${STORAGE_PREFIX}:anon`;
}

/**
 * One-time migration: if the old pre-Phase-4 key exists and the new
 * per-user key doesn't, copy it over and delete the old one. Runs on
 * first mount for a logged-in user only.
 */
function migrateLegacyKey(userId) {
  if (typeof window === 'undefined' || !userId) return;
  try {
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacy) return;
    const nextKey = storageKey(userId);
    if (!window.localStorage.getItem(nextKey)) {
      window.localStorage.setItem(nextKey, legacy);
    }
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // localStorage disabled — ignore
  }
}

function loadFromStorage(userId) {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return mergeWithDefaults(parsed);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveToStorage(userId, settings) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(settings));
  } catch {
    // quota or disabled — ignore
  }
}

/**
 * Shallow-per-section merge of stored/server data onto the defaults.
 * Any missing section or key is filled from DEFAULT_SETTINGS.
 */
function mergeWithDefaults(raw) {
  if (!raw || typeof raw !== 'object') return DEFAULT_SETTINGS;
  const merged = {};
  for (const sectionKey of Object.keys(DEFAULT_SETTINGS)) {
    merged[sectionKey] = {
      ...DEFAULT_SETTINGS[sectionKey],
      ...(raw[sectionKey] || {}),
    };
  }
  return merged;
}

/* ------------------------------------------------------------------ */
/*  Color helpers                                                      */
/* ------------------------------------------------------------------ */

function hexToRgb(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return null;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return null;
  return { r, g, b };
}

function hexA(hex, alpha) {
  const rgb = hexToRgb(hex);
  if (!rgb) return `rgba(245,158,11,${alpha})`;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

function lighten(hex, amount = 60) {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#FDE68A';
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp(rgb.r + amount);
  const g = clamp(rgb.g + amount);
  const b = clamp(rgb.b + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const SettingsContext = createContext(null);

export function SettingsProvider({ children, userId = null }) {
  const [settings, setSettings] = useState(() => {
    migrateLegacyKey(userId);
    return loadFromStorage(userId);
  });

  // Track the current userId in a ref for effects whose deps we don't want
  // to include (e.g. the unmount flush).
  const userIdRef = useRef(userId);
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  // Hydration gate: prevents a PUT before the initial GET completes.
  const hydratedRef = useRef(false);
  // If the user touched a setting before hydration, local wins — we skip
  // applying the server response so the user's just-made change isn't lost.
  const dirtyBeforeHydrationRef = useRef(false);

  // Debounced server write.
  const writeTimerRef = useRef(null);
  const pendingWriteRef = useRef(null);

  /* ---------------- Persist to localStorage on every change ---------------- */

  useEffect(() => {
    saveToStorage(userId, settings);
  }, [settings, userId]);

  /* ---------------- Server hydration ---------------- */

  useEffect(() => {
    if (!userId) {
      hydratedRef.current = true;
      return undefined;
    }

    let cancelled = false;

    (async () => {
      try {
        const { preferences } = await apiJson('/api/users/preferences');
        if (cancelled) return;

        // Only apply the server response if the user hasn't already
        // modified a preference locally in this session.
        if (!dirtyBeforeHydrationRef.current) {
          const merged = mergeWithDefaults(preferences);
          setSettings(merged);
        }
      } catch {
        // 401 (session expired) or network error — stay on local cache.
        // The next successful PUT will reconcile if the session recovers.
      } finally {
        if (!cancelled) hydratedRef.current = true;
      }
    })();

    return () => { cancelled = true; };
  }, [userId]);

  /* ---------------- Debounced server write ---------------- */

  const scheduleServerWrite = useCallback((next) => {
    pendingWriteRef.current = next;

    if (writeTimerRef.current) clearTimeout(writeTimerRef.current);

    writeTimerRef.current = setTimeout(async () => {
      writeTimerRef.current = null;

      const payload = pendingWriteRef.current;
      pendingWriteRef.current = null;

      const uid = userIdRef.current;
      if (!uid || !hydratedRef.current) return;

      try {
        await apiJson('/api/users/preferences', {
          method: 'PUT',
          body: JSON.stringify({ preferences: payload }),
        });
      } catch {
        // Silent — the next update retries with the full state.
      }
    }, WRITE_DEBOUNCE_MS);
  }, []);

  /* ---------------- Flush pending write on unmount ---------------- */

  useEffect(() => {
    return () => {
      if (writeTimerRef.current) {
        clearTimeout(writeTimerRef.current);
        writeTimerRef.current = null;
      }
      const payload = pendingWriteRef.current;
      pendingWriteRef.current = null;
      const uid = userIdRef.current;
      if (!payload || !uid) return;
      // Fire-and-forget; page is going away.
      apiJson('/api/users/preferences', {
        method: 'PUT',
        body: JSON.stringify({ preferences: payload }),
      }).catch(() => {});
    };
  }, []);

  /* ---------------- Public API ---------------- */

  const update = useCallback((section, patch) => {
    setSettings((prev) => {
      if (!prev[section]) return prev;
      const next = { ...prev, [section]: { ...prev[section], ...patch } };
      if (!hydratedRef.current) dirtyBeforeHydrationRef.current = true;
      scheduleServerWrite(next);
      return next;
    });
  }, [scheduleServerWrite]);

  const reset = useCallback(() => {
    if (!hydratedRef.current) dirtyBeforeHydrationRef.current = true;
    setSettings(DEFAULT_SETTINGS);
    scheduleServerWrite(DEFAULT_SETTINGS);
  }, [scheduleServerWrite]);

  /* ---------------- Accent color side effects ---------------- */

  useEffect(() => {
    const root = document.documentElement;
    const accent = settings.appearance.accentColor;

    root.style.setProperty('--accent', accent);
    root.style.setProperty('--accent-2', lighten(accent, 60));
    root.style.setProperty('--accent-soft', hexA(accent, 0.10));
    root.style.setProperty('--accent-soft2', hexA(accent, 0.28));
  }, [settings.appearance.accentColor]);

  /* ---------------- Reduce-motion side effect ---------------- */

  useEffect(() => {
    const STYLE_ID = 'mavrix-reduce-motion';
    let styleEl = document.getElementById(STYLE_ID);
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = STYLE_ID;
      document.head.appendChild(styleEl);
    }

    if (settings.appearance.reduceMotion === 'on') {
      styleEl.textContent = `
        *, *::before, *::after {
          animation-duration: .001ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: .001ms !important;
          scroll-behavior: auto !important;
        }
      `;
    } else {
      styleEl.textContent = '';
    }
  }, [settings.appearance.reduceMotion]);

  /* ---------------- Body data-* attributes ---------------- */

  useEffect(() => {
    document.body.dataset.density = settings.appearance.density;
    document.body.dataset.fontSize = settings.appearance.fontSize;
  }, [settings.appearance.density, settings.appearance.fontSize]);

  const value = useMemo(
    () => ({ settings, update, reset }),
    [settings, update, reset]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) {
    throw new Error('useSettings must be used inside <SettingsProvider>');
  }
  return ctx;
}