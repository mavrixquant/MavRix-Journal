// apps/web/src/app/layout/Settings/SettingsProvider.jsx
//
// Global user preferences. Persisted to localStorage under `mavrix:settings`.
//
// Phase 2 scope — localStorage only, no server sync. Every consumer reads
// via useSettings() and writes via update(section, patch).
//
// Side effects applied to <html> / <head>:
//   - --accent, --accent-2, --accent-soft, --accent-soft2  (accent color)
//   - injected <style> that collapses animations when reduceMotion === 'on'
//
// Density and font-size are persisted but not yet consumed by any CSS. That
// wiring lands in Phase 3 — every future consumer just reads the values.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

const STORAGE_KEY = 'mavrix:settings';

/* ------------------------------------------------------------------ */
/*  Defaults                                                           */
/* ------------------------------------------------------------------ */

export const DEFAULT_SETTINGS = Object.freeze({
  appearance: {
    accentColor: '#F59E0B',
    density: 'comfortable',     // 'comfortable' | 'compact'
    fontSize: 'medium',         // 'small' | 'medium' | 'large'
    reduceMotion: 'auto',       // 'auto' | 'on' | 'off'
  },
  preferences: {
    defaultLanding: 'journal',  // 'journal' | 'backtester' | 'last'
    timeFormat: '24h',          // '12h' | '24h'
    dateFormat: 'iso',          // 'iso' | 'us' | 'eu'
    confirmDestructive: true,
  },
  notifications: {
    broadcastBanner: true,
    chatNotifications: 'all',   // 'all' | 'dms' | 'muted'
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
/*  Persistence                                                        */
/* ------------------------------------------------------------------ */

function loadFromStorage() {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return DEFAULT_SETTINGS;

    // Shallow-merge per section so a new section added in a future
    // release gets defaults automatically, and any missing key inside
    // an existing section gets filled in too.
    const merged = {};
    for (const sectionKey of Object.keys(DEFAULT_SETTINGS)) {
      merged[sectionKey] = {
        ...DEFAULT_SETTINGS[sectionKey],
        ...(parsed[sectionKey] || {}),
      };
    }
    return merged;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveToStorage(settings) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // localStorage disabled or quota — silent
  }
}

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(loadFromStorage);

  // Persist on every change.
  useEffect(() => {
    saveToStorage(settings);
  }, [settings]);

  // Update one section with a partial patch.
  const update = useCallback((section, patch) => {
    setSettings((prev) => {
      if (!prev[section]) return prev;
      return {
        ...prev,
        [section]: { ...prev[section], ...patch },
      };
    });
  }, []);

  // Reset everything back to defaults.
  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

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
  // Density and font size get stamped on <body> so future CSS (Phase 3)
  // can target them without knowing about the provider.

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