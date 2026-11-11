// Pure, dependency-free strategy analytics. Used by the API (authoritative
// numbers) and safe to import in the web app. Output is JSON-safe: no
// Infinity / NaN ever leaves this file.
import { SESSION_RANGES } from './constants.js';

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const r2 = (v) => (Number.isFinite(v) ? Math.round(v * 100) / 100 : 0);
const DOW_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DOW_LABEL = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function toMinutes(t) {
  if (typeof t !== 'string') return null;
  const [h, m] = t.split(':').map(Number);
  return Number.isFinite(h) ? h * 60 + (Number.isFinite(m) ? m : 0) : null;
}

export function sessionOf(minutes) {
  if (minutes == null) return 'Unknown';
  for (const r of SESSION_RANGES) {
    const hit = r.start <= r.end
      ? minutes >= r.start && minutes < r.end
      : minutes >= r.start || minutes < r.end; // wraps midnight (Asia)
    if (hit) return r.name;
  }
  return 'Unknown';
}

function dowOf(dateStr) {
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1)).getUTCDay();
}

function normalize(raw) {
  return raw
    .map((t) => {
      const entry = toMinutes(t.entryTime);
      const exit = toMinutes(t.exitTime);
      let hold = entry != null && exit != null ? exit - entry : null;
      if (hold != null && hold < 0) hold += 1440;
      return {
        id: t.id,
        date: String(t.date).slice(0, 10),
        entryTime: t.entryTime || '',
        direction: t.direction || '',
        symbol: t.symbol || '',
        pnl: num(t.pnl),
        commission: num(t.commission),
        entry,
        hold,
        session: sessionOf(entry),
        hour: entry == null ? null : Math.floor(entry / 60),
        dow: dowOf(t.date),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || (a.entry ?? 0) - (b.entry ?? 0));
}

function bucketStats(items) {
  let wins = 0, gp = 0, gl = 0, net = 0;
  for (const t of items) {
    net += t.pnl;
    if (t.pnl > 0) { wins++; gp += t.pnl; } else if (t.pnl < 0) gl += -t.pnl;
  }
  const n = items.length;
  return {
    n,
    wins,
    net: r2(net),
    winRate: n ? r2((wins / n) * 100) : 0,
    avg: n ? r2(net / n) : 0,
    profitFactor: gl > 0 ? r2(gp / gl) : null,
  };
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const t of items) {
    const k = keyFn(t);
    if (k == null) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(t);
  }
  return map;
}

const EMPTY_BUCKET = { n: 0, wins: 0, net: 0, winRate: 0, avg: 0, profitFactor: null };

export function emptyStats() {
  return {
    n: 0, wins: 0, losses: 0, breakeven: 0, net: 0, grossProfit: 0, grossLoss: 0,
    winRate: 0, profitFactor: null, profitFactorInfinite: false, expectancy: 0,
    avgWin: 0, avgLoss: 0, payoff: null, largestWin: 0, largestLoss: 0,
    bestWinStreak: 0, worstLossStreak: 0, currentStreak: { type: null, count: 0 },
    maxDrawdown: 0, currentDrawdown: 0, recoveryFactor: null, stdDev: 0, sqn: null,
    avgHold: 0, avgHoldWin: 0, avgHoldLoss: 0, commission: 0,
    tradingDays: 0, avgTradesPerDay: 0, maxTradesInDay: 0, winningDays: 0, winningDayRate: 0,
    bestDay: null, worstDay: null, firstDate: null, lastDate: null, confidence: 'low',
    recent: { ...EMPTY_BUCKET }, equity: [], drawdown: [], daily: [], monthly: [],
    byDow: [], bySession: [], byHour: [], bySymbol: [], byDirection: [], distribution: [],
  };
}

export function computeStrategyStats(rawTrades) {
  if (!rawTrades || rawTrades.length === 0) return emptyStats();
  const trades = normalize(rawTrades);
  const n = trades.length;

  let gp = 0, gl = 0, net = 0, wins = 0, losses = 0, commission = 0;
  let largestWin = 0, largestLoss = 0;
  let cum = 0, peak = 0, maxDD = 0;
  let streakType = null, streak = 0, bestWin = 0, worstLoss = 0;
  const equity = [], drawdown = [];
  const holdW = [], holdL = [], holdAll = [];

  trades.forEach((t, i) => {
    net += t.pnl;
    commission += t.commission;
    if (t.pnl > 0) { wins++; gp += t.pnl; largestWin = Math.max(largestWin, t.pnl); }
    else if (t.pnl < 0) { losses++; gl += -t.pnl; largestLoss = Math.min(largestLoss, t.pnl); }

    const type = t.pnl > 0 ? 'win' : t.pnl < 0 ? 'loss' : null; // breakeven resets
    if (type && type === streakType) streak++; else { streakType = type; streak = type ? 1 : 0; }
    if (streakType === 'win') bestWin = Math.max(bestWin, streak);
    if (streakType === 'loss') worstLoss = Math.max(worstLoss, streak);

    cum += t.pnl;
    peak = Math.max(peak, cum);
    const dd = cum - peak;
    maxDD = Math.min(maxDD, dd);
    equity.push({ i: i + 1, date: t.date, pnl: r2(t.pnl), cum: r2(cum) });
    drawdown.push({ i: i + 1, date: t.date, dd: r2(dd) });

    if (t.hold != null) {
      holdAll.push(t.hold);
      if (t.pnl > 0) holdW.push(t.hold); else if (t.pnl < 0) holdL.push(t.hold);
    }
  });

  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const mean = net / n;
  const variance = trades.reduce((s, t) => s + (t.pnl - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);
  const avgWin = wins ? gp / wins : 0;
  const avgLoss = losses ? -gl / losses : 0;
  const absDD = Math.abs(maxDD);

  const dayMap = groupBy(trades, (t) => t.date);
  const daily = [...dayMap.entries()].map(([date, items]) => ({
    date, n: items.length, net: r2(items.reduce((s, t) => s + t.pnl, 0)),
  }));
  const winningDays = daily.filter((d) => d.net > 0).length;
  const bestDay = daily.reduce((b, d) => (!b || d.net > b.net ? d : b), null);
  const worstDay = daily.reduce((b, d) => (!b || d.net < b.net ? d : b), null);

  const monthly = [...groupBy(trades, (t) => t.date.slice(0, 7)).entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, items]) => ({ month, ...bucketStats(items) }));

  const byDow = DOW_ORDER
    .map((d) => ({ key: DOW_LABEL[d], ...bucketStats(trades.filter((t) => t.dow === d)) }))
    .filter((r) => r.n > 0);

  const sessionNames = [...SESSION_RANGES.map((s) => s.name), 'Unknown'];
  const sessMap = groupBy(trades, (t) => t.session);
  const bySession = sessionNames.filter((s) => sessMap.has(s))
    .map((s) => ({ key: s, ...bucketStats(sessMap.get(s)) }));

  const byHour = [...groupBy(trades, (t) => t.hour).entries()]
    .sort(([a], [b]) => a - b)
    .map(([h, items]) => ({ key: `${String(h).padStart(2, '0')}:00`, ...bucketStats(items) }));

  const bySymbol = [...groupBy(trades, (t) => t.symbol || '—').entries()]
    .map(([s, items]) => ({ key: s, ...bucketStats(items) }))
    .sort((a, b) => b.net - a.net)
    .slice(0, 10);

  const byDirection = ['Long', 'Short']
    .map((d) => ({ key: d, ...bucketStats(trades.filter((t) => t.direction === d)) }))
    .filter((r) => r.n > 0);

  // P&L distribution (12 bins)
  const pnls = trades.map((t) => t.pnl);
  const lo = Math.min(...pnls), hi = Math.max(...pnls);
  let distribution = [];
  if (n >= 2 && hi > lo) {
    const BINS = 12, w = (hi - lo) / BINS;
    distribution = Array.from({ length: BINS }, (_, b) => ({
      from: r2(lo + b * w), to: r2(lo + (b + 1) * w), count: 0,
      positive: lo + (b + 0.5) * w >= 0,
    }));
    for (const p of pnls) distribution[Math.min(BINS - 1, Math.floor((p - lo) / w))].count++;
  }

  const sqnN = Math.min(n, 100);

  return {
    n, wins, losses, breakeven: n - wins - losses,
    net: r2(net), grossProfit: r2(gp), grossLoss: r2(gl),
    winRate: r2((wins / n) * 100),
    profitFactor: gl > 0 ? r2(gp / gl) : null,
    profitFactorInfinite: gl === 0 && gp > 0,
    expectancy: r2(mean),
    avgWin: r2(avgWin), avgLoss: r2(avgLoss),
    payoff: avgLoss !== 0 ? r2(avgWin / Math.abs(avgLoss)) : null,
    largestWin: r2(largestWin), largestLoss: r2(largestLoss),
    bestWinStreak: bestWin, worstLossStreak: worstLoss,
    currentStreak: { type: streakType, count: streak },
    maxDrawdown: r2(absDD),
    currentDrawdown: r2(Math.abs(cum - peak)),
    recoveryFactor: absDD > 0 ? r2(net / absDD) : null,
    stdDev: r2(stdDev),
    sqn: n >= 2 && stdDev > 0 ? r2((mean / stdDev) * Math.sqrt(sqnN)) : null,
    avgHold: r2(avg(holdAll)), avgHoldWin: r2(avg(holdW)), avgHoldLoss: r2(avg(holdL)),
    commission: r2(commission),
    tradingDays: daily.length,
    avgTradesPerDay: r2(n / daily.length),
    maxTradesInDay: Math.max(...daily.map((d) => d.n)),
    winningDays, winningDayRate: r2((winningDays / daily.length) * 100),
    bestDay, worstDay,
    firstDate: trades[0].date, lastDate: trades[n - 1].date,
    confidence: n >= 100 ? 'high' : n >= 30 ? 'medium' : 'low',
    recent: bucketStats(trades.slice(-20)),
    equity, drawdown, daily, monthly,
    byDow, bySession, byHour, bySymbol, byDirection, distribution,
  };
}

