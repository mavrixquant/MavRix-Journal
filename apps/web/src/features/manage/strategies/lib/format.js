export function money(v, { sign = false, compact = false } = {}) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  const abs = Math.abs(n);
  const body = compact && abs >= 10000
    ? `${(abs / 1000).toFixed(abs >= 100000 ? 0 : 1)}k`
    : abs.toLocaleString('en-US', { minimumFractionDigits: abs < 100 && abs % 1 ? 2 : 0, maximumFractionDigits: 2 });
  const s = n < 0 ? '-' : sign && n > 0 ? '+' : '';
  return `${s}$${body}`;
}

export const pct = (v, d = 1) => (v == null || Number.isNaN(Number(v)) ? '—' : `${Number(v).toFixed(d)}%`);

export function pf(stats) {
  if (!stats) return '—';
  if (stats.profitFactor != null) return stats.profitFactor.toFixed(2);
  return stats.profitFactorInfinite ? '∞' : '—';
}

export function minutes(m) {
  if (!m) return '—';
  if (m < 60) return `${Math.round(m)}m`;
  return `${Math.floor(m / 60)}h ${Math.round(m % 60)}m`;
}

export function fmtDate(v, opts = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!v) return '—';
  const d = typeof v === 'string' && v.length === 10 ? new Date(`${v}T00:00:00`) : new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', opts);
}

export function timeAgo(dateStr) {
  if (!dateStr) return 'No trades yet';
  const days = Math.floor((Date.now() - new Date(`${dateStr}T00:00:00`).getTime()) / 86400000);
  if (days <= 0) return 'Traded today';
  if (days === 1) return 'Traded yesterday';
  if (days < 30) return `Traded ${days}d ago`;
  if (days < 365) return `Traded ${Math.floor(days / 30)}mo ago`;
  return `Traded ${Math.floor(days / 365)}y ago`;
}

export const tone = (v) => (v > 0 ? 'pos' : v < 0 ? 'neg' : 'flat');

// Date-range presets → { from } (ISO yyyy-mm-dd). "to" is always open.
export const RANGES = [
  { id: 'all', label: 'All time' },
  { id: '30d', label: '30D' },
  { id: '90d', label: '90D' },
  { id: 'ytd', label: 'YTD' },
  { id: '1y', label: '1Y' },
];
export function rangeToFilter(id) {
  const now = new Date();
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const back = (n) => { const d = new Date(now); d.setDate(d.getDate() - n); return iso(d); };
  if (id === '30d') return { from: back(30) };
  if (id === '90d') return { from: back(90) };
  if (id === '1y') return { from: back(365) };
  if (id === 'ytd') return { from: `${now.getFullYear()}-01-01` };
  return {};
}
export const ACCOUNT_SCOPES = ['all', 'Live', 'Demo', 'Backtest'];
