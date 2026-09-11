// src/components/dashboard/dashboardLayout.js

// All panels use a 24-column grid.
// rowHeight is 40px → h:6 = 240px tall.
const ROW_HEIGHT = 40;

export const GRID_COLS = 24;
export const GRID_ROW_HEIGHT = ROW_HEIGHT;

// Default dashboard layout (matches the design saved to Firestore).
export const DEFAULT_LAYOUT = [
  { i: 'calendar',           x: 0,  y: 0,  w: 14, h: 12, minW: 4, minH: 8, visible: true },
  { i: 'hero',               x: 0,  y: 12, w: 14, h: 7,  minW: 4, minH: 5, visible: true },
  { i: 'monthly',            x: 0,  y: 19, w: 6,  h: 5,  minW: 4, minH: 5, visible: true },
  { i: 'rollingExpectancy',  x: 6,  y: 19, w: 8,  h: 5,  minW: 3, minH: 5, visible: true },
  { i: 'rrCompare',          x: 0,  y: 24, w: 24, h: 5,  minW: 3, minH: 5, visible: true },

  { i: 'kpiGrid',            x: 14, y: 0,  w: 5,  h: 9,  minW: 3, minH: 6, visible: true },
  { i: 'advancedKpiGrid',    x: 19, y: 0,  w: 5,  h: 6,  minW: 3, minH: 4, visible: true },
  { i: 'durationWidget',     x: 19, y: 6,  w: 5,  h: 3,  minW: 3, minH: 3, visible: true },
  { i: 'timeChart',          x: 14, y: 9,  w: 10, h: 6,  minW: 3, minH: 5, visible: true },
  { i: 'underwater',         x: 14, y: 15, w: 10, h: 5,  minW: 4, minH: 4, visible: true },
  { i: 'categoryCharts',     x: 14, y: 20, w: 10, h: 4,  minW: 3, minH: 4, visible: true },
];

// Human-readable labels for the editor overlay.
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

export function loadLayout() {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return DEFAULT_LAYOUT.map(it => ({ ...it }));
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_LAYOUT.map(it => ({ ...it }));

    // Merge with defaults so newly-added panels are automatically included
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
  } catch {}
}

export function resetLayout() {
  try {
    localStorage.removeItem(LAYOUT_KEY);
  } catch {}
}

// Editor-only view of the layout: everything visible so user can toggle.
export function layoutForEditor(layout) {
  return layout.map(it => ({ ...it, visible: it.visible !== false }));
}

// Main-view layout: strip invisible items so the grid auto-flows the rest.
export function layoutForDisplay(layout) {
  return layout.filter(it => it.visible !== false);
}