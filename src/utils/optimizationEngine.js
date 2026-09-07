// src/utils/optimizationEngine.js
import { applyLimitsFilter, applySessionTimeFilter } from './filterHelpers';
import { computeStats } from './statsEngine';

// Cartesian product of arrays
export function cartesianProduct(arrays) {
  return arrays.reduce((acc, arr) => {
    const result = [];
    for (const a of acc) {
      for (const b of arr) {
        result.push([...a, b]);
      }
    }
    return result;
  }, [[]]);
}

// Generate all subsets of an array (including empty)
export function getAllSubsets(arr) {
  const subsets = [[]];
  for (const val of arr) {
    const currentLength = subsets.length;
    for (let i = 0; i < currentLength; i++) {
      subsets.push([...subsets[i], val]);
    }
  }
  return subsets;
}

// Apply a subset combination filter (combo[i] is the allowed values for column i)
export function applySubsetCombinationFilter(trades, combo, selectedKeys) {
  if (!trades || trades.length === 0) return trades;
  return trades.filter(t => {
    for (let i = 0; i < selectedKeys.length; i++) {
      const key = selectedKeys[i];
      const subset = combo[i];
      if (subset.length === 0) continue; // no filter on this column
      const val = t.dynamic[key];
      if (!subset.includes(val)) return false;
    }
    return true;
  });
}

// Run optimization: test all combinations of selected columns and RRs
export async function runOptimization(
  allTrades,
  columnEnabled,
  columnValues,
  rrSelected,
  stMode,
  selectedSessions,
  selectedTimeBlocks,
  activeFilterType,
  filterParams,
  currentR,
  onProgress
) {
  // Gather enabled columns and their selected values
  const selectedColumns = [];
  const selectedValues = [];
  for (const key of Object.keys(columnEnabled)) {
    if (columnEnabled[key]) {
      const vals = columnValues[key] || [];
      const allVals = [...new Set(allTrades.map(t => t.dynamic[key]))].filter(v => v && v !== '—');
      const toUse = vals.length > 0 ? vals : allVals;
      if (toUse.length === 0) continue;
      selectedColumns.push(key);
      selectedValues.push(toUse);
    }
  }

  if (selectedColumns.length === 0 || rrSelected.length === 0) {
    return [];
  }

  // Generate all subsets (non-empty) for each column's values
  const subsetSets = selectedValues.map(vals => {
    const subsets = getAllSubsets(vals);
    return subsets.filter(sub => sub.length > 0);
  });

  const totalCombos = subsetSets.reduce((a, b) => a * b.length, 1);
  const totalResults = totalCombos * rrSelected.length;

  if (totalCombos > 500000) {
    throw new Error(`Too many combinations (${totalCombos}). Please select fewer columns or values.`);
  }

  const combos = cartesianProduct(subsetSets);
  if (combos.length === 0) return [];

  // Base trades: apply Limits and Session/Time filters
  const baseTrades = applyLimitsFilter(
    applySessionTimeFilter(allTrades, stMode, selectedSessions, selectedTimeBlocks),
    activeFilterType,
    filterParams,
    currentR
  );

  if (baseTrades.length === 0) return [];

  const results = [];
  let processed = 0;
  const chunkSize = 100;
  const total = combos.length * rrSelected.length;

  for (let i = 0; i < combos.length; i += chunkSize) {
    const chunk = combos.slice(i, Math.min(i + chunkSize, combos.length));
    for (const combo of chunk) {
      for (const rr of rrSelected) {
        const filtered = applySubsetCombinationFilter(baseTrades, combo, selectedColumns);
        const stats = computeStats(filtered, rr);

        const comboDisplay = combo.map((subset, ci) => {
          const colName = selectedColumns[ci];
          const fullSet = selectedValues[ci];
          const isAll = subset.length === fullSet.length && subset.every(v => fullSet.includes(v));
          const display = isAll ? 'All' : subset.join(', ');
          return `${colName}: ${display}`;
        }).join(' | ') + ` | RR: 1:${rr}`;

        results.push({
          combo: combo.slice(),
          comboDisplay,
          rr,
          totalR: stats.totalR,
          winRate: stats.winRate,
          profitFactor: stats.profitFactor,
          expectancy: stats.expectancy,
          lossStreak: stats.worstLossStreak,
          trades: stats.n,
        });
        processed++;
      }
    }

    const pct = Math.round((processed / total) * 100);
    if (onProgress) onProgress(pct, processed, total);
    await new Promise(resolve => setTimeout(resolve, 0)); // yield to UI
  }

  // Sort by totalR descending by default
  results.sort((a, b) => b.totalR - a.totalR);
  return results;
}