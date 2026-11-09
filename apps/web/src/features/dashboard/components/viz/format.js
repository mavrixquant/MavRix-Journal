export const nf = (v, d = 2) =>
  Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

export function fmtMoney(v, { sign = true, d = 2 } = {}) {
  if (v == null || Number.isNaN(v)) return '—';
  const s = v < 0 ? '-' : sign ? '+' : '';
  return `${s}$${nf(Math.abs(v), d)}`;
}

export function fmtR(v, { sign = true, d = 2 } = {}) {
  if (v == null || Number.isNaN(v)) return '—';
  const s = v < 0 ? '-' : sign ? '+' : '';
  return `${s}${nf(Math.abs(v), d)}R`;
}

export const makeFmt = (isMoney) => (isMoney ? fmtMoney : fmtR);

export const fmtPct = (v, d = 1) => (v == null || Number.isNaN(v) ? '—' : `${v.toFixed(d)}%`);

/** Compact axis label: $1.2k, -3.5R */
export function fmtCompact(v, isMoney) {
  if (v == null || Number.isNaN(v)) return '';
  const a = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  let body;
  if (a >= 1e6) body = `${(a / 1e6).toFixed(1)}M`;
  else if (a >= 1e4) body = `${(a / 1e3).toFixed(0)}k`;
  else if (a >= 1e3) body = `${(a / 1e3).toFixed(1)}k`;
  else if (a >= 100) body = a.toFixed(0);
  else if (a >= 10) body = a.toFixed(1).replace(/\.0$/, '');
  else body = a.toFixed(2).replace(/\.?0+$/, '') || '0';
  return isMoney ? `${sign}$${body}` : `${sign}${body}R`;
}

const parseDate = (s) => {
  if (!s || typeof s !== 'string') return null;
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

export function shortDate(s) {
  const d = parseDate(s);
  return d ? d.toLocaleString('en-US', { month: 'short', day: 'numeric' }) : '';
}

export function longDate(s) {
  const d = parseDate(s);
  return d ? d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '';
}

export const toneOf = (v) => (v > 0 ? 'pos' : v < 0 ? 'neg' : 'flat');
export const toneColor = (v) => (v > 0 ? 'var(--d-win)' : v < 0 ? 'var(--d-loss)' : 'var(--d-ink-2)');
