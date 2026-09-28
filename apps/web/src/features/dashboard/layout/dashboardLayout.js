// src/components/dashboard/dashboardLayout.js

const ROW_HEIGHT = 40;

export const GRID_COLS = 24;
export const GRID_ROW_HEIGHT = ROW_HEIGHT;
export const GRID_BREAKPOINTS = { lg: 1280, md: 996, sm: 768, xs: 480, xxs: 0 };
export const GRID_COLS_BY_BP = { lg: 24, md: 16, sm: 8, xs: 4, xxs: 2 };

// Maximum number of layouts a user can have saved.
export const MAX_LAYOUTS = 3;

export const DEFAULT_LAYOUT = [
  // ---- Left column (x: 0) ----
  { i: 'calendar',           x: 0,  y: 0,  w: 14, h: 12, minW: 1, minH: 1, visible: true },
  { i: 'hero',               x: 0,  y: 12, w: 14, h: 7,  minW: 1, minH: 1, visible: true },
  { i: 'monthly',            x: 0,  y: 19, w: 6,  h: 5,  minW: 1, minH: 1, visible: true },
  { i: 'rollingExpectancy',  x: 6,  y: 19, w: 8,  h: 5,  minW: 1, minH: 1, visible: true },
  { i: 'rrCompare',          x: 0,  y: 24, w: 14, h: 7,  minW: 1, minH: 1, visible: true },

  // ---- Right column (x: 14) ----
  { i: 'kpiGrid',            x: 14, y: 0,  w: 10, h: 5,  minW: 1, minH: 1, visible: true },
  { i: 'advancedKpiGrid',    x: 14, y: 5,  w: 5,  h: 3,  minW: 1, minH: 1, visible: true },
  { i: 'durationWidget',     x: 19, y: 5,  w: 5,  h: 3,  minW: 1, minH: 1, visible: true },
  { i: 'timeChart',          x: 14, y: 8,  w: 10, h: 6,  minW: 1, minH: 1, visible: true },
  { i: 'underwater',         x: 14, y: 14, w: 10, h: 5,  minW: 1, minH: 1, visible: true },
  { i: 'categoryCharts',     x: 14, y: 19, w: 10, h: 4,  minW: 1, minH: 1, visible: true },
];

export const PANEL_META = {
  calendar:          { label: 'Monthly Calendar & Weekly' },
  hero:              { label: 'Cumulative Equity Hero' },
  monthly:           { label: 'Monthly R / Net P&L' },
  underwater:        { label: 'Underwater Curve' },
  kpiGrid:           { label: 'Core KPI Grid' },
  advancedKpiGrid:   { label: 'Advanced KPI Grid' },
  timeChart:         { label: 'Time of Day Chart' },
  durationWidget:    { label: 'Holding Time Widget' },
  rollingExpectancy: { label: 'Rolling 20-Trade Expectancy' },
  rrCompare:         { label: 'RR Comparison / Symbol Breakdown' },
  categoryCharts:    { label: 'Session / DOW / Direction Charts' },
};

const LAYOUT_KEY = 'dashboard-grid-layout-v2';

export function buildMobileLayout() {
  // Every panel full-width, 6 rows tall (≈240px at ROW_HEIGHT=40).
  // Order matches the source order of DEFAULT_LAYOUT.
  const order = [
    'hero',
    'kpiGrid',
    'advancedKpiGrid',
    'durationWidget',
    'timeChart',
    'underwater',
    'categoryCharts',
    'monthly',
    'rollingExpectancy',
    'rrCompare',
    'calendar',
  ];
  return order.map((id, i) => ({
    i: id,
    x: 0,
    y: i * 6,
    w: 4,
    h: 6,
    minW: 4,
    minH: 4,
    visible: true,
  }));
}

export function scaleLayoutToBreakpoint(lgLayout, targetCols) {
  if (targetCols === GRID_COLS) return lgLayout;

  const scale = targetCols / GRID_COLS;

  return lgLayout.map((item) => ({
    ...item,
    x: Math.floor(item.x * scale),
    // y is row-count based; rows have the same pixel height at every breakpoint.
    y: item.y,
    w: Math.max(1, Math.min(targetCols, Math.round(item.w * scale))),
    h: Math.max(1, item.h),
    minW: 1,
    minH: 1,
  }));
}

/* Inverse of scaleLayoutToBreakpoint — brings a smaller-breakpoint layout
   back up to the 24-column source-of-truth. Used when the user drags or
   resizes on md/sm/xs, so the write goes to the lg source. */
export function upscaleToLg(items, sourceCols) {
  if (sourceCols === GRID_COLS) return items;
  const scale = GRID_COLS / sourceCols;
  return items.map((it) => ({
    ...it,
    x: Math.max(0, Math.round(it.x * scale)),
    y: it.y,
    w: Math.max(1, Math.min(GRID_COLS, Math.round(it.w * scale))),
    h: Math.max(1, it.h),
  }));
}

export function loadLayout() {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return DEFAULT_LAYOUT.map(it => ({ ...it }));
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_LAYOUT.map(it => ({ ...it }));

    const byId = new Map(parsed.map(it => [it.i, it]));
    return DEFAULT_LAYOUT.map((def) => {
      const saved = byId.get(def.i);
      return saved ? { ...def, ...saved } : { ...def };
    });
  } catch {
    return DEFAULT_LAYOUT.map(it => ({ ...it }));
  }
}

export function saveLayout(layout) {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    // localStorage quota exceeded or disabled — silently ignore
  }
}

export function resetLayout() {
  try {
    localStorage.removeItem(LAYOUT_KEY);
  } catch {
    // localStorage disabled — silently ignore
  }
}

export function layoutForEditor(layout) {
  return layout.map(it => ({ ...it, visible: it.visible !== false }));
}

export function layoutForDisplay(layout) {
  return layout.filter(it => it.visible !== false);
}

// ---------- Multi-layout helpers ----------

export function makeLayoutId() {
  return `layout-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeLayoutName(index) {
  return `Layout ${index + 1}`;
}

export function buildFreshLayout() {
  return DEFAULT_LAYOUT.map(it => ({ ...it }));
}

export function buildDefaultLayouts() {
  return [{
    id: makeLayoutId(),
    name: makeLayoutName(0),
    layout: buildFreshLayout(),
  }];
}