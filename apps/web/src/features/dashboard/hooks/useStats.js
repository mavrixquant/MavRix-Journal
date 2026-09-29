// apps/web/src/features/dashboard/hooks/useStats.js
import { useMemo } from 'react';
import { useAppContext } from '@/app/providers/AppProvider';
import { useDashboardAccount } from '@/app/providers/useDashboardAccount';
import { useFilters } from './useFilters';
import { computeStats, groupAgg } from '@/shared/trading/stats';
import { getMetricMode, resolveSL } from '@/shared/trading/sl';
import {
  buildMonthlySeries,
  buildRollingExpectancy,
  buildUnderwaterCurve,
  buildSymbolBreakdown,
} from '@/shared/trading/analytics';

export function useStats() {
  const { state } = useAppContext();
  const { getFilteredTrades } = useFilters();
  const { accountId } = useDashboardAccount();

  // Route-aware: the account slot for the CURRENT dashboard, not the
  // legacy mirror. When null, every downstream series collapses to
  // empty — that's what prevents Journal from showing Backtest
  // content when only a Backtest account exists.
  const selectedAccount = useMemo(
    () => state.accounts.find(a => a.id === accountId) || null,
    [state.accounts, accountId]
  );

  const filteredTrades = useMemo(() => {
    if (!selectedAccount) return [];
    return getFilteredTrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    state.trades,
    state.filterSelections,
    state.stMode,
    state.selectedSessions,
    state.selectedTimeBlocks,
    state.activeFilterType,
    state.filterParams,
    state.currentR,
    accountId,
    state.accounts,
    selectedAccount,
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