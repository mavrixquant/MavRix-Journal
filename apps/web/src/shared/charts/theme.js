
export const chartColors = {
  win: '#35C4A1',
  winHover: '#45D1AD',
  loss: '#FF5C5C',
  lossHover: '#FF7070',
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

  grid: '#1A2029',
  zeroLine: 'rgba(255,255,255,.16)',
  threshold: 'rgba(239,68,68,.60)',

  tooltipBg: '#11151F',
  tooltipBorder: '#212836',
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

export const decimationConfig = {
  enabled: true,
  algorithm: 'lttb',
  samples: 500,
};

export const baseAnimation = { duration: 300, easing: 'easeOutQuart' };