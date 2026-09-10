// src/hooks/useStats.js
import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { useFilters } from './useFilters';
import { computeStats, groupAgg } from '../utils/statsEngine';
import { getMetricMode, resolveSL } from '../utils/slResolver';
import {
  buildMonthlySeries,
  buildRollingExpectancy,
  buildUnderwaterCurve,
  buildSymbolBreakdown,
} from '../utils/analyticsEngine';

export function useStats() {
  const { state } = useAppContext();
  const { getFilteredTrades } = useFilters();

  const selectedAccount = useMemo(
    () => state.accounts.find(a => a.id === state.selectedAccountId) || null,
    [state.accounts, state.selectedAccountId]
  );

  const filteredTrades = useMemo(() => {
    return getFilteredTrades();
  }, [
    state.trades,
    state.filterSelections,
    state.stMode,
    state.selectedSessions,
    state.selectedTimeBlocks,
    state.activeFilterType,
    state.filterParams,
    state.currentR,
    state.selectedAccountId,
    state.accounts,
  ]);

  const stats = useMemo(() => {
    return computeStats(filteredTrades, state.currentR, selectedAccount);
  }, [filteredTrades, state.currentR, selectedAccount]);

  const groupBy = (keyFn, order) => groupAgg(stats.outcomes, keyFn, order);

  const SL = resolveSL(selectedAccount);
  const metric = getMetricMode(selectedAccount);

  // --- Series helpers (memoized on outcomes) ---
  const monthlySeries = useMemo(
    () => buildMonthlySeries(stats.outcomes),
    [stats.outcomes]
  );

  const rollingExpectancy = useMemo(
    () => buildRollingExpectancy(stats.outcomes, 20),
    [stats.outcomes]
  );

  const underwaterCurve = useMemo(
    () => buildUnderwaterCurve(stats.outcomes),
    [stats.outcomes]
  );

  const symbolBreakdown = useMemo(
    () => buildSymbolBreakdown(stats.outcomes),
    [stats.outcomes]
  );

  return {
    stats,
    filteredTrades,
    groupBy,
    currentR: state.currentR,
    SL,
    metric,
    account: selectedAccount,
    // New series
    monthlySeries,
    rollingExpectancy,
    underwaterCurve,
    symbolBreakdown,
  };
}