// src/utils/filterHelpers.js
import { getTradeSL, getTradeNetPnl, getMetricMode } from './slResolver';

// Outcome evaluation for a single trade.
// Returns { result, score, r, rAchieved }.
//   R mode: score = R multiple (win → R, loss → -1)
//   $ mode: score = netPnl in account currency
// `r` is kept as a legacy alias for `score`.
export function outcomeFor(trade, R, accountOrSL) {
  const metric = getMetricMode(accountOrSL);

  if (metric === '$') {
    const netPnl = getTradeNetPnl(trade, accountOrSL);
    const result = netPnl > 0 ? 'win' : netPnl < 0 ? 'loss' : 'breakeven';
    return { result, score: netPnl, r: netPnl, rAchieved: null };
  }

  // R mode (Backtest)
  const SL = getTradeSL(trade, accountOrSL);
  const target = SL * R;
  const slHit = trade.mae >= SL;
  const rAchieved = slHit ? 0 : +(trade.mfe / SL).toFixed(2);

  if (slHit) return { result: 'loss', score: -1, r: -1, rAchieved };
  if (trade.mfe >= target) return { result: 'win', score: R, r: R, rAchieved };
  return { result: 'loss', score: -1, r: -1, rAchieved };
}

export function applyDynamicFilters(trades, filterSelections, dynamicKeys) {
  if (!trades || trades.length === 0) return trades;
  return trades.filter(t => {
    for (const key of dynamicKeys) {
      const selected = filterSelections[key] || [];
      if (selected.length === 0) continue;
      const val = t.dynamic?.[key];
      if (val == null || !selected.includes(val)) return false;
    }
    return true;
  });
}

export function applySessionTimeFilter(trades, stMode, selectedSessions, selectedTimeBlocks) {
  if (!trades || trades.length === 0) return trades;
  if (stMode === 'session' && selectedSessions.length === 0) return trades;
  if (stMode === 'time' && selectedTimeBlocks.length === 0) return trades;

  return trades.filter(t => {
    if (stMode === 'session') return selectedSessions.includes(t.session);
    return selectedTimeBlocks.includes(t.bucket);
  });
}

// Limits: day-count, session-count, and outcome-based (rrLimit).
//   - R mode: cum accumulates R multiples; stop when cum >= winLimit or <= -lossLimit
//   - $ mode: cum accumulates netPnl; limits interpreted as $ amounts
// Both branches use the same filterParams { winLimit, lossLimit }.
export function applyLimitsFilter(trades, activeFilterType, filterParams, currentR, accountOrSL) {
  if (!trades || trades.length === 0) return trades;
  if (activeFilterType === 'none') return trades;

  const sorted = [...trades].sort((a, b) => {
    if (a.date === b.date) return a.entryMinutes - b.entryMinutes;
    return a.date.localeCompare(b.date);
  });

  if (activeFilterType === 'day') {
    const limit = filterParams.dayLimit || 2;
    const perDay = new Map();
    return sorted.filter(t => {
      const count = perDay.get(t.date) || 0;
      if (count >= limit) return false;
      perDay.set(t.date, count + 1);
      return true;
    });
  }

  if (activeFilterType === 'session') {
    const limit = filterParams.sessionLimit || 2;
    const keyMap = new Map();
    return sorted.filter(t => {
      const key = t.date + '|' + t.session;
      const count = keyMap.get(key) || 0;
      if (count >= limit) return false;
      keyMap.set(key, count + 1);
      return true;
    });
  }

  if (activeFilterType === 'rrLimit') {
    const winLimit = filterParams.winLimit || 2;
    const lossLimit = filterParams.lossLimit || 2;
    const dailyCum = new Map();
    const stoppedDays = new Set();
    const result = [];
    for (const t of sorted) {
      const day = t.date;
      if (stoppedDays.has(day)) continue;
      const cum = dailyCum.get(day) || 0;
      const outcome = outcomeFor(t, currentR, accountOrSL);
      const newCum = cum + outcome.score;
      result.push(t);
      if (newCum >= winLimit || newCum <= -lossLimit) {
        stoppedDays.add(day);
      }
      dailyCum.set(day, newCum);
    }
    return result;
  }

  return sorted;
}

export function applyFilters(trades, state, accountOrSL) {
  let filtered = applyDynamicFilters(trades, state.filterSelections, state.dynamicFilterKeys);
  filtered = applySessionTimeFilter(filtered, state.stMode, state.selectedSessions, state.selectedTimeBlocks);
  filtered = applyLimitsFilter(filtered, state.activeFilterType, state.filterParams, state.currentR, accountOrSL);
  return filtered;
}