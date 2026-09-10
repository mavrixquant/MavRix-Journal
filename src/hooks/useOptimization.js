// src/hooks/useOptimization.js
import { useState, useCallback } from 'react';
import { useAppContext, actions } from '../context/AppContext';
import { runOptimization } from '../utils/optimizationEngine';

export function useOptimization() {
  const { state, dispatch } = useAppContext();
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Idle');
  const [results, setResults] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  const updateOptimizeState = useCallback((payload) => {
    dispatch({ type: actions.SET_OPTIMIZE, payload });
  }, [dispatch]);

  const toggleColumn = useCallback((key, enabled) => {
    const newEnabled = { ...state.optimize.columnEnabled, [key]: enabled };
    if (enabled) {
      const allValues = [...new Set(state.trades.map(t => t.dynamic[key]))].filter(v => v && v !== '—');
      const newValues = { ...state.optimize.columnValues, [key]: allValues };
      updateOptimizeState({ columnEnabled: newEnabled, columnValues: newValues });
    } else {
      const newValues = { ...state.optimize.columnValues };
      delete newValues[key];
      updateOptimizeState({ columnEnabled: newEnabled, columnValues: newValues });
    }
  }, [state.trades, state.optimize, updateOptimizeState]);

  const setColumnValues = useCallback((key, values) => {
    const newValues = { ...state.optimize.columnValues, [key]: values };
    updateOptimizeState({ columnValues: newValues });
  }, [state.optimize, updateOptimizeState]);

  const setRRSelection = useCallback((rrValues) => {
    updateOptimizeState({ rrSelected: rrValues });
  }, [updateOptimizeState]);

  const resetOptimization = useCallback(() => {
    dispatch({ type: actions.RESET_OPTIMIZE });
    setResults([]);
    setProgress(0);
    setStatus('Idle');
    setCurrentPage(1);
    setIsRunning(false);
  }, [dispatch]);

  const runOptimizationAsync = useCallback(async (selectedRRs) => {
    const selectedAccount = state.accounts.find(a => a.id === state.selectedAccountId);

    // Optimize is Backtest-only (R-multiple sweep is meaningless without per-trade SL)
    if (!selectedAccount || selectedAccount.type !== 'Backtest') {
      setStatus('Optimize is only available for Backtest accounts.');
      return;
    }

    const rrToUse = selectedRRs || state.optimize.rrSelected;
    if (rrToUse.length === 0) {
      setStatus('Please select at least one RR target.');
      return;
    }
    const hasEnabled = Object.values(state.optimize.columnEnabled).some(v => v === true);
    if (!hasEnabled) {
      setStatus('Please enable at least one filter column.');
      return;
    }
    setStatus('Initializing...');
    setProgress(0);
    setResults([]);
    setIsRunning(true);

    try {
      const resultsData = await runOptimization(
        state.trades,
        state.optimize.columnEnabled,
        state.optimize.columnValues,
        rrToUse,
        state.stMode,
        state.selectedSessions,
        state.selectedTimeBlocks,
        state.activeFilterType,
        state.filterParams,
        state.currentR,
        (pct, processed, total) => {
          setProgress(pct);
          setStatus(`Processing ${processed}/${total}...`);
        },
        selectedAccount   // ← account object (replaces old SL arg)
      );
      setResults(resultsData);
      setCurrentPage(1);
      setStatus(`Done (${resultsData.length} results)`);
      updateOptimizeState({ results: resultsData, currentPage: 1, isRunning: false });
      return resultsData;
    } catch (error) {
      setStatus(`Error: ${error.message}`);
      return [];
    } finally {
      setIsRunning(false);
    }
  }, [
    state.trades,
    state.optimize,
    state.stMode,
    state.selectedSessions,
    state.selectedTimeBlocks,
    state.activeFilterType,
    state.filterParams,
    state.currentR,
    state.accounts,
    state.selectedAccountId,
    updateOptimizeState,
  ]);

  const goToPage = useCallback((page) => {
    const totalPages = Math.ceil(results.length / pageSize);
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    updateOptimizeState({ currentPage: page });
  }, [results, updateOptimizeState]);

  const totalPages = Math.ceil(results.length / pageSize);
  const pageResults = results.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return {
    columnEnabled: state.optimize.columnEnabled,
    columnValues: state.optimize.columnValues,
    rrSelected: state.optimize.rrSelected,
    isRunning,
    progress,
    status,
    results,
    currentPage,
    totalPages,
    pageResults,
    pageSize,
    toggleColumn,
    setColumnValues,
    setRRSelection,
    runOptimizationAsync,
    goToPage,
    resetOptimization,
  };
}