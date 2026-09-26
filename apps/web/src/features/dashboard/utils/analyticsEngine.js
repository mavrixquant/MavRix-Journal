// src/utils/analyticsEngine.js
// Series builders used by dashboard charts.
// Pure functions — take stats.outcomes (already scored), return plain data.

// --- Monthly series ---
// Returns [{ month: 'YYYY-MM', total, n, wins, winRate }] sorted ascending.
export function buildMonthlySeries(outcomes) {
  if (!outcomes || outcomes.length === 0) return [];
  const map = new Map();
  outcomes.forEach(o => {
    const key = o.date ? o.date.slice(0, 7) : null;
    if (!key) return;
    if (!map.has(key)) map.set(key, { month: key, total: 0, n: 0, wins: 0 });
    const e = map.get(key);
    e.total += o.score ?? 0;
    e.n += 1;
    if (o.result === 'win') e.wins += 1;
  });
  return [...map.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map(m => ({
      ...m,
      total: +m.total.toFixed(2),
      winRate: m.n ? (m.wins / m.n) * 100 : 0,
    }));
}

// --- Rolling expectancy ---
// Returns [{ idx, date, value }] where value = mean(score) over trailing `window`.
// Length = max(0, n - window + 1).
export function buildRollingExpectancy(outcomes, window = 20) {
  if (!outcomes || outcomes.length < window) return [];
  const out = [];
  let sum = 0;
  for (let i = 0; i < outcomes.length; i++) {
    sum += outcomes[i].score ?? 0;
    if (i >= window) sum -= outcomes[i - window].score ?? 0;
    if (i >= window - 1) {
      out.push({
        idx: i + 1,
        date: outcomes[i].date,
        value: +(sum / window).toFixed(4),
      });
    }
  }
  return out;
}

// --- Underwater curve ---
// Returns [{ idx, date, y, peak, equity }] where y = cum − peak (≤ 0).
export function buildUnderwaterCurve(outcomes) {
  if (!outcomes || outcomes.length === 0) return [];
  let cum = 0, peak = 0;
  return outcomes.map((o, i) => {
    cum += o.score ?? 0;
    peak = Math.max(peak, cum);
    const dd = cum - peak;
    return {
      idx: i + 1,
      date: o.date,
      y: +dd.toFixed(2),
      peak: +peak.toFixed(2),
      equity: +cum.toFixed(2),
    };
  });
}

// --- Symbol breakdown ---
// Returns [{ symbol, n, winRate, total, avgWin, avgLoss, profitFactor }] sorted by total desc.
export function buildSymbolBreakdown(outcomes) {
  if (!outcomes || outcomes.length === 0) return [];
  const map = new Map();
  outcomes.forEach(o => {
    const sym = o.symbol || '—';
    if (!map.has(sym)) map.set(sym, { symbol: sym, wins: [], losses: [], total: 0 });
    const e = map.get(sym);
    const s = o.score ?? 0;
    e.total += s;
    if (o.result === 'win') e.wins.push(s);
    else if (o.result === 'loss') e.losses.push(s);
  });
  return [...map.values()]
    .map(e => {
      const n = e.wins.length + e.losses.length;
      const winSum = e.wins.reduce((a, b) => a + b, 0);
      const lossSum = e.losses.reduce((a, b) => a + b, 0);
      return {
        symbol: e.symbol,
        n,
        winRate: n ? (e.wins.length / n) * 100 : 0,
        total: +e.total.toFixed(2),
        avgWin: e.wins.length ? winSum / e.wins.length : 0,
        avgLoss: e.losses.length ? lossSum / e.losses.length : 0,
        profitFactor: lossSum !== 0
          ? winSum / Math.abs(lossSum)
          : (winSum > 0 ? Infinity : 0),
      };
    })
    .sort((a, b) => b.total - a.total);
}