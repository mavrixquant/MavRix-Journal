// src/hooks/useFilters.js
import { useAppContext, actions } from '../context/AppContext';
import { applyFilters } from '../utils/filterHelpers';

export function useFilters() {
  const { state, dispatch } = useAppContext();

  // Update a single filter selection (dynamic filter)
  const setFilterSelection = (key, selectedValues) => {
    const newSelections = { ...state.filterSelections, [key]: selectedValues };
    dispatch({ type: actions.SET_FILTER_SELECTIONS, payload: newSelections });
  };

  // Reset all filters to default
  const resetAllFilters = () => {
    dispatch({ type: actions.RESET_FILTERS });
  };

  // Update session/time mode
  const setSTMode = (mode) => {
    dispatch({ type: actions.SET_ST_MODE, payload: mode });
  };

  // Update selected sessions
  const setSelectedSessions = (sessions) => {
    dispatch({ type: actions.SET_SELECTED_SESSIONS, payload: sessions });
  };

  // Update selected time blocks
  const setSelectedTimeBlocks = (blocks) => {
    dispatch({ type: actions.SET_SELECTED_TIME_BLOCKS, payload: blocks });
  };

  // Update active limit type
  const setActiveFilterType = (type) => {
    dispatch({ type: actions.SET_ACTIVE_FILTER_TYPE, payload: type });
  };

  // Update limit parameters
  const setFilterParams = (params) => {
    dispatch({ type: actions.SET_FILTER_PARAMS, payload: params });
  };

  // Get the filtered trades using the current state
  const getFilteredTrades = () => {
    return applyFilters(state.trades, state);
  };

  return {
    // State
    filterSelections: state.filterSelections,
    stMode: state.stMode,
    selectedSessions: state.selectedSessions,
    selectedTimeBlocks: state.selectedTimeBlocks,
    activeFilterType: state.activeFilterType,
    filterParams: state.filterParams,
    // Actions
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