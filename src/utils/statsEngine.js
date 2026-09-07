// src/utils/statsEngine.js
import { outcomeFor } from './filterHelpers';

export function computeStats(trades, R) {
  if (!trades || trades.length === 0) {
    return {
      outcomes: [],
      n: 0,
      wins: [],
      losses: [],
      totalR: 0,
      winRate: 0,
      lossRate: 0,
      expectancy: 0,
      profitFactor: 0,
      maxDD: 0,
      equity: [],
      bestWinStreak: 0,
      worstLossStreak: 0,
      bestTrade: null,
      worstTrade: null,
    };
  }

  const outcomes = trades.map(t => ({ ...t, ...outcomeFor(t, R) }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.entryMinutes - b.entryMinutes);

  const wins = outcomes.filter(o => o.result === 'win');
  const losses = outcomes.filter(o => o.result === 'loss');
  const n = outcomes.length;
  const totalR = outcomes.reduce((s, o) => s + o.r, 0);
  const winRate = n ? wins.length / n * 100 : 0;
  const lossRate = n ? losses.length / n * 100 : 0;
  const expectancy = n ? totalR / n : 0;
  const grossWin = wins.length * R;
  const grossLoss = losses.length * 1;
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? Infinity : 0);

  let cum = 0, peak = 0, maxDD = 0;
  const equity = [];
  outcomes.forEach(o => {
    cum += o.r;
    peak = Math.max(peak, cum);
    maxDD = Math.min(maxDD, cum - peak);
    equity.push({ x: o.date, y: +cum.toFixed(2) });
  });

  // Streaks
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

  let bestTrade = null, worstTrade = null;
  outcomes.forEach(o => {
    if (!bestTrade || o.r > bestTrade.r) bestTrade = o;
    if (!worstTrade || o.r < worstTrade.r) worstTrade = o;
  });

  return {
    outcomes,
    n,
    wins,
    losses,
    totalR,
    winRate,
    lossRate,
    expectancy,
    profitFactor,
    maxDD,
    equity,
    bestWinStreak,
    worstLossStreak,
    bestTrade,
    worstTrade,
  };
}

// Group outcomes by a key function and return aggregated values
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
    const totalR = arr.reduce((s, o) => s + o.r, 0);
    return {
      label: k,
      n: arr.length,
      winRate: arr.length ? wins / arr.length * 100 : 0,
      totalR: +totalR.toFixed(2),
    };
  });
}