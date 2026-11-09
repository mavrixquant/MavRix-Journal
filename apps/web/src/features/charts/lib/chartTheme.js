export const chartTheme = {
  background: 'transparent',

  text: '#8892A3',
  textLight: '#E7E9EE',
  border: 'rgba(255,255,255,.09)',
  grid: 'rgba(255,255,255,.035)',
  crosshair: 'rgba(255,255,255,.30)',

  up: '#35C4A1',
  down: '#FF5C5C',
  upWick: '#2BB392',
  downWick: '#F04747',

  volumeUp: 'rgba(53, 196, 161, 0.32)',
  volumeDown: 'rgba(255, 92, 92, 0.32)',

  get accent() {
    if (typeof window === 'undefined') return '#F59E0B';
    return (
      getComputedStyle(document.documentElement)
        .getPropertyValue('--accent')
        .trim() || '#F59E0B'
    );
  },
};

// '#RRGGBB' + alpha -> rgba(); other formats pass through untouched.
export function alpha(color, a) {
  const c = String(color || '');
  if (c.startsWith('#') && c.length === 7) {
    const r = parseInt(c.slice(1, 3), 16);
    const g = parseInt(c.slice(3, 5), 16);
    const b = parseInt(c.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
  return c;
}

// Decimal places for the price scale, by instrument.
export function pricePrecision(symbolInfo, code) {
  const sym = String(code || symbolInfo?.code || '').toUpperCase();
  if (symbolInfo?.category === 'Forex') return sym.includes('JPY') ? 3 : 5;
  return 2;
}
