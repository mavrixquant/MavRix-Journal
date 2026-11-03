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
    return Array.isArray(a) ? a : [];
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
