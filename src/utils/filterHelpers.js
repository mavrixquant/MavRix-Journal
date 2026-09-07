// src/utils/filterHelpers.js

// Outcome evaluation for a single trade at a given R
export function outcomeFor(trade, R) {
  const target = 12.5 * R; // SL fixed at 12.5
  if (trade.slHit) return { result: 'loss', r: -1 };
  if (trade.mfe >= target) return { result: 'win', r: R };
  return { result: 'loss', r: -1 };
}

// Apply dynamic filters (multi-select on filter columns)
export function applyDynamicFilters(trades, filterSelections, dynamicKeys) {
  if (!trades || trades.length === 0) return trades;
  return trades.filter(t => {
    for (const key of dynamicKeys) {
      const selected = filterSelections[key] || [];
      if (selected.length === 0) continue;
      const val = t.dynamic[key];
      if (val == null || !selected.includes(val)) return false;
    }
    return true;
  });
}

// Apply session/time filter
export function applySessionTimeFilter(trades, stMode, selectedSessions, selectedTimeBlocks) {
  if (!trades || trades.length === 0) return trades;
  if (stMode === 'session' && selectedSessions.length === 0) return trades;
  if (stMode === 'time' && selectedTimeBlocks.length === 0) return trades;

  return trades.filter(t => {
    if (stMode === 'session') {
      return selectedSessions.includes(t.session);
    } else {
      return selectedTimeBlocks.includes(t.bucket);
    }
  });
}

// Apply limits filter (day, session, or RR limit)
export function applyLimitsFilter(trades, activeFilterType, filterParams, currentR) {
  if (!trades || trades.length === 0) return trades;
  if (activeFilterType === 'none') return trades;

  // Sort by date/time to maintain chronological order
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
      const outcome = outcomeFor(t, currentR);
      const newCum = cum + outcome.r;
      result.push(t);
      if (newCum >= winLimit || newCum <= -lossLimit) {
        stoppedDays.add(day);
        dailyCum.set(day, newCum);
      } else {
        dailyCum.set(day, newCum);
      }
    }
    return result;
  }

  return sorted;
}

// Combined filter: apply all in order
export function applyFilters(trades, state) {
  let filtered = applyDynamicFilters(trades, state.filterSelections, state.dynamicFilterKeys);
  filtered = applySessionTimeFilter(filtered, state.stMode, state.selectedSessions, state.selectedTimeBlocks);
  filtered = applyLimitsFilter(filtered, state.activeFilterType, state.filterParams, state.currentR);
  return filtered;
}