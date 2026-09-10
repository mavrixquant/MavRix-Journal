// src/utils/statsEngine.js
import { outcomeFor } from './filterHelpers';
import { getMetricMode } from './slResolver';

export function computeStats(trades, R, accountOrSL) {
  const metric = getMetricMode(accountOrSL);

  if (!trades || trades.length === 0) {
    return emptyStats(metric);
  }

  const outcomes = trades
    .map(t => ({ ...t, ...outcomeFor(t, R, accountOrSL) }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.entryMinutes - b.entryMinutes);

  const wins = outcomes.filter(o => o.result === 'win');
  const losses = outcomes.filter(o => o.result === 'loss');
  const n = outcomes.length;

  const total = outcomes.reduce((s, o) => s + o.score, 0);
  const winRate = n ? (wins.length / n) * 100 : 0;
  const lossRate = n ? (losses.length / n) * 100 : 0;
  const expectancy = n ? total / n : 0;

  const winSum = wins.reduce((s, o) => s + o.score, 0);
  const lossSum = losses.reduce((s, o) => s + o.score, 0);
  const profitFactor = lossSum !== 0
    ? winSum / Math.abs(lossSum)
    : (winSum > 0 ? Infinity : 0);

  const avgWin = wins.length ? winSum / wins.length : 0;
  const avgLoss = losses.length ? lossSum / losses.length : 0;

  // --- Volatility & ratio metrics ---
  const mean = expectancy;
  const variance = n ? outcomes.reduce((s, o) => s + (o.score - mean) ** 2, 0) / n : 0;
  const stdR = Math.sqrt(variance);

  // Downside deviation: sqrt(mean(min(0, score)^2))
  const downsideVar = n
    ? outcomes.reduce((s, o) => {
        const d = Math.min(0, o.score);
        return s + d * d;
      }, 0) / n
    : 0;
  const downsideStd = Math.sqrt(downsideVar);

  const sharpe = stdR > 0 ? mean / stdR : 0;
  const sortino = downsideStd > 0 ? mean / downsideStd : 0;

  // --- Drawdown metrics ---
  let cum = 0, peak = 0, maxDD = 0;
  let ddSum = 0, ddCount = 0;
  const equity = [];
  outcomes.forEach(o => {
    cum += o.score;
    peak = Math.max(peak, cum);
    const dd = cum - peak;
    if (dd < 0) { ddSum += dd; ddCount++; }
    maxDD = Math.min(maxDD, dd);
    equity.push({ x: o.date, y: +cum.toFixed(2) });
  });

  const avgDD = ddCount > 0 ? ddSum / ddCount : 0;      // negative or 0
  const absMaxDD = Math.abs(maxDD);
  const absAvgDD = Math.abs(avgDD);

  const calmar = absMaxDD > 0 ? total / absMaxDD : 0;
  const mar = calmar;                                    // alias
  const sterling = absAvgDD > 0 ? total / absAvgDD : 0;

  // --- Kelly % ---
  // f* = W − (1 − W) / (avgWin / |avgLoss|)
  const W = n ? wins.length / n : 0;
  const payoffRatio = Math.abs(avgLoss) > 0 ? avgWin / Math.abs(avgLoss) : 0;
  const kellyRaw = payoffRatio > 0 ? W - (1 - W) / payoffRatio : -1;
  const kelly = Math.max(0, Math.min(1, kellyRaw));

  // --- Streaks ---
  let curStreak = 0, curType = null;
  let bestWinStreak = 0, worstLossStreak = 0;
  outcomes.forEach(o => {
    if (o.result === 'win') {
      curStreak = curType === 'win' ? curStreak + 1 : 1;
      curType = 'win';
      bestWinStreak = Math.max(bestWinStreak, curStreak);
    } else if (o.result === 'loss') {
      curStreak = curType === 'loss' ? curStreak + 1 : 1;
      curType = 'loss';
      worstLossStreak = Math.max(worstLossStreak, curStreak);
    }
  });

  // --- Best / worst trade ---
  let bestTrade = null, worstTrade = null;
  outcomes.forEach(o => {
    if (!bestTrade || o.score > bestTrade.score) bestTrade = o;
    if (!worstTrade || o.score < worstTrade.score) worstTrade = o;
  });

  // --- Duration metrics ---
  const winDurs = wins.map(o => Number(o.durationMinutes) || 0);
  const lossDurs = losses.map(o => Number(o.durationMinutes) || 0);
  const allDurs = outcomes.map(o => Number(o.durationMinutes) || 0);
  const avgWinDuration = winDurs.length ? winDurs.reduce((a, b) => a + b, 0) / winDurs.length : 0;
  const avgLossDuration = lossDurs.length ? lossDurs.reduce((a, b) => a + b, 0) / lossDurs.length : 0;
  const avgDuration = allDurs.length ? allDurs.reduce((a, b) => a + b, 0) / allDurs.length : 0;
  const durationDelta = avgWinDuration - avgLossDuration;  // > 0 means hold winners longer

  return {
    metric,
    outcomes,
    n,
    wins,
    losses,
    total,
    totalR: total,
    winRate,
    lossRate,
    expectancy,
    profitFactor,
    maxDD,
    avgDD,
    equity,
    bestWinStreak,
    worstLossStreak,
    bestTrade,
    worstTrade,
    // Score aggregates
    winSum,
    lossSum,
    avgWin,
    avgLoss,
    // Volatility & ratios
    stdR,
    downsideStd,
    sharpe,
    sortino,
    calmar,
    mar,
    sterling,
    kelly,
    kellyRaw,
    // Durations
    avgWinDuration,
    avgLossDuration,
    avgDuration,
    durationDelta,
    // Legacy aliases (existing UI depends on these)
    totalWin$: winSum,
    totalLoss$: lossSum,
    avgWin$: avgWin,
    avgLoss$: avgLoss,
  };
}

function emptyStats(metric) {
  return {
    metric,
    outcomes: [],
    n: 0,
    wins: [],
    losses: [],
    total: 0,
    totalR: 0,
    winRate: 0,
    lossRate: 0,
    expectancy: 0,
    profitFactor: 0,
    maxDD: 0,
    avgDD: 0,
    equity: [],
    bestWinStreak: 0,
    worstLossStreak: 0,
    bestTrade: null,
    worstTrade: null,
    winSum: 0,
    lossSum: 0,
    avgWin: 0,
    avgLoss: 0,
    stdR: 0,
    downsideStd: 0,
    sharpe: 0,
    sortino: 0,
    calmar: 0,
    mar: 0,
    sterling: 0,
    kelly: 0,
    kellyRaw: -1,
    avgWinDuration: 0,
    avgLossDuration: 0,
    avgDuration: 0,
    durationDelta: 0,
    totalWin$: 0,
    totalLoss$: 0,
    avgWin$: 0,
    avgLoss$: 0,
  };
}

export function groupAgg(outcomes, keyFn, order) {
  const map = new Map();
  outcomes.forEach(o => {
    const k = keyFn(o);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(o);
  });
  let keys = [...map.keys()];
  if (order) keys = order.filter(k => map.has(k));
  else keys.sort();
  return keys.map(k => {
    const arr = map.get(k);
    const wins = arr.filter(o => o.result === 'win').length;
    const total = arr.reduce((s, o) => s + (o.score ?? 0), 0);
    return {
      label: k,
      n: arr.length,
      winRate: arr.length ? (wins / arr.length) * 100 : 0,
      total: +total.toFixed(2),
      totalR: +total.toFixed(2),
    };
  });
}