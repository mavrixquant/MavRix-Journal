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
