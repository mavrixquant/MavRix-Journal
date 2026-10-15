// apps/web/src/shared/charts/useChartColors.js
//
// Reads the live --accent* CSS custom properties off <html> and returns
// concrete hex / rgba strings that Chart.js can paint onto a <canvas>.
//
// Why this hook exists:
//   Chart.js does not understand CSS variables. The SettingsProvider writes
//   --accent, --accent-2, --accent-soft, --accent-soft2 onto
//   document.documentElement whenever the user changes the accent. This hook
//   bridges that gap by exposing concrete values to chart components.
//
// Change detection:
//   useSyncExternalStore + a single shared MutationObserver watching
//   <html style="...">. The snapshot is a pipe-joined string of the four
//   tokens, so React only re-renders when the accent actually changes.
//
// Fallback:
//   If the tokens are missing (e.g. before SettingsProvider hydrates on the
//   very first paint), we fall back to the app default amber (#F59E0B).

import { useSyncExternalStore, useMemo } from 'react';

const DEFAULT_ACCENT = '#F59E0B';
const DEFAULT_ACCENT_2 = '#FDE68A';
const DEFAULT_SOFT = 'rgba(245,158,11,.10)';
const DEFAULT_SOFT2 = 'rgba(245,158,11,.28)';

/* ------------------------------------------------------------------ */
/*  Shared subscription — ONE MutationObserver for the whole app      */
/* ------------------------------------------------------------------ */

const listeners = new Set();
let observer = null;

function emit() {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      // Isolate listener errors so one bad subscriber can't break others.
    }
  }
}

function ensureObserver() {
  if (observer || typeof document === 'undefined') return;
  observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes' && m.attributeName === 'style') {
        emit();
        return;
      }
    }
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['style'],
  });
}

function subscribe(fn) {
  ensureObserver();
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0 && observer) {
      observer.disconnect();
      observer = null;
    }
  };
}

/* ------------------------------------------------------------------ */
/*  Snapshot                                                          */
/* ------------------------------------------------------------------ */

function readToken(name, fallback) {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

function getSnapshot() {
  return [
    readToken('--accent', DEFAULT_ACCENT),
    readToken('--accent-2', DEFAULT_ACCENT_2),
    readToken('--accent-soft', DEFAULT_SOFT),
    readToken('--accent-soft2', DEFAULT_SOFT2),
  ].join('|');
}

function getServerSnapshot() {
  return [
    DEFAULT_ACCENT,
    DEFAULT_ACCENT_2,
    DEFAULT_SOFT,
    DEFAULT_SOFT2,
  ].join('|');
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function hexToRgba(hex, alpha) {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return hex;
  return `rgba(${r},${g},${b},${alpha})`;
}

/* ------------------------------------------------------------------ */
/*  Public hook                                                       */
/* ------------------------------------------------------------------ */

/**
 * Returns concrete color values for Chart.js, derived from the live
 * --accent* CSS custom properties.
 *
 * @returns {{
 *   accent:     string,  // --accent
 *   accent2:    string,  // --accent-2
 *   soft:       string,  // --accent-soft   (rgba @ .10)
 *   soft2:      string,  // --accent-soft2  (rgba @ .28)
 *   amber:      string,  // alias of accent  (drop-in for chartColors.amber)
 *   amberHover: string,  // alias of accent2 (drop-in for chartColors.amberHover)
 *   amberSoft:  string,  // alias of soft    (drop-in for chartColors.amberSoft)
 *   amberSoft2: string,  // alias of soft2   (drop-in for chartColors.amberSoft2)
 *   amberFill:  string,  // rgba(accent, .28) — used by gradient fills
 * }}
 */
export function useChartColors() {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const [accent, accent2, soft, soft2] = snapshot.split('|');

  return useMemo(
    () => ({
      // Canonical
      accent,
      accent2,
      soft,
      soft2,

      // Legacy aliases — keep chart callers drop-in compatible with
      // the old chartColors.amber* API in shared/charts/theme.js.
      amber: accent,
      amberHover: accent2,
      amberSoft: soft,
      amberSoft2: soft2,
      amberFill: hexToRgba(accent, 0.28),
      withAlpha: (a) => hexToRgba(accent, a),
    }),
    [accent, accent2, soft, soft2]
  );
}

export default useChartColors;