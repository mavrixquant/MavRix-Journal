export const chartTheme = {
  background: 'transparent',

  text: '#8892A3',
  textLight: '#E7E9EE',
  border: 'rgba(255,255,255,.09)',
  grid: 'rgba(255,255,255,.04)',
  crosshair: 'rgba(255,255,255,.30)',

  up: '#35C4A1',
  down: '#FF5C5C',
  upWick: '#2BB392',
  downWick: '#F04747',

  volumeUp: 'rgba(53, 196, 161, 0.42)',
  volumeDown: 'rgba(255, 92, 92, 0.42)',

  get accent() {
    if (typeof window === 'undefined') return '#F59E0B';
    return (
      getComputedStyle(document.documentElement)
        .getPropertyValue('--accent')
        .trim() || '#F59E0B'
    );
  },
};

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
    mode: 0,
    vertLine: {
      color: chartTheme.crosshair,
      width: 1,
      style: 2,
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
