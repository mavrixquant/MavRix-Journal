/* Pure helpers shared by every calculator. No React, no DOM. */

/** "1,250.5" -> 1250.5 · "" / junk -> NaN */
export const num = (s) => {
  if (typeof s === 'number') return Number.isFinite(s) ? s : NaN;
  const t = String(s ?? '').replace(/[,\s]/g, '');
  if (t === '' || t === '-' || t === '.' || t === '-.') return NaN;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
};

/** true when every argument is a finite number */
export const ok = (...a) => a.every((x) => typeof x === 'number' && Number.isFinite(x));

export const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

export const decimalsOf = (step) => {
  if (!Number.isFinite(step) || step <= 0) return 2;
  const s = String(step);
  if (s.includes('e-')) {
    const [m, e] = s.split('e-');
    return Math.min(10, Number(e) + (m.split('.')[1]?.length ?? 0));
  }
  const i = s.indexOf('.');
  return i < 0 ? 0 : Math.min(8, s.length - i - 1);
};

export const roundTick = (x, tick, mode = 'round') => {
  const q = x / tick;
  const n =
    mode === 'floor' ? Math.floor(q + 1e-9) : mode === 'ceil' ? Math.ceil(q - 1e-9) : Math.round(q);
  return Number((n * tick).toFixed(decimalsOf(tick) + 2));
};

/** "21020, 50\n21040 25" -> [[21020,50],[21040,25]] */
export const parseLines = (text) =>
  String(text ?? '')
    .split(/\n|;/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split(/[\s,@:|]+/).filter(Boolean).map(num));

/* ---------- normal distribution ---------- */
export const normPdf = (x) => Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI);

export function normCdf(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp((-x * x) / 2);
  const p =
    d * t * (0.31938153 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x > 0 ? 1 - p : p;
}

/* ---------- Black-Scholes-Merton (continuous dividend yield q) ---------- */
export function blackScholes({ type, S, K, T, sigma, r, q }) {
  const sq = sigma * Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r - q + (sigma * sigma) / 2) * T) / sq;
  const d2 = d1 - sq;
  const eq = Math.exp(-q * T);
  const er = Math.exp(-r * T);
  const call = type === 'call';
  const price = call
    ? S * eq * normCdf(d1) - K * er * normCdf(d2)
    : K * er * normCdf(-d2) - S * eq * normCdf(-d1);
  const delta = call ? eq * normCdf(d1) : eq * (normCdf(d1) - 1);
  const gamma = (eq * normPdf(d1)) / (S * sq);
  const vega = (S * eq * normPdf(d1) * Math.sqrt(T)) / 100;
  const common = -(S * eq * normPdf(d1) * sigma) / (2 * Math.sqrt(T));
  const theta =
    (call
      ? common - r * K * er * normCdf(d2) + q * S * eq * normCdf(d1)
      : common + r * K * er * normCdf(-d2) - q * S * eq * normCdf(-d1)) / 365;
  const rho = ((call ? K * T * er * normCdf(d2) : -K * T * er * normCdf(-d2))) / 100;
  const pITM = call ? normCdf(d2) : normCdf(-d2);
  return { price, delta, gamma, vega, theta, rho, pITM };
}

/**
 * Risk of ruin for a fixed-R random walk: win = +rr, loss = -1.
 * Ruin = losing `units` R. P = θ^units where p·θ^rr + (1-p)/θ = 1, θ in (0,1).
 */
export function ruinProbability(p, rr, units) {
  const mean = p * rr - (1 - p);
  if (mean <= 0) return 1;
  let lo = 1e-12;
  let hi = 1 - 1e-12;
  for (let i = 0; i < 100; i += 1) {
    const mid = (lo + hi) / 2;
    const f = p * mid ** rr + (1 - p) / mid - 1;
    if (f > 0) lo = mid;
    else hi = mid;
  }
  return hi ** units;
}

/** P(at least one run of k losses in n trades), loss prob = pl */
export function probStreak(n, k, pl) {
  let dp = new Array(k).fill(0);
  dp[0] = 1;
  let hit = 0;
  for (let i = 0; i < n; i += 1) {
    const next = new Array(k).fill(0);
    for (let r = 0; r < k; r += 1) {
      const pr = dp[r];
      if (!pr) continue;
      next[0] += pr * (1 - pl);
      if (r + 1 === k) hit += pr * pl;
      else next[r + 1] += pr * pl;
    }
    dp = next;
  }
  return hit;
}

/** returns in % per period */
export function performanceStats(rets, ppy, rfAnnual) {
  const n = rets.length;
  const mean = rets.reduce((a, b) => a + b, 0) / n;
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);
  const sd = Math.sqrt(variance);
  const rf = (Number.isFinite(rfAnnual) ? rfAnnual : 0) / ppy;
  const downside = Math.sqrt(rets.reduce((a, b) => a + Math.min(0, b - rf) ** 2, 0) / n);
  let eq = 1;
  let peak = 1;
  let maxDD = 0;
  rets.forEach((r) => {
    eq *= 1 + r / 100;
    peak = Math.max(peak, eq);
    maxDD = Math.max(maxDD, (peak - eq) / peak);
  });
  const years = n / ppy;
  return {
    n,
    mean,
    sd,
    sharpe: sd > 0 ? ((mean - rf) / sd) * Math.sqrt(ppy) : NaN,
    sortino: downside > 0 ? ((mean - rf) / downside) * Math.sqrt(ppy) : NaN,
    maxDD: maxDD * 100,
    total: (eq - 1) * 100,
    cagr: eq > 0 && years > 0 ? (eq ** (1 / years) - 1) * 100 : NaN,
    winRate: (rets.filter((r) => r > 0).length / n) * 100,
    best: Math.max(...rets),
    worst: Math.min(...rets),
  };
}
