
const ROW_HEIGHT = 40;

export const GRID_COLS = 48;
export const GRID_ROW_HEIGHT = ROW_HEIGHT;

// Responsive metrics: panel pixel height = h * rowHeight + margin * (h - 1).
// Scaling both together keeps the visual rhythm identical at every viewport
// while letting panels fill large monitors instead of looking shrunken.
export function getResponsiveGridMetrics(viewportWidth) {
  if (viewportWidth >= 2560) return { rowHeight: 64, margin: 24 };
  if (viewportWidth >= 1920) return { rowHeight: 56, margin: 22 };
  if (viewportWidth >= 1440) return { rowHeight: 48, margin: 20 };
  return { rowHeight: GRID_ROW_HEIGHT, margin: 16 };
}
export const GRID_BREAKPOINTS = { lg: 1280, md: 996, sm: 768, xs: 480, xxs: 0 };
export const GRID_COLS_BY_BP = { lg: 48, md: 32, sm: 16, xs: 8, xxs: 4 };

export const MAX_LAYOUTS = 3;

export const DEFAULT_LAYOUT = [
  { i: 'calendar',           x: 0,  y: 0,  w: 31, h: 13, minW: 1, minH: 1, visible: true },
  { i: 'hero',               x: 0,  y: 13, w: 31, h: 6,  minW: 1, minH: 1, visible: true },

  { i: 'monthly',            x: 31, y: 11, w: 17, h: 6,  minW: 1, minH: 1, visible: true },
  { i: 'rollingExpectancy',  x: 31, y: 22, w: 17, h: 6,  minW: 1, minH: 1, visible: true },

  { i: 'rrCompare',          x: 0,  y: 30, w: 48, h: 6,  minW: 1, minH: 1, visible: true },

  { i: 'kpiGrid',            x: 31, y: 0,  w: 17, h: 5,  minW: 1, minH: 1, visible: true },
  { i: 'advancedKpiGrid',    x: 31, y: 5,  w: 17, h: 3,  minW: 1, minH: 1, visible: true },
  { i: 'durationWidget',     x: 31, y: 8,  w: 17, h: 3,  minW: 1, minH: 1, visible: true },

  { i: 'timeChart',          x: 0,  y: 24, w: 31, h: 6,  minW: 1, minH: 1, visible: true },
  { i: 'underwater',         x: 31, y: 17, w: 17, h: 5,  minW: 1, minH: 1, visible: true },
  { i: 'categoryCharts',     x: 0,  y: 19, w: 31, h: 5,  minW: 1, minH: 1, visible: true },

  { i: 'strategyBreakdown',  x: 0,  y: 36, w: 48, h: 6,  minW: 1, minH: 1, visible: false },
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
  strategyBreakdown: { label: 'Strategy Breakdown' },
  categoryCharts:    { label: 'Session / DOW / Direction Charts' },
};

const LAYOUT_KEY = 'dashboard-grid-layout-v2';

export function buildMobileLayout() {
  const order = [
    'hero',
    'kpiGrid',
    'advancedKpiGrid',
    'durationWidget',
    'timeChart',
    'underwater',
    'categoryCharts',
    'strategyBreakdown',
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
    y: item.y,
    w: Math.max(1, Math.min(targetCols, Math.round(item.w * scale))),
    h: Math.max(1, item.h),
  }));
}

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
  }
}

export function resetLayout() {
  try {
    localStorage.removeItem(LAYOUT_KEY);
  } catch {
  }
}

export function layoutForEditor(layout) {
  return layout.map(it => ({ ...it, visible: it.visible !== false }));
}

export function layoutForDisplay(layout) {
  return layout.filter(it => it.visible !== false);
}


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