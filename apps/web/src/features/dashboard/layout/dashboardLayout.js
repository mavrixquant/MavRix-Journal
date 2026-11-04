// Dashboard layout engine (v2).
// Same exports as before, so useUserLayouts / useResponsiveGridMetrics keep working.
// New: reconcileLayouts() migrates any saved layout built for the old panel set.

export const GRID_COLS = 48;
export const GRID_ROW_HEIGHT = 40;
export const GRID_BREAKPOINTS = { lg: 1180, md: 900, sm: 640, xs: 420, xxs: 0 };
export const GRID_COLS_BY_BP = { lg: 48, md: 32, sm: 16, xs: 8, xxs: 4 };
export const MAX_LAYOUTS = 3;

const P = (i, x, y, w, h, minW, minH) => ({ i, x, y, w, h, minW, minH, visible: true });

// 48-column desktop layout
export const DEFAULT_LAYOUT = [
  P('kpiGrid',           0,  0, 48,  3, 16, 3),   // metric ribbon
  P('hero',              0,  3, 30, 10, 16, 6),   // equity + drawdown
  P('calendar',         30,  3, 18, 10, 12, 7),   // P&L calendar
  P('monthly',           0, 13, 16,  6, 10, 4),
  P('rollingExpectancy',16, 13, 16,  6, 10, 4),
  P('distribution',     32, 13, 16,  6, 10, 4),
  P('timeChart',         0, 19, 28,  7, 14, 5),   // weekday x time heatmap
  P('categoryCharts',   28, 19, 20,  7, 10, 5),   // session / weekday / direction
  P('rrCompare',         0, 26, 16,  6, 10, 4),
  P('advancedKpiGrid',  16, 26, 16,  6, 10, 4),
  P('durationWidget',   32, 26, 16,  6, 10, 4),
  P('strategyBreakdown', 0, 32, 48,  6, 16, 4),
];

// Heights (in grid rows) used when the grid collapses to 1 column on phones.
const MOBILE_H = {
  kpiGrid: 9, hero: 9, calendar: 10, monthly: 6, rollingExpectancy: 6,
  distribution: 6, timeChart: 7, categoryCharts: 8, rrCompare: 6,
  advancedKpiGrid: 6, durationWidget: 7, strategyBreakdown: 7,
};

// Panels that always take the full row on small tablets (16 cols).
const FULL_ON_SM = new Set(['calendar', 'timeChart', 'categoryCharts', 'strategyBreakdown']);

export function getResponsiveGridMetrics(viewportWidth) {
  const w = viewportWidth ?? (typeof window !== 'undefined' ? window.innerWidth : 1280);
  if (w >= 2560) return { rowHeight: 64, margin: 24 };
  if (w >= 1920) return { rowHeight: 56, margin: 22 };
  if (w >= 1440) return { rowHeight: 48, margin: 20 };
  return { rowHeight: 40, margin: 16 };
}

const byPosition = (a, b) => a.y - b.y || a.x - b.x;

function proportional(items, targetCols) {
  const f = targetCols / GRID_COLS;
  return items.map((it) => {
    const w = Math.max(1, Math.min(targetCols, Math.round(it.w * f)));
    const x = Math.max(0, Math.min(targetCols - w, Math.round(it.x * f)));
    return { ...it, x, w, minW: Math.max(1, Math.round((it.minW ?? 1) * f)) };
  });
}

// Reflow into 1 or 2 columns, honouring the original reading order.
function reflow(items, cols) {
  const out = [];
  let cx = 0;
  let cy = 0;
  let rowH = 0;

  for (const it of [...items].sort(byPosition)) {
    const frac = it.w / GRID_COLS;
    let w;
    if (cols <= 8) w = cols;
    else w = frac >= 0.5 || FULL_ON_SM.has(it.i) ? cols : Math.floor(cols / 2);

    let h = it.h;
    if (cols <= 8) h = MOBILE_H[it.i] ?? it.h;
    else if (it.i === 'kpiGrid') h = 5;

    if (cx + w > cols) {
      cy += rowH;
      cx = 0;
      rowH = 0;
    }
    out.push({ ...it, x: cx, y: cy, w, h, minW: 1, minH: Math.min(it.minH ?? 1, h) });
    cx += w;
    rowH = Math.max(rowH, h);
    if (cx >= cols) {
      cy += rowH;
      cx = 0;
      rowH = 0;
    }
  }
  return out;
}

export function scaleLayoutToBreakpoint(items, targetCols) {
  if (!items?.length) return [];
  if (targetCols >= GRID_COLS) return items.map((it) => ({ ...it }));
  if (targetCols >= 32) return proportional(items, targetCols);
  return reflow(items, targetCols);
}

export function upscaleToLg(items, sourceCols) {
  if (!items?.length || sourceCols === GRID_COLS) return items || [];
  const f = GRID_COLS / sourceCols;
  return items.map((it) => ({
    ...it,
    x: Math.round(it.x * f),
    w: Math.max(1, Math.round(it.w * f)),
  }));
}

export function buildMobileLayout() {
  return reflow(DEFAULT_LAYOUT, 4);
}

export function buildFreshLayout() {
  return DEFAULT_LAYOUT.map((it) => ({ ...it }));
}

export function makeLayoutId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `layout_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function makeLayoutName(index) {
  return `Layout ${index + 1}`;
}

export function buildDefaultLayouts() {
  return [{ id: makeLayoutId(), name: makeLayoutName(0), layout: buildFreshLayout() }];
}

// ---- migration: layouts saved for the old panel set -> new default ----
const DEFAULT_KEY = DEFAULT_LAYOUT.map((i) => i.i).sort().join('|');

export function isCurrentLayout(items) {
  return Array.isArray(items) && items.map((i) => i.i).sort().join('|') === DEFAULT_KEY;
}

export function reconcileLayouts(layouts) {
  if (!Array.isArray(layouts)) return [];
  let changed = false;
  const next = layouts.map((l) => {
    if (isCurrentLayout(l.layout)) return l;
    changed = true;
    return { ...l, layout: buildFreshLayout() };
  });
  return changed ? next : layouts;
}
