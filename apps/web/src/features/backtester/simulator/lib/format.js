// Number / unit formatting for the Simulator. ASCII-safe on purpose (no
// special dashes) so nothing can turn into mojibake in exports or tooltips.

export const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

const moneyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const moneyFmt2 = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const NA = '--';

/** Signed unit value: +$1,234 / -2.45R. `dp` forces decimals. */
export function fmtUnit(v, isMoney, { sign = false, dp } = {}) {
  if (!isNum(v)) return NA;
  const s = v < 0 ? '-' : sign && v > 0 ? '+' : '';
  const abs = Math.abs(v);
  if (isMoney) {
    const f = dp === 2 || abs < 100 ? moneyFmt2 : moneyFmt;
    return `${s}${f.format(abs)}`;
  }
  return `${s}${abs.toFixed(dp ?? 2)}R`;
}

/** Short axis label: $1.2k / 12R */
export function fmtAxis(v, isMoney) {
  if (!isNum(v)) return '';
  const abs = Math.abs(v);
  const s = v < 0 ? '-' : '';
  if (isMoney) {
    if (abs >= 1e6) return `${s}$${(abs / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${s}$${(abs / 1e3).toFixed(abs >= 1e4 ? 0 : 1)}k`;
    return `${s}$${abs.toFixed(0)}`;
  }
  return `${s}${abs >= 100 ? abs.toFixed(0) : abs.toFixed(abs % 1 ? 1 : 0)}R`;
}

export const plural = (n, one, many = `${one}s`) => (Math.round(n) === 1 ? one : many);
export const fmtPct = (v, dp = 1) => (isNum(v) ? `${v.toFixed(dp)}%` : NA);
export const fmtInt = (v) => (isNum(v) ? Math.round(v).toLocaleString('en-US') : NA);
export const fmtNum = (v, dp = 2) => (isNum(v) ? v.toFixed(dp) : NA);
export const fmtRatio = (v, dp = 2) =>
  v === Infinity ? 'inf' : isNum(v) ? v.toFixed(dp) : NA;

/** "1 in 8" style odds from a percentage. */
export function oddsOneIn(pct) {
  if (!isNum(pct) || pct <= 0) return null;
  if (pct >= 50) return `${Math.round(pct)} in 100`;
  return `1 in ${Math.max(2, Math.round(100 / pct))}`;
}

export function fmtBytes(bytes) {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  if (bytes >= 1e6) return `${Math.round(bytes / 1e6)} MB`;
  return `${Math.max(1, Math.round(bytes / 1e3))} KB`;
}

export function parseNumberList(text) {
  // "2,500" / "1,250,000" are thousands separators; "500, 1000" (comma + space) is a list.
  let t = String(text ?? '');
  let prev;
  do {
    prev = t;
    t = t.replace(/(\d),(\d{3})(?!\d)/g, '$1$2');
  } while (t !== prev);
  return t
    .split(/[\s,;]+/)
    .map((tok) => Number(tok.replace(/[$,]/g, '')))
    .filter((n) => Number.isFinite(n) && n > 0);
}
