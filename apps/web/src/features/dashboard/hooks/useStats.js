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

  const selectedAccount = useMemo(
    () => state.accounts.find(a => a.id === accountId) || null,
    [state.accounts, accountId]
  );

  const filteredTrades = useMemo(() => {
    if (!selectedAccount) return [];
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
    monthlySeries,
    rollingExpectancy,
    underwaterCurve,
    symbolBreakdown,
  };
}