// Light summary for list cards (no heavy arrays).
export function liteStats(s, maxSpark = 36) {
  let spark = (s.equity || []).map((p) => p.cum);
  if (spark.length > maxSpark) {
    const step = (spark.length - 1) / (maxSpark - 1);
    spark = Array.from({ length: maxSpark }, (_, i) => spark[Math.round(i * step)]);
  }
  return {
    n: s.n, net: s.net, winRate: s.winRate, profitFactor: s.profitFactor,
    profitFactorInfinite: s.profitFactorInfinite, expectancy: s.expectancy,
    maxDrawdown: s.maxDrawdown, avgWin: s.avgWin, avgLoss: s.avgLoss, payoff: s.payoff,
    lastDate: s.lastDate, confidence: s.confidence,
    recentExpectancy: s.recent.avg, spark,
  };
}

const usd = (v) =>
  `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

// Rule-based findings with sample-size guards so tiny buckets never mislead.
export function buildInsights(s) {
  const out = [];
  if (!s.n) return out;
  const MIN = 5;

  if (s.n < 30) {
    out.push({ id: 'sample', tone: 'warn', title: `Small sample (${s.n} trades)`,
      detail: 'Treat these numbers as provisional. Edge estimates become reliable around 30+ trades, solid at 100+.' });
  }
  if (s.expectancy > 0) {
    out.push({ id: 'exp', tone: 'good', title: `Positive expectancy: ${usd(s.expectancy)} per trade`,
      detail: `${s.winRate}% win rate with a ${s.payoff ?? '∞'}:1 payoff ratio across ${s.n} trades.` });
  } else if (s.n >= 10) {
    out.push({ id: 'exp', tone: 'bad', title: `Negative expectancy: ${usd(s.expectancy)} per trade`,
      detail: 'This playbook is losing money on average. Review entries or pause it until the rules are tightened.' });
  }
  const best = (rows) => rows.filter((r) => r.n >= MIN).sort((a, b) => b.net - a.net)[0];
  const worst = (rows) => rows.filter((r) => r.n >= MIN).sort((a, b) => a.net - b.net)[0];
  const bs = best(s.bySession), ws = worst(s.bySession);
  if (bs && bs.net > 0) out.push({ id: 'bs', tone: 'good', title: `Best session: ${bs.key}`,
    detail: `${usd(bs.net)} over ${bs.n} trades (${bs.winRate}% win rate).` });
  if (ws && ws.net < 0) out.push({ id: 'ws', tone: 'bad', title: `Weakest session: ${ws.key}`,
    detail: `${usd(ws.net)} over ${ws.n} trades. Consider skipping this window.` });
  const bd = best(s.byDow), wd = worst(s.byDow);
  if (bd && bd.net > 0) out.push({ id: 'bd', tone: 'good', title: `Best weekday: ${bd.key}`,
    detail: `${usd(bd.net)} over ${bd.n} trades.` });
  if (wd && wd.net < 0) out.push({ id: 'wd', tone: 'warn', title: `Weakest weekday: ${wd.key}`,
    detail: `${usd(wd.net)} over ${wd.n} trades.` });
  if (s.byDirection.length === 2 && s.byDirection.every((d) => d.n >= 10)) {
    const [a, b] = [...s.byDirection].sort((x, y) => y.net - x.net);
    if (a.net > 0 && b.net < 0) out.push({ id: 'dir', tone: 'warn', title: `${b.key}s are dragging results`,
      detail: `${a.key}s made ${usd(a.net)} while ${b.key}s lost ${usd(b.net)}.` });
  }
  if (s.winRate < 40 && s.payoff && s.payoff >= 2 && s.expectancy > 0) {
    out.push({ id: 'trend', tone: 'info', title: 'Trend-style profile',
      detail: `Low win rate (${s.winRate}%) is offset by winners ${s.payoff}× the size of losers. Expect long losing streaks (worst so far: ${s.worstLossStreak}).` });
  }
  if (s.net > 0 && s.maxDrawdown > s.net * 0.5 && s.n >= 20) {
    out.push({ id: 'dd', tone: 'warn', title: 'Drawdown is large relative to profit',
      detail: `Max drawdown ${usd(-s.maxDrawdown)} vs net ${usd(s.net)}. Size positions for the drawdown, not the average.` });
  }
  if (s.avgHoldLoss > 0 && s.avgHoldWin > 0 && s.losses >= MIN && s.avgHoldLoss > s.avgHoldWin * 1.5) {
    out.push({ id: 'hold', tone: 'warn', title: 'Losers are held longer than winners',
      detail: `Average ${Math.round(s.avgHoldLoss)} min in losers vs ${Math.round(s.avgHoldWin)} min in winners. A classic sign of hoping instead of exiting.` });
  }
  if (s.n >= 40 && s.recent.n >= 20) {
    if (s.recent.avg < 0 && s.expectancy > 0) out.push({ id: 'form', tone: 'bad', title: 'Recent form is negative',
      detail: `Last ${s.recent.n} trades averaged ${usd(s.recent.avg)} vs ${usd(s.expectancy)} lifetime.` });
    else if (s.recent.avg > s.expectancy * 1.25 && s.recent.avg > 0) out.push({ id: 'form', tone: 'good', title: 'Recent form is above average',
      detail: `Last ${s.recent.n} trades averaged ${usd(s.recent.avg)} vs ${usd(s.expectancy)} lifetime.` });
  }
  return out;
}

// Compares what the playbook says (sessions, symbols, direction, daily cap)
// with what the trades actually did.
export function computePlanCompliance(strategy, rawTrades) {
  const trades = normalize(rawTrades || []);
  const checks = [];
  const total = trades.length;
  const add = (key, label, planned, violators) => checks.push({
    key, label, planned, total,
    violations: violators.length,
    net: r2(violators.reduce((s, t) => s + t.pnl, 0)),
    adherence: total ? r2(((total - violators.length) / total) * 100) : 100,
  });

  if (strategy.sessions?.length) {
    add('sessions', 'Traded inside planned sessions', strategy.sessions.join(', '),
      trades.filter((t) => !strategy.sessions.includes(t.session)));
  }
  if (strategy.symbols?.length) {
    const set = new Set(strategy.symbols.map((x) => x.toUpperCase()));
    add('symbols', 'Traded planned instruments', strategy.symbols.join(', '),
      trades.filter((t) => !set.has((t.symbol || '').toUpperCase())));
  }
  if (strategy.direction) {
    add('direction', 'Followed planned direction', strategy.direction,
      trades.filter((t) => t.direction && t.direction !== strategy.direction));
  }
  if (strategy.maxTradesPerDay) {
    const byDay = groupBy(trades, (t) => t.date);
    const over = [];
    for (const items of byDay.values()) over.push(...items.slice(strategy.maxTradesPerDay));
    add('maxTrades', 'Stayed within daily trade cap', `${strategy.maxTradesPerDay} / day`, over);
  }
  return checks;
}
