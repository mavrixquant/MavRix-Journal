import { getPointValue } from '@mavrix/shared';
import { dayKey, toMs } from './time';

/* ============================================================================
   Session statistics — recomputed from raw trade rows every time.
   Net result of a trade = pnl (gross) − commission. R needs a stop (slPoints).
   ============================================================================ */

export const netOf = (t) => (Number(t.pnl) || 0) - (Number(t.commission) || 0);

export const isClosed = (t) => t.exitTime != null && t.exitPrice != null;

/** R multiple, or null when the trade had no stop. */
export function rOf(t) {
  const sl = Number(t.slPoints);
  if (!Number.isFinite(sl) || sl <= 0) return null;
  const risk = sl * Number(t.quantity) * getPointValue(t.symbol);
  return risk > 0 ? netOf(t) / risk : null;
}

const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);
const std = (a) => {
  if (!a.length) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length);
};

function bySlice(rows, keyFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!m.has(k)) m.set(k, { key: k, n: 0, wins: 0, net: 0 });
    const g = m.get(k);
    g.n += 1;
    g.net += r.net;
    if (r.net > 0) g.wins += 1;
  }
  return [...m.values()].map((g) => ({ ...g, winRate: g.n ? (g.wins / g.n) * 100 : 0 }));
}

export function emptyStats(startingBalance = 0) {
  return {
    n: 0, openCount: 0, wins: 0, losses: 0, breakeven: 0,
    winRate: 0, netPnl: 0, grossProfit: 0, grossLoss: 0, profitFactor: 0,
    avgWin: 0, avgLoss: 0, expectancy: 0, payoff: 0,
    largestWin: null, largestLoss: null,
    avgR: null, expectancyR: null, rCount: 0,
    sharpe: 0, sortino: 0, stdDev: 0, kelly: 0,
    maxDD: 0, maxDDPct: 0, calmar: 0, recovery: 0,
    startingBalance, endBalance: startingBalance, returnPct: 0,
    equity: [], drawdown: [], histogram: [], daily: [],
    streaks: { maxWin: 0, maxLoss: 0, current: 0 },
    avgHoldMin: 0, avgWinHoldMin: 0, avgLossHoldMin: 0,
    bySymbol: [], bySide: [], bestDay: null, worstDay: null,
    winners: [], losers: [],
  };
}

export function computeSessionStats(trades, session, { tz } = {}) {
  const start = Number(session?.startingBalance) || 0;
  const all = Array.isArray(trades) ? trades : [];
  const closed = all.filter(isClosed).sort((a, b) => toMs(a.exitTime) - toMs(b.exitTime));
  const openCount = all.length - closed.length;
  if (closed.length === 0) return { ...emptyStats(start), openCount };

  const rows = closed.map((t) => ({
    t,
    net: netOf(t),
    r: rOf(t),
    holdMin: (toMs(t.exitTime) - toMs(t.entryTime)) / 60000,
  }));

  const nets = rows.map((r) => r.net);
  const winsR = rows.filter((r) => r.net > 0);
  const lossR = rows.filter((r) => r.net < 0);
  const n = rows.length;

  const netPnl = nets.reduce((s, x) => s + x, 0);
  const grossProfit = winsR.reduce((s, r) => s + r.net, 0);
  const grossLoss = lossR.reduce((s, r) => s + r.net, 0);
  const profitFactor = grossLoss !== 0 ? grossProfit / Math.abs(grossLoss) : grossProfit > 0 ? Infinity : 0;
  const avgWin = winsR.length ? grossProfit / winsR.length : 0;
  const avgLoss = lossR.length ? grossLoss / lossR.length : 0;
  const payoff = Math.abs(avgLoss) > 0 ? avgWin / Math.abs(avgLoss) : 0;
  const expectancy = netPnl / n;
  const winRate = (winsR.length / n) * 100;

  const sd = std(nets);
  const sharpe = sd > 0 ? expectancy / sd : 0;
  const downside = Math.sqrt(mean(nets.map((x) => Math.min(0, x) ** 2)));
  const sortino = downside > 0 ? expectancy / downside : 0;
  const W = winsR.length / n;
  const kelly = payoff > 0 ? W - (1 - W) / payoff : 0;

  const rVals = rows.map((r) => r.r).filter((x) => x != null);

  // Equity & drawdown (closed-trade resolution).
  const equity = [{ t: toMs(closed[0].entryTime), balance: start, pnl: 0, i: 0 }];
  const drawdown = [{ t: equity[0].t, dd: 0, ddPct: 0 }];
  let bal = start;
  let peak = start;
  let maxDD = 0;
  let maxDDPct = 0;
  rows.forEach((r, i) => {
    bal += r.net;
    peak = Math.max(peak, bal);
    const dd = bal - peak;
    const ddPct = peak > 0 ? (dd / peak) * 100 : 0;
    maxDD = Math.min(maxDD, dd);
    maxDDPct = Math.min(maxDDPct, ddPct);
    const t = toMs(r.t.exitTime);
    equity.push({ t, balance: +bal.toFixed(2), pnl: +r.net.toFixed(2), i: i + 1 });
    drawdown.push({ t, dd: +dd.toFixed(2), ddPct: +ddPct.toFixed(3) });
  });
  const absDD = Math.abs(maxDD);

  // Daily P&L by exit day.
  const dayMap = new Map();
  rows.forEach((r) => {
    const k = dayKey(r.t.exitTime, tz);
    const d = dayMap.get(k) || { date: k, net: 0, n: 0 };
    d.net += r.net;
    d.n += 1;
    dayMap.set(k, d);
  });
  const daily = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date));
  const bestDay = daily.reduce((b, d) => (!b || d.net > b.net ? d : b), null);
  const worstDay = daily.reduce((b, d) => (!b || d.net < b.net ? d : b), null);

  // Streaks (chronological by exit).
  let curW = 0;
  let curL = 0;
  let maxW = 0;
  let maxL = 0;
  rows.forEach((r) => {
    if (r.net > 0) { curW += 1; curL = 0; } else if (r.net < 0) { curL += 1; curW = 0; } else { curW = 0; curL = 0; }
    maxW = Math.max(maxW, curW);
    maxL = Math.max(maxL, curL);
  });
  const current = curW > 0 ? curW : curL > 0 ? -curL : 0;

  // Histogram of net results.
  const lo = Math.min(...nets);
  const hi = Math.max(...nets);
  const bins = Math.min(14, Math.max(5, Math.round(Math.sqrt(n) * 1.6)));
  const span = hi - lo || 1;
  const step = span / bins;
  const histogram = Array.from({ length: bins }, (_, i) => ({
    from: lo + i * step, to: lo + (i + 1) * step, count: 0,
  }));
  nets.forEach((v) => {
    const i = Math.min(bins - 1, Math.floor((v - lo) / step));
    histogram[i].count += 1;
  });

  const holds = rows.map((r) => r.holdMin).filter(Number.isFinite);

  return {
    n, openCount,
    wins: winsR.length, losses: lossR.length, breakeven: n - winsR.length - lossR.length,
    winRate, netPnl, grossProfit, grossLoss, profitFactor, avgWin, avgLoss, expectancy, payoff,
    largestWin: winsR.length ? Math.max(...winsR.map((r) => r.net)) : null,
    largestLoss: lossR.length ? Math.min(...lossR.map((r) => r.net)) : null,
    avgR: rVals.length ? mean(rVals) : null,
    expectancyR: rVals.length ? mean(rVals) : null,
    rCount: rVals.length,
    sharpe, sortino, stdDev: sd, kelly,
    maxDD, maxDDPct,
    calmar: absDD > 0 ? netPnl / absDD : 0,
    recovery: absDD > 0 ? netPnl / absDD : 0,
    startingBalance: start,
    endBalance: start + netPnl,
    returnPct: start > 0 ? (netPnl / start) * 100 : 0,
    equity, drawdown, histogram, daily,
    streaks: { maxWin: maxW, maxLoss: maxL, current },
    avgHoldMin: mean(holds),
    avgWinHoldMin: mean(winsR.map((r) => r.holdMin)),
    avgLossHoldMin: mean(lossR.map((r) => r.holdMin)),
    bySymbol: bySlice(rows.map((r) => ({ ...r, sym: r.t.symbol })), (r) => r.sym)
      .sort((a, b) => b.net - a.net),
    bySide: bySlice(rows, (r) => (r.t.side === 'short' ? 'Short' : 'Long')),
    bestDay, worstDay,
    winners: winsR.map((r) => r.net),
    losers: lossR.map((r) => r.net),
  };
}
