// apps/web/src/features/dashboard/hooks/useFilters.js
import { useMemo } from 'react';
import { useAppContext, actions } from '@/app/providers/AppProvider';
import { useDashboardAccount } from '@/app/providers/useDashboardAccount';
import { applyFilters } from '@/shared/trading/filters';
import { resolveSL } from '@/shared/trading/sl';

export function useFilters() {
  const { state, dispatch } = useAppContext();
  const { accountId } = useDashboardAccount();

  // Route-aware: reads the account slot for the CURRENT route, not
  // the legacy mirror. This is the guard that stops Journal from
  // scoring Backtest trades when only a Backtest account exists.
  const selectedAccount = useMemo(
    () => state.accounts.find(a => a.id === accountId) || null,
    [state.accounts, accountId]
  );

  const setFilterSelection = (key, selectedValues) => {
    const newSelections = { ...state.filterSelections, [key]: selectedValues };
    dispatch({ type: actions.SET_FILTER_SELECTIONS, payload: newSelections });
  };

  const resetAllFilters = () => dispatch({ type: actions.RESET_FILTERS });
  const setSTMode = (mode) => dispatch({ type: actions.SET_ST_MODE, payload: mode });
  const setSelectedSessions = (s) => dispatch({ type: actions.SET_SELECTED_SESSIONS, payload: s });
  const setSelectedTimeBlocks = (b) => dispatch({ type: actions.SET_SELECTED_TIME_BLOCKS, payload: b });
  const setActiveFilterType = (t) => dispatch({ type: actions.SET_ACTIVE_FILTER_TYPE, payload: t });
  const setFilterParams = (p) => dispatch({ type: actions.SET_FILTER_PARAMS, payload: p });

  // Guard: no account for the current dashboard type → no trades.
  // Without this, the caller would score stale trades from the OTHER
  // dashboard's cache.
  const getFilteredTrades = () => {
    if (!selectedAccount) return [];
    return applyFilters(state.trades, state, selectedAccount);
  };

  return {
    filterSelections: state.filterSelections,
    stMode: state.stMode,
    selectedSessions: state.selectedSessions,
    selectedTimeBlocks: state.selectedTimeBlocks,
    activeFilterType: state.activeFilterType,
    filterParams: state.filterParams,
    SL: resolveSL(selectedAccount),
    setFilterSelection,
    resetAllFilters,
    setSTMode,
    setSelectedSessions,
    setSelectedTimeBlocks,
    setActiveFilterType,
    setFilterParams,
    getFilteredTrades,
  };
}