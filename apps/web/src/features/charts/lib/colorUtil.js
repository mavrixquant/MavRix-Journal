// Tiny colour helpers shared by the drawing / indicator settings.

const HEX6 = /^#([0-9a-f]{6})$/i;
const HEX3 = /^#([0-9a-f]{3})$/i;
const RGBA = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i;

const h2 = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');

/** Any CSS colour we use -> { hex: '#rrggbb', alpha: 0..1 }. */
export function parseColor(c, fallback = '#E7E9EE') {
  if (typeof c !== 'string') return { hex: fallback, alpha: 1 };
  const s = c.trim();
  if (HEX6.test(s)) return { hex: s.toLowerCase(), alpha: 1 };
  const m3 = s.match(HEX3);
  if (m3) return { hex: `#${m3[1].split('').map((x) => x + x).join('')}`.toLowerCase(), alpha: 1 };
  const m = s.match(RGBA);
  if (m) return { hex: `#${h2(m[1])}${h2(m[2])}${h2(m[3])}`, alpha: m[4] == null ? 1 : Math.max(0, Math.min(1, Number(m[4]))) };
  return { hex: fallback, alpha: 1 };
}

/** '#rrggbb' + alpha -> rgba() string (or the hex itself when opaque). */
export function composeColor(hex, alpha = 1) {
  const { hex: h } = parseColor(hex);
  if (alpha >= 0.999) return h;
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${Math.round(alpha * 100) / 100})`;
}

export const withAlphaColor = (c, a) => composeColor(parseColor(c).hex, a);

export const isHexColor = (s) => HEX6.test(String(s || '').trim());

/** 'solid' | 'dashed' | 'dotted' -> canvas dash pattern (scaled by line width). */
export function dashPattern(kind, width = 1.5) {
  const w = Math.max(1, width);
  if (kind === 'dashed') return [w * 4, w * 2.5];
  if (kind === 'dotted') return [w, w * 2];
  return [];
}

export const LINE_STYLES = [
  { id: 'solid', label: 'Solid' },
  { id: 'dashed', label: 'Dashed' },
  { id: 'dotted', label: 'Dotted' },
];
