// apps/web/src/features/charts/lib/drawingTools.js
//
// Drawing shapes + per-symbol localStorage persistence.
//
// NOTE: lightweight-charts requires LineSeries points to be ascending by
// time. Trendline points are normalized on load AND at creation time, so
// drawings made in any click order round-trip correctly.

export const DRAWING_MODES = Object.freeze({
  NONE: 'none',
  HLINE: 'hline',
  TRENDLINE: 'trendline',
});

export const DRAWING_COLORS = [
  '#F59E0B',
  '#35C4A1',
  '#FF5C5C',
  '#4C8BF5',
  '#A78BFA',
];

export const DEFAULT_DRAWING_COLOR = DRAWING_COLORS[0];

let idCounter = 0;
export function makeDrawingId() {
  idCounter += 1;
  return `d-${Date.now().toString(36)}-${idCounter}`;
}

/* ------------------------------------------------------------------ */
/*  Time comparison — works for both numeric (intraday) and           */
/*  string "YYYY-MM-DD" (daily) chart times.                          */
/* ------------------------------------------------------------------ */

function compareTime(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/**
 * Normalize a trendline's two points into ascending time order.
 * Returns null if the two points share the same time (degenerate).
 */
export function normalizeTrendlinePoints(p1, p2) {
  if (!p1 || !p2) return null;
  const cmp = compareTime(p1.time, p2.time);
  if (cmp === 0) return null;
  return cmp < 0 ? [p1, p2] : [p2, p1];
}

/* ------------------------------------------------------------------ */
/*  Persistence — one key per symbol                                  */
/* ------------------------------------------------------------------ */

const STORAGE_PREFIX = 'mavrix:chart:drawings:';

function storageKey(symbol) {
  return `${STORAGE_PREFIX}${symbol}`;
}

export function loadDrawings(symbol) {
  if (typeof window === 'undefined' || !symbol) return [];
  try {
    const raw = window.localStorage.getItem(storageKey(symbol));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeDrawing).filter(Boolean);
  } catch {
    return [];
  }
}

export function saveDrawings(symbol, drawings) {
  if (typeof window === 'undefined' || !symbol) return;
  try {
    if (!drawings || drawings.length === 0) {
      window.localStorage.removeItem(storageKey(symbol));
    } else {
      window.localStorage.setItem(storageKey(symbol), JSON.stringify(drawings));
    }
  } catch {
    // localStorage disabled / quota — silent
  }
}

export function clearDrawings(symbol) {
  if (typeof window === 'undefined' || !symbol) return;
  try {
    window.localStorage.removeItem(storageKey(symbol));
  } catch {
    // ignore
  }
}

/* ------------------------------------------------------------------ */
/*  Validation + normalization                                        */
/* ------------------------------------------------------------------ */

/**
 * Returns a normalized copy of `d` (points sorted, metadata verified)
 * or `null` if the drawing is malformed / unsalvageable.
 */
export function normalizeDrawing(d) {
  if (!d || typeof d !== 'object') return null;
  if (!d.id || !d.mode) return null;
  if (!Array.isArray(d.points)) return null;
  if (!d.points.every((p) => Number.isFinite(p?.price) && p?.time != null)) return null;

  if (d.mode === DRAWING_MODES.HLINE) {
    if (d.points.length < 1) return null;
    return {
      id: d.id,
      mode: d.mode,
      color: d.color || DEFAULT_DRAWING_COLOR,
      points: [d.points[0]],
    };
  }

  if (d.mode === DRAWING_MODES.TRENDLINE) {
    if (d.points.length < 2) return null;
    const sorted = normalizeTrendlinePoints(d.points[0], d.points[1]);
    if (!sorted) return null; // degenerate (same time)
    return {
      id: d.id,
      mode: d.mode,
      color: d.color || DEFAULT_DRAWING_COLOR,
      points: sorted,
    };
  }

  return null;
}