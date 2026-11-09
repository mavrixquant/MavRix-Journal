// Pure analysis helpers for the Analyse page. No React, no side effects.
// Everything works on `stats.outcomes` (enriched trades + { result, score }).

export const SESSION_ORDER = [
  'Asia', 'London', 'NY Pre-Market', 'NY AM', 'NY Lunch', 'NY PM', 'After Hours',
];
export const DOW_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Values that mean "not set". The last entry is the mojibake form of an em dash,
// kept so data saved with the wrong encoding is still treated as blank.
const BLANK = new Set([
  '', '-', 'Unlabeled', 'undefined', 'null', '\u2014', '\u00e2\u20ac\u201d',
]);
export const isBlank = (v) => v == null || BLANK.has(String(v).trim());

export function summarizeGroup(arr) {
  let total = 0;
  let winSum = 0;
  let lossSum = 0;
  let wins = 0;
  let losses = 0;
  let dur = 0;
  for (const o of arr) {
    const s = Number(o.score) || 0;
    total += s;
    dur += Number(o.durationMinutes) || 0;
    if (o.result === 'win') {
      wins += 1;
      winSum += s;
    } else if (o.result === 'loss') {
      losses += 1;
      lossSum += s;
    }
  }
  const n = arr.length;
  return {
    n,
    wins,
    losses,
    total,
    winSum,
    lossSum,
    winRate: n ? (wins / n) * 100 : 0,
    expectancy: n ? total / n : 0,
    avgWin: wins ? winSum / wins : 0,
    avgLoss: losses ? lossSum / losses : 0,
    profitFactor: lossSum < 0 ? winSum / Math.abs(lossSum) : winSum > 0 ? Infinity : 0,
    avgDuration: n ? dur / n : 0,
  };
}

/** Group outcomes by a key and summarise each group. */
export function groupRows(outcomes, getKey, { order, natural, keepBlank } = {}) {
  const map = new Map();
  for (const o of outcomes || []) {
    const k = getKey(o);
    if (k == null) continue;
    const key = String(k);
    if (!keepBlank && isBlank(key)) continue;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(o);
  }
  const rows = [...map].map(([key, arr]) => ({ key, ...summarizeGroup(arr) }));
  if (order) {
    const rank = (k) => {
      const i = order.indexOf(k);
      return i === -1 ? 999 : i;
    };
    return rows.sort((a, b) => rank(a.key) - rank(b.key) || b.total - a.total);
  }
  if (natural) return rows.sort((a, b) => a.key.localeCompare(b.key));
  return rows.sort((a, b) => b.total - a.total);
}

const pad2 = (n) => String(n).padStart(2, '0');
export const hourLabel = (minutes) => `${pad2(Math.floor((Number(minutes) || 0) / 60))}:00`;

/** Dimensions the Edge Explorer and the insights can slice by. */
export function buildDimensions({ dynamicKeys = [], strategyNameById }) {
  const strategyName = (o) => {
    if (o.strategyId != null && strategyNameById?.has(o.strategyId)) {
      return strategyNameById.get(o.strategyId);
    }
    if (typeof o.strategy === 'string') return o.strategy;
    return o.strategy?.name ?? null;
  };
  const base = [
    { id: 'session', label: 'Session', get: (o) => o.session, order: SESSION_ORDER },
    { id: 'dow', label: 'Day of week', get: (o) => o.dowName, order: DOW_ORDER },
    { id: 'hour', label: 'Entry hour', get: (o) => hourLabel(o.entryMinutes), natural: true },
    { id: 'symbol', label: 'Symbol', get: (o) => o.symbol },
    { id: 'dir', label: 'Direction', get: (o) => o.dir },
    { id: 'strategy', label: 'Strategy', get: strategyName },
  ];
  const dyn = dynamicKeys.map((k) => ({
    id: `dyn:${k}`,
    label: k,
    get: (o) => o.dynamic?.[k],
  }));
  return [...base, ...dyn];
}

/** Day-of-week x entry-hour grid. */
export function buildHeatmap(outcomes) {
  const cells = new Map();
  let minH = 24;
  let maxH = -1;
  const present = new Set();
  for (const o of outcomes || []) {
    const h = Math.floor((Number(o.entryMinutes) || 0) / 60);
    const key = `${o.dowName}|${h}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(o);
    minH = Math.min(minH, h);
    maxH = Math.max(maxH, h);
    present.add(o.dowName);
  }
  if (maxH < 0) return null;
  const summary = new Map();
  let maxAbs = 0;
  cells.forEach((arr, key) => {
    const s = summarizeGroup(arr);
    summary.set(key, s);
    maxAbs = Math.max(maxAbs, Math.abs(s.total));
  });
  const hours = [];
  for (let h = minH; h <= maxH; h += 1) hours.push(h);
  const days = DOW_ORDER.filter((d, i) => i < 5 || present.has(d));
  return { hours, days, summary, maxAbs: maxAbs || 1 };
}

/** Histogram of per-trade results. Uses exact values when there are few of them. */
export function buildHistogram(scores, maxBins = 12) {
  if (!scores?.length) return [];
  const rounded = scores.map((s) => +Number(s).toFixed(2));
  const counts = new Map();
  rounded.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  const distinct = [...counts.keys()].sort((a, b) => a - b);
  if (distinct.length <= maxBins) {
    return distinct.map((v) => ({ lo: v, hi: v, mid: v, count: counts.get(v) }));
  }
  const min = distinct[0];
  const max = distinct[distinct.length - 1];
  const w = (max - min) / maxBins || 1;
  const bins = Array.from({ length: maxBins }, (_, i) => ({
    lo: min + i * w,
    hi: min + (i + 1) * w,
    mid: min + (i + 0.5) * w,
    count: 0,
  }));
  rounded.forEach((v) => {
    const i = Math.min(maxBins - 1, Math.floor((v - min) / w));
    bins[i].count += 1;
  });
  return bins;
}

/** Net per calendar day, in date order. */
export function buildDaily(outcomes) {
  const map = new Map();
  (outcomes || []).forEach((o) => {
    if (!o.date) return;
    if (!map.has(o.date)) map.set(o.date, { date: o.date, total: 0, n: 0 });
    const e = map.get(o.date);
    e.total += Number(o.score) || 0;
    e.n += 1;
  });
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function buildBehavior(outcomes) {
  const out = outcomes || [];
  const after = { win: [], loss: [] };
  for (let i = 1; i < out.length; i += 1) {
    const prev = out[i - 1].result;
    if (prev === 'win') after.win.push(out[i]);
    else if (prev === 'loss') after.loss.push(out[i]);
  }

  const perDay = new Map();
  out.forEach((o) => perDay.set(o.date, (perDay.get(o.date) || 0) + 1));
  const bucket = (o) => {
    const c = perDay.get(o.date) || 1;
    return c >= 4 ? '4+ trades' : c === 1 ? '1 trade' : `${c} trades`;
  };
  const dayRows = groupRows(out, bucket, {
    order: ['1 trade', '2 trades', '3 trades', '4+ trades'],
  });

  let cur = { type: null, n: 0 };
  for (let i = out.length - 1; i >= 0; i -= 1) {
    const r = out[i].result;
    if (r !== 'win' && r !== 'loss') break;
    if (!cur.type) cur = { type: r, n: 1 };
    else if (cur.type === r) cur.n += 1;
    else break;
  }

  return {
    afterWin: summarizeGroup(after.win),
    afterLoss: summarizeGroup(after.loss),
    dayRows,
    currentStreak: cur,
    tradingDays: perDay.size,
  };
}

const pct = (v) => `${Math.round(v)}%`;
const pfText = (v) => (v === Infinity ? 'no losses' : v.toFixed(2));

/**
 * Plain-language findings. Each card: { id, tone, kicker, headline, body }.
 * tone: pos | neg | warn | info
 */
export function buildInsights({ outcomes, stats, dims, fmt }) {
  const n = outcomes.length;
  if (n === 0) return [];
  const minN = Math.max(5, Math.ceil(n * 0.05));

  const candidates = [];
  dims.forEach((dim) => {
    const rows = groupRows(outcomes, dim.get, { order: dim.order, natural: dim.natural });
    if (rows.length < 2) return;
    rows.filter((r) => r.n >= minN).forEach((row) => candidates.push({ dim, row }));
  });

  const cards = [];

  const edge = candidates
    .filter((c) => c.row.total > 0)
    .sort((a, b) => b.row.expectancy - a.row.expectancy)[0];
  if (edge) {
    const { dim, row } = edge;
    cards.push({
      id: 'edge',
      tone: 'pos',
      kicker: 'Strongest edge',
      headline: `${dim.label}: ${row.key}`,
      body: `${fmt(row.expectancy)} per trade over ${row.n} trades, ${pct(row.winRate)} win rate, profit factor ${pfText(row.profitFactor)}.`,
    });
  }

  const leak = candidates
    .filter((c) => c.row.total < 0)
    .sort((a, b) => a.row.total - b.row.total)[0];
  if (leak) {
    const { dim, row } = leak;
    cards.push({
      id: 'leak',
      tone: 'neg',
      kicker: 'Biggest leak',
      headline: `${dim.label}: ${row.key}`,
      body: `${fmt(row.total)} across ${row.n} trades (${pct(row.winRate)} win rate). Without these trades the net would be ${fmt(stats.total - row.total)} instead of ${fmt(stats.total)}.`,
    });
  }

  const payoff = Math.abs(stats.avgLoss) > 0 ? stats.avgWin / Math.abs(stats.avgLoss) : 0;
  if (payoff > 0 && stats.wins.length && stats.losses.length) {
    const be = 100 / (1 + payoff);
    const gap = stats.winRate - be;
    cards.push({
      id: 'payoff',
      tone: gap >= 0 ? 'pos' : 'neg',
      kicker: 'Win rate vs payoff',
      headline: `${pct(stats.winRate)} win rate, ${payoff.toFixed(2)}:1 payoff`,
      body: gap >= 0
        ? `You need ${pct(be)} to break even at this payoff, so you clear it by ${Math.abs(gap).toFixed(1)} points.`
        : `You need ${pct(be)} to break even at this payoff, so you are ${Math.abs(gap).toFixed(1)} points short.`,
    });
  }

  if (n >= 10 && stats.avgWinDuration > 0 && stats.avgLossDuration > 0) {
    const ratio = stats.avgLossDuration / stats.avgWinDuration;
    if (ratio >= 1.25) {
      cards.push({
        id: 'hold',
        tone: 'warn',
        kicker: 'Holding losers',
        headline: `Losers last ${Math.round((ratio - 1) * 100)}% longer than winners`,
        body: `Average winner ${Math.round(stats.avgWinDuration)} min, average loser ${Math.round(stats.avgLossDuration)} min. Check whether stops are being moved or ignored.`,
      });
    } else if (ratio <= 0.8) {
      cards.push({
        id: 'hold',
        tone: 'info',
        kicker: 'Holding winners',
        headline: 'Winners run longer than losers',
        body: `Average winner ${Math.round(stats.avgWinDuration)} min, average loser ${Math.round(stats.avgLossDuration)} min. That is the pattern you want.`,
      });
    }
  }

  if (n >= 20 && stats.winSum > 0) {
    const top = outcomes
      .map((o) => Number(o.score) || 0)
      .sort((a, b) => b - a)
      .slice(0, 5)
      .reduce((a, b) => a + b, 0);
    const share = (top / stats.winSum) * 100;
    if (share >= 50) {
      cards.push({
        id: 'concentration',
        tone: 'warn',
        kicker: 'Concentrated profit',
        headline: `Top 5 trades make ${pct(share)} of gross profit`,
        body: 'Results lean on a few large winners. Expect uneven stretches and avoid judging the edge on short windows.',
      });
    }
  }

  const dirDim = dims.find((d) => d.id === 'dir');
  if (dirDim) {
    const rows = groupRows(outcomes, dirDim.get).filter((r) => r.n >= minN);
    if (rows.length >= 2) {
      const sorted = [...rows].sort((a, b) => b.expectancy - a.expectancy);
      const a = sorted[0];
      const b = sorted[sorted.length - 1];
      cards.push({
        id: 'direction',
        tone: 'info',
        kicker: 'Direction',
        headline: `${a.key} outperforms ${b.key}`,
        body: `${a.key}: ${fmt(a.expectancy)} per trade over ${a.n} trades. ${b.key}: ${fmt(b.expectancy)} per trade over ${b.n} trades.`,
      });
    }
  }

  if (stats.maxDD < 0 && stats.total !== 0) {
    const rf = stats.total / Math.abs(stats.maxDD);
    cards.push({
      id: 'drawdown',
      tone: rf >= 2 ? 'pos' : rf >= 1 ? 'warn' : 'neg',
      kicker: 'Drawdown',
      headline: `Max drawdown ${fmt(stats.maxDD)}`,
      body: rf > 0
        ? `Net result is ${rf.toFixed(1)}x the worst drawdown. Higher is better; under 1 means the worst dip is bigger than everything earned.`
        : 'The account is net negative, so the worst drawdown is larger than the total result.',
    });
  }

  return cards.slice(0, 6);
}
