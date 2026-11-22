// Persisted defaults for NEW drawings ("Save as default" in the drawing settings).
// Only the style is stored — the colour still follows the colour picker in the rail.
const KEY = 'mavrix:chart:drawing-defaults:v1';

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}

export function loadDrawingDefaults(type) {
  const v = read()[type];
  return v && typeof v === 'object' ? v : null;
}

export function saveDrawingDefaults(type, style) {
  try {
    const all = read();
    all[type] = style;
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* storage unavailable */ }
}

export function clearDrawingDefaults(type) {
  try {
    const all = read();
    delete all[type];
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch { /* storage unavailable */ }
}

export const hasDrawingDefaults = (type) => !!loadDrawingDefaults(type);

// Colours the user picked recently (shown first in the palette).
const RECENT_KEY = 'mavrix:chart:recent-colors:v1';
export const RECENT_MAX = 10;

export function loadRecentColors() {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY));
    return Array.isArray(v) ? v.filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, RECENT_MAX) : [];
  } catch { return []; }
}

export function pushRecentColor(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex || '')) return loadRecentColors();
  const next = [hex.toLowerCase(), ...loadRecentColors().filter((c) => c.toLowerCase() !== hex.toLowerCase())].slice(0, RECENT_MAX);
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
  return next;
}
