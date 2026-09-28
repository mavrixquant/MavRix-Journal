// apps/web/src/shared/charts/theme.js
//
// Single source of truth for every chart's visual language.
// Change a color here → every chart updates on next render.

export const chartColors = {
  // Semantic
  win: '#35C4A1',
  winHover: '#45D1AD',
  loss: '#FF5C5C',
  lossHover: '#FF7070',
  be: '#6C7686',

  // Accent (amber)
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