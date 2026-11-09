const PREFIX = 'mavrix:calc:v1:';
const RECENT = 'mavrix:calc:recent';

export function loadValues(id) {
  try {
    const raw = localStorage.getItem(PREFIX + id);
    const obj = raw ? JSON.parse(raw) : null;
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

export function saveValues(id, values) {
  try {
    localStorage.setItem(PREFIX + id, JSON.stringify(values));
  } catch {
    /* storage unavailable — inputs just won't persist */
  }
}

export function getRecent() {
  try {
    const a = JSON.parse(localStorage.getItem(RECENT) || '[]');
    // older versions stored "category/id" — keep only the id
    return Array.isArray(a) ? [...new Set(a.map((k) => String(k).split('/').pop()))] : [];
  } catch {
    return [];
  }
}

export function pushRecent(key) {
  try {
    const next = [key, ...getRecent().filter((k) => k !== key)].slice(0, 6);
    localStorage.setItem(RECENT, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/* ---------- pinned (favourite) calculators ---------- */
const PINS = 'mavrix:calc:pins';
export const PINS_EVENT = 'mavrix:calc:pins-changed';

export function getPinned() {
  try {
    const a = JSON.parse(localStorage.getItem(PINS) || '[]');
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

export function togglePinned(id) {
  try {
    const cur = getPinned();
    const next = cur.includes(id) ? cur.filter((k) => k !== id) : [...cur, id];
    localStorage.setItem(PINS, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(PINS_EVENT));
}
