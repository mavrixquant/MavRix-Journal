// apps/web/src/features/charts/lib/chartTheme.js
//
// Lightweight-charts color tokens. Deliberately mirrors
// @/shared/charts/theme.js so the market chart looks like every other
// chart in the app.

export const chartTheme = {
  // Canvas
  background: 'transparent',

  // Text + chrome
  text: '#8892A3',
  textLight: '#E7E9EE',
  border: 'rgba(255,255,255,.085)',
  grid: 'rgba(255,255,255,.045)',
  crosshair: 'rgba(255,255,255,.28)',

  // Candles
  up: '#35C4A1',
  down: '#FF5C5C',
  upWick: '#35C4A1',
  downWick: '#FF5C5C',

  // Volume histogram (overlaid at bottom)
  volumeUp: 'rgba(53, 196, 161, 0.42)',
  volumeDown: 'rgba(255, 92, 92, 0.42)',

  // Accent (labels on crosshair, price axis)
  accent: '#F59E0B',
};

/** Chart-creation options shared by every instance. */
export const baseChartOptions = {
  layout: {
    background: { type: 'solid', color: 'transparent' },
    textColor: chartTheme.text,
    fontFamily: "'IBM Plex Mono', ui-monospace, monospace",
    fontSize: 11,
    attributionLogo: false,
  },
  grid: {
    vertLines: { color: chartTheme.grid },
    horzLines: { color: chartTheme.grid },
  },
  rightPriceScale: {
    borderColor: chartTheme.border,
    // Leave room at the bottom for the volume histogram.
    scaleMargins: { top: 0.08, bottom: 0.24 },
  },
  timeScale: {
    borderColor: chartTheme.border,
    timeVisible: true,
    secondsVisible: false,
    rightOffset: 6,
    barSpacing: 8,
    minBarSpacing: 0.5,
  },
  crosshair: {
    mode: 0, // Normal
    vertLine: {
      color: chartTheme.crosshair,
      width: 1,
      style: 2, // dashed
      labelBackgroundColor: chartTheme.accent,
    },
    horzLine: {
      color: chartTheme.crosshair,
      width: 1,
      style: 2,
      labelBackgroundColor: chartTheme.accent,
    },
  },
  handleScroll: true,
  handleScale: true,
  autoSize: true,
};