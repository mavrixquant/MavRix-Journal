/** Small formatting helpers shared by the whole backtester feature. */

export const fmtMoney = (v, currency = 'USD', opts = {}) => {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: opts.digits ?? 2,
      minimumFractionDigits: opts.digits ?? 2,
    }).format(Number(v));
  } catch {
    return `${Number(v).toFixed(2)} ${currency}`;
  }
};

export const fmtSigned = (v, currency = 'USD', opts = {}) => {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  const n = Number(v);
  const s = fmtMoney(Math.abs(n), currency, opts);
  if (n > 0) return `+${s}`;
  if (n < 0) return `−${s}`;
  return s;
};

export const fmtCompact = (v, currency = 'USD') => {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  const n = Number(v);
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : n > 0 ? '+' : '';
  let body;
  if (abs >= 1_000_000) body = `${(abs / 1_000_000).toFixed(2)}M`;
  else if (abs >= 10_000) body = `${(abs / 1000).toFixed(1)}k`;
  else if (abs >= 1000) body = `${(abs / 1000).toFixed(2)}k`;
  else body = abs.toFixed(abs >= 100 ? 0 : 2);
  return `${sign}${currency === 'USD' ? '$' : ''}${body}`;
};

export const fmtPct = (v, d = 1) =>
  v == null || !Number.isFinite(Number(v)) ? '—' : `${Number(v).toFixed(d)}%`;

export const fmtSignedPct = (v, d = 2) => {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  const n = Number(v);
  return `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(d)}%`;
};

export const fmtNum = (v, d = 2) =>
  v == null || !Number.isFinite(Number(v)) ? '—' : Number(v).toFixed(d);

export const fmtR = (v) =>
  v == null || !Number.isFinite(Number(v)) ? '—' : `${Number(v) >= 0 ? '+' : '−'}${Math.abs(Number(v)).toFixed(2)}R`;

export const fmtPF = (v) => {
  if (v == null) return '—';
  if (v === Infinity) return '∞';
  return Number.isFinite(v) ? v.toFixed(2) : '—';
};

export function fmtDuration(mins) {
  if (mins == null || !Number.isFinite(mins) || mins <= 0) return '—';
  if (mins < 60) return `${Math.round(mins)}m`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h < 24) return m ? `${h}h ${m}m` : `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

export const toneOf = (v) => (v > 0 ? 'pos' : v < 0 ? 'neg' : '');

export const pricePrecisionFor = (symInfo, symbol) => {
  const p = symInfo?.precision ?? symInfo?.digits;
  if (Number.isFinite(p)) return p;
  const s = String(symbol || '').toUpperCase();
  if (/^(6[A-Z]|EUR|GBP|AUD|NZD|USD|CAD|CHF|JPY)/.test(s)) return 5;
  return 2;
};
