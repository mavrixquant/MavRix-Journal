// src/hooks/useFilters.js
import { useMemo } from 'react';
import { useAppContext, actions } from '../context/AppContext';
import { applyFilters } from '../utils/filterHelpers';
import { resolveSL } from '../utils/slResolver';

export function useFilters() {
  const { state, dispatch } = useAppContext();

  const selectedAccount = useMemo(
    () => state.accounts.find(a => a.id === state.selectedAccountId) || null,
    [state.accounts, state.selectedAccountId]
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

  const getFilteredTrades = () => applyFilters(state.trades, state, selectedAccount);

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