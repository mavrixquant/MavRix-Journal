// apps/web/src/features/dashboard/hooks/useOptimization.js
import { useState, useCallback, useMemo } from 'react';
import { useAppContext, actions } from '@/app/providers/AppProvider';
import { useDashboardAccount } from '@/app/providers/useDashboardAccount';
import { runOptimization } from '@/shared/trading/optimization';
import { getMetricMode } from '@/shared/trading/sl';

export function useOptimization() {
  const { state, dispatch } = useAppContext();
  const { accountId } = useDashboardAccount();

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Idle');
  const [results, setResults] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Route-aware: the CURRENT dashboard's account slot (Journal or Backtester).
  const selectedAccount = useMemo(
    () => state.accounts.find(a => a.id === accountId) || null,
    [state.accounts, accountId]
  );

  // 'R' for Backtest accounts, '$' for Live/Demo.
  const metric = useMemo(() => getMetricMode(selectedAccount), [selectedAccount]);
  const isMoney = metric === '$';

  const updateOptimizeState = useCallback((payload) => {
    dispatch({ type: actions.SET_OPTIMIZE, payload });
  }, [dispatch]);

  const toggleColumn = useCallback((key, enabled) => {
    const newEnabled = { ...state.optimize.columnEnabled, [key]: enabled };
    if (enabled) {
      const allValues = [...new Set(state.trades.map(t => t.dynamic[key]))]
        .filter(v => v && v !== '—');
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
    if (!selectedAccount) {
      setStatus('Select an account first.');
      return;
    }

    // RR targets are only meaningful for Backtest accounts. In money mode
    // we pass [] down and the engine substitutes a single placeholder.
    const rrToUse = selectedRRs || state.optimize.rrSelected;
    if (!isMoney && rrToUse.length === 0) {
      setStatus('Please select at least one RR target.');
      return;
    }

    const hasEnabled = Object.values(state.optimize.columnEnabled)
      .some(v => v === true);
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
        isMoney ? [] : rrToUse,
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
        selectedAccount
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
    selectedAccount,
    isMoney,
    updateOptimizeState,
  ]);

  const goToPage = useCallback((page) => {
    const tp = Math.ceil(results.length / pageSize);
    if (page < 1 || page > tp) return;
    setCurrentPage(page);
    updateOptimizeState({ currentPage: page });
  }, [results, updateOptimizeState]);

  const totalPages = Math.ceil(results.length / pageSize);
  const pageResults = results.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

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

    // NEW — mode metadata consumed by OptimizeModal
    isMoney,
    metric,
    account: selectedAccount,

    // Actions
    toggleColumn,
    setColumnValues,
    setRRSelection,
    runOptimizationAsync,
    goToPage,
    resetOptimization,
  };
}