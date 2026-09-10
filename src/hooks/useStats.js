// src/hooks/useStats.js
import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import { useFilters } from './useFilters';
import { computeStats, groupAgg } from '../utils/statsEngine';

export function useStats() {
  const { state } = useAppContext();
  const { getFilteredTrades, SL } = useFilters();

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
    return computeStats(filteredTrades, state.currentR, SL);
  }, [filteredTrades, state.currentR, SL]);

  const groupBy = (keyFn, order) => {
    return groupAgg(stats.outcomes, keyFn, order);
  };

  return {
    stats,
    filteredTrades,
    groupBy,
    currentR: state.currentR,
    SL,
  };
}