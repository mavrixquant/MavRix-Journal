// apps/web/src/shared/charts/theme.js
//
// Single source of truth for every chart's visual language.
//
// Non-accent colors are stable constants — change one here and every
// chart updates on next render.
//
// ACCENT COLOR
// ------------
// The `amber*` fields below are LEGACY. They are pinned at the default
// chart amber and DO NOT follow the user's accent preference.
//
// Any chart component that needs an accent color which tracks the user's
// choice MUST use the useChartColors() hook instead:
//
//   import { useChartColors } from '@/shared/charts';
//
//   function MyChart() {
//     const colors = useChartColors();
//     // colors.amber / colors.amberHover / colors.amberSoft / colors.amberFill
//   }
//
// useChartColors() reads the live --accent* CSS custom properties off
// <html> and re-renders the consuming component whenever they change.

export const chartColors = {
  // Semantic
  win: '#35C4A1',
  winHover: '#45D1AD',
  loss: '#FF5C5C',
  lossHover: '#FF7070',
  be: '#6C7686',

  // Accent — LEGACY DEFAULT ONLY. Use useChartColors() for accent-tracking.
  amber: '#FFB020',
  amberHover: '#FFC04D',
  amberSoft: 'rgba(255,176,32,.18)',
  amberSoft2: 'rgba(255,176,32,.08)',
  amberFill: 'rgba(255,176,32,.28)',

  // Blue (actual-path overlay in FanChart)
  blue: '#4C8BF5',
  blueHover: '#609AF8',

  // Text
  text: '#8892A3',
  textLight: '#E7E9EE',
  textDim: '#545E6E',

  // Surfaces
  grid: '#1A2029',
  zeroLine: 'rgba(255,255,255,.16)',
  threshold: 'rgba(239,68,68,.60)',

  // Tooltip
  tooltipBg: '#11151F',
  tooltipBorder: '#212836',
};

export const chartFonts = {
  mono: "'IBM Plex Mono', ui-monospace, monospace",
  display: "'Space Grotesk', sans-serif",
  body: "'Inter', sans-serif",
};

/* ------------------------------------------------------------------ */
/*  Pure helpers — for non-hook contexts (workers, tests, SSR).        */
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

function lightenHex(hex, amount = 60) {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return hex;
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp(parseInt(h.slice(0, 2), 16) + amount);
  const g = clamp(parseInt(h.slice(2, 4), 16) + amount);
  const b = clamp(parseInt(h.slice(4, 6), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Given an accent hex, return a full chart-color palette anchored on it.
 * Prefer useChartColors() inside React components — this is a pure
 * helper for non-hook contexts only.
 *
 * @param {string} [accentHex]  e.g. "#4C8BF5". Defaults to chartColors.amber.
 */
export function getChartColors(accentHex) {
  const accent = accentHex || chartColors.amber;
  return {
    ...chartColors,
    amber: accent,
    amberHover: lightenHex(accent, 60),
    amberSoft: hexToRgba(accent, 0.18),
    amberSoft2: hexToRgba(accent, 0.08),
    amberFill: hexToRgba(accent, 0.28),
  };
}

/* ------------------------------------------------------------------ */
/*  Reusable option fragments                                          */
/* ------------------------------------------------------------------ */

export function baseTooltip(overrides = {}) {
  return {
    enabled: true,
    backgroundColor: chartColors.tooltipBg,
    borderColor: chartColors.tooltipBorder,
    borderWidth: 1,
    padding: 12,
    cornerRadius: 8,
    bodySpacing: 4,
    displayColors: false,
    titleColor: chartColors.textLight,
    titleFont: { family: chartFonts.display, size: 12, weight: '600' },
    bodyColor: chartColors.text,
    bodyFont: { family: chartFonts.mono, size: 11 },
    ...overrides,
  };
}

export function baseAxis(overrides = {}) {
  return {
    grid: { color: chartColors.grid, drawBorder: false },
    ticks: {
      color: chartColors.text,
      font: { family: chartFonts.mono, size: 10 },
    },
    ...overrides,
  };
}

export function baseCategoryAxis(overrides = {}) {
  return {
    grid: { display: false },
    ticks: {
      color: chartColors.textLight,
      font: { family: chartFonts.body, size: 11, weight: 500 },
    },
    ...overrides,
  };
}

export function baseLegend(overrides = {}) {
  return {
    display: true,
    position: 'top',
    align: 'end',
    labels: {
      color: chartColors.text,
      boxWidth: 8,
      boxHeight: 8,
      usePointStyle: true,
      pointStyle: 'circle',
      font: { family: chartFonts.body, size: 11, weight: 500 },
      padding: 16,
    },
    ...overrides,
  };
}

/** Chart.js v4 built-in decimation config (LTTB algorithm). */
export const decimationConfig = {
  enabled: true,
  algorithm: 'lttb',
  samples: 500,
};

/** Standard animation config to keep interactions snappy. */
export const baseAnimation = { duration: 300, easing: 'easeOutQuart' };