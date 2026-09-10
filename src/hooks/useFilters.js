// src/hooks/useFilters.js
import { useAppContext, actions } from '../context/AppContext';
import { applyFilters } from '../utils/filterHelpers';
import { resolveSL } from '../utils/slResolver';

export function useFilters() {
  const { state, dispatch } = useAppContext();

  const selectedAccount = state.accounts.find(a => a.id === state.selectedAccountId);
  const SL = resolveSL(selectedAccount);

  const setFilterSelection = (key, selectedValues) => {
    const newSelections = { ...state.filterSelections, [key]: selectedValues };
    dispatch({ type: actions.SET_FILTER_SELECTIONS, payload: newSelections });
  };

  const resetAllFilters = () => {
    dispatch({ type: actions.RESET_FILTERS });
  };

  const setSTMode = (mode) => {
    dispatch({ type: actions.SET_ST_MODE, payload: mode });
  };

  const setSelectedSessions = (sessions) => {
    dispatch({ type: actions.SET_SELECTED_SESSIONS, payload: sessions });
  };

  const setSelectedTimeBlocks = (blocks) => {
    dispatch({ type: actions.SET_SELECTED_TIME_BLOCKS, payload: blocks });
  };

  const setActiveFilterType = (type) => {
    dispatch({ type: actions.SET_ACTIVE_FILTER_TYPE, payload: type });
  };

  const setFilterParams = (params) => {
    dispatch({ type: actions.SET_FILTER_PARAMS, payload: params });
  };

  const getFilteredTrades = () => {
    return applyFilters(state.trades, state, SL);
  };

  return {
    filterSelections: state.filterSelections,
    stMode: state.stMode,
    selectedSessions: state.selectedSessions,
    selectedTimeBlocks: state.selectedTimeBlocks,
    activeFilterType: state.activeFilterType,
    filterParams: state.filterParams,
    SL,
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