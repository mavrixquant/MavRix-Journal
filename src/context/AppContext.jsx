// src/context/AppContext.jsx
import { createContext, useContext, useReducer, useMemo } from 'react';

// ---------- Initial State ----------
const initialState = {
  // Raw trades (enriched)
  trades: [],
  // Currently selected R:R (1-8)
  currentR: 1,
  // Dynamic filter selections: { columnKey: [selectedValues] }
  filterSelections: {},
  // Dynamic filter keys (column names from Excel)
  dynamicFilterKeys: [],
  // Session/Time filter state
  stMode: 'session',        // 'session' or 'time'
  selectedSessions: [],
  selectedTimeBlocks: [],
  // Advanced limits filter
  activeFilterType: 'none', // 'none', 'day', 'session', 'rrLimit'
  filterParams: {
    sessionLimit: 2,
    dayLimit: 2,
    winLimit: 2,
    lossLimit: 2,
  },
  // UI state
  isUploadGateVisible: true,
  fileStatus: 'no file loaded',
  subtitleText: 'Waiting for a trade log to be loaded…',
  // Optimization state (stored here for global access)
  optimize: {
    columnEnabled: {},
    columnValues: {},
    rrSelected: [1,2,3,4,5,6,7,8],
    results: [],
    currentPage: 1,
    isRunning: false,
    progress: 0,
    status: 'Idle',
    sortKey: 'totalR',
    sortDir: -1,
  },
};

// ---------- Action Types ----------
const ACTION_TYPES = {
  SET_TRADES: 'SET_TRADES',
  SET_CURRENT_R: 'SET_CURRENT_R',
  SET_FILTER_SELECTIONS: 'SET_FILTER_SELECTIONS',
  SET_DYNAMIC_FILTER_KEYS: 'SET_DYNAMIC_FILTER_KEYS',
  SET_ST_MODE: 'SET_ST_MODE',
  SET_SELECTED_SESSIONS: 'SET_SELECTED_SESSIONS',
  SET_SELECTED_TIME_BLOCKS: 'SET_SELECTED_TIME_BLOCKS',
  SET_ACTIVE_FILTER_TYPE: 'SET_ACTIVE_FILTER_TYPE',
  SET_FILTER_PARAMS: 'SET_FILTER_PARAMS',
  SET_UI: 'SET_UI',
  RESET_FILTERS: 'RESET_FILTERS',
  SET_OPTIMIZE: 'SET_OPTIMIZE',
  RESET_OPTIMIZE: 'RESET_OPTIMIZE',
};

// ---------- Reducer ----------
function appReducer(state, action) {
  switch (action.type) {
    case ACTION_TYPES.SET_TRADES:
      return { ...state, trades: action.payload };
    case ACTION_TYPES.SET_CURRENT_R:
      return { ...state, currentR: action.payload };
    case ACTION_TYPES.SET_FILTER_SELECTIONS:
      return { ...state, filterSelections: action.payload };
    case ACTION_TYPES.SET_DYNAMIC_FILTER_KEYS:
      return { ...state, dynamicFilterKeys: action.payload };
    case ACTION_TYPES.SET_ST_MODE:
      return { ...state, stMode: action.payload };
    case ACTION_TYPES.SET_SELECTED_SESSIONS:
      return { ...state, selectedSessions: action.payload };
    case ACTION_TYPES.SET_SELECTED_TIME_BLOCKS:
      return { ...state, selectedTimeBlocks: action.payload };
    case ACTION_TYPES.SET_ACTIVE_FILTER_TYPE:
      return { ...state, activeFilterType: action.payload };
    case ACTION_TYPES.SET_FILTER_PARAMS:
      return { ...state, filterParams: { ...state.filterParams, ...action.payload } };
    case ACTION_TYPES.SET_UI:
      return { ...state, ...action.payload };
    case ACTION_TYPES.RESET_FILTERS:
      // Reset all filters to defaults, but keep trades
      return {
        ...state,
        filterSelections: {},
        stMode: 'session',
        selectedSessions: [],
        selectedTimeBlocks: [],
        activeFilterType: 'none',
        filterParams: { sessionLimit: 2, dayLimit: 2, winLimit: 2, lossLimit: 2 },
      };
    case ACTION_TYPES.SET_OPTIMIZE:
      return {
        ...state,
        optimize: { ...state.optimize, ...action.payload },
      };
    case ACTION_TYPES.RESET_OPTIMIZE:
      return {
        ...state,
        optimize: {
          columnEnabled: {},
          columnValues: {},
          rrSelected: [1,2,3,4,5,6,7,8],
          results: [],
          currentPage: 1,
          isRunning: false,
          progress: 0,
          status: 'Idle',
          sortKey: 'totalR',
          sortDir: -1,
        },
      };
    default:
      return state;
  }
}

// ---------- Context ----------
const AppContext = createContext(null);

// ---------- Provider ----------
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Memoize the context value to avoid unnecessary re-renders
  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ---------- Custom Hook ----------
export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

// Export action types for use in components
export const actions = ACTION_TYPES;