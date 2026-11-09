const grp = (n, min, max) =>
  n.toLocaleString('en-US', { minimumFractionDigits: min, maximumFractionDigits: max });

const isZero = (v, d) => Number(Math.abs(v).toFixed(d)) === 0;
const sg = (v, d, plus = false) => (isZero(v, d) ? '' : v < 0 ? '−' : plus ? '+' : '');

/** Display formatting. kinds: money · int · pct · r · x · price · num · text */
export function formatValue(v, kind = 'num', d) {
  if (typeof v === 'string') return v;
  if (!Number.isFinite(v)) return '—';
  const a = Math.abs(v);
  switch (kind) {
    case 'money': {
      const dd = d ?? 2;
      return `${sg(v, dd)}$${grp(a, dd, dd)}`;
    }
    case 'int':
      return `${sg(v, 0)}${grp(Math.round(a), 0, 0)}`;
    case 'pct': {
      const dd = d ?? 2;
      return `${sg(v, dd)}${grp(a, dd, dd)}%`;
    }
    case 'r': {
      const dd = d ?? 2;
      return `${sg(v, dd, true)}${grp(a, dd, dd)}R`;
    }
    case 'x': {
      const dd = d ?? 2;
      return `${grp(v, dd, dd)}×`;
    }
    case 'price': {
      const dd = d ?? 2;
      return `${sg(v, dd)}${grp(a, dd, dd)}`;
    }
    default: {
      const dd = d ?? 4;
      return `${sg(v, dd)}${grp(a, 0, dd)}`;
    }
  }
}

/** Plain, paste-friendly value (no grouping, no symbols). */
export function rawValue(v, kind = 'num', d) {
  if (typeof v === 'string') return v;
  if (!Number.isFinite(v)) return '';
  if (kind === 'int') return String(Math.round(v));
  const dd = d ?? (kind === 'num' ? 4 : 2);
  const s = v.toFixed(dd);
  return kind === 'num' ? String(Number(s)) : s;
}
