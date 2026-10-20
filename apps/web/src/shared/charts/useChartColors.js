
import { useSyncExternalStore, useMemo } from 'react';

const DEFAULT_ACCENT = '#F59E0B';
const DEFAULT_ACCENT_2 = '#FDE68A';
const DEFAULT_SOFT = 'rgba(245,158,11,.10)';
const DEFAULT_SOFT2 = 'rgba(245,158,11,.28)';


const listeners = new Set();
let observer = null;

function emit() {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
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


function hexToRgba(hex, alpha) {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return hex;
  return `rgba(${r},${g},${b},${alpha})`;
}


export function useChartColors() {
  const snapshot = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const [accent, accent2, soft, soft2] = snapshot.split('|');

  return useMemo(
    () => ({
      accent,
      accent2,
      soft,
      soft2,

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