// Chart.js theme — refined tooltips, softer grid, consistent typography.
// Same exports as before (chartColors, chartFonts, getChartColors, baseTooltip,
// baseAxis, baseCategoryAxis, baseLegend, decimationConfig, baseAnimation),
// so every chart that imports from here keeps working.

export const chartColors = {
  win: '#35C4A1',
  winHover: '#4DD6B3',
  loss: '#FF5C5C',
  lossHover: '#FF7676',
  be: '#6C7686',

  amber: '#FFB020',
  amberHover: '#FFC04D',
  amberSoft: 'rgba(255,176,32,.18)',
  amberSoft2: 'rgba(255,176,32,.08)',
  amberFill: 'rgba(255,176,32,.28)',

  blue: '#4C8BF5',
  blueHover: '#609AF8',

  text: '#8892A3',
  textLight: '#E7E9EE',
  textDim: '#545E6E',

  grid: 'rgba(255,255,255,.05)',
  zeroLine: 'rgba(255,255,255,.18)',
  threshold: 'rgba(239,68,68,.60)',

  tooltipBg: 'rgba(10,13,20,.96)',
  tooltipBorder: 'rgba(255,255,255,.12)',
};

export const chartFonts = {
  mono: "'IBM Plex Mono', ui-monospace, monospace",
  display: "'Space Grotesk', sans-serif",
  body: "'Inter', sans-serif",
};

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

export function baseTooltip(overrides = {}) {
  return {
    enabled: true,
    backgroundColor: chartColors.tooltipBg,
    borderColor: chartColors.tooltipBorder,
    borderWidth: 1,
    padding: { top: 10, right: 12, bottom: 10, left: 12 },
    cornerRadius: 10,
    caretSize: 0,
    caretPadding: 8,
    bodySpacing: 5,
    titleMarginBottom: 8,
    displayColors: false,
    titleColor: chartColors.textLight,
    titleFont: { family: chartFonts.body, size: 12, weight: '600' },
    bodyColor: chartColors.text,
    bodyFont: { family: chartFonts.mono, size: 11 },
    ...overrides,
  };
}

export function baseAxis(overrides = {}) {
  return {
    grid: { color: chartColors.grid, drawBorder: false, drawTicks: false },
    border: { display: false },
    ticks: {
      color: chartColors.text,
      font: { family: chartFonts.mono, size: 10 },
      padding: 8,
    },
    ...overrides,
  };
}

export function baseCategoryAxis(overrides = {}) {
  return {
    grid: { display: false },
    border: { display: false },
    ticks: {
      color: chartColors.text,
      font: { family: chartFonts.body, size: 11, weight: 500 },
      padding: 6,
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

export const decimationConfig = {
  enabled: true,
  algorithm: 'lttb',
  samples: 500,
};

export const baseAnimation = { duration: 380, easing: 'easeOutQuart' };
