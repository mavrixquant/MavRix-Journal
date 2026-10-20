
import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppContext, actions } from './AppProvider';

const JOURNAL_TYPES = ['Live', 'Demo'];
const BACKTEST_TYPES = ['Backtest'];

export function useDashboardAccount() {
  const { state, dispatch } = useAppContext();
  const { pathname } = useLocation();

  const isJournal = pathname.startsWith('/journal');
  const isBacktester = pathname.startsWith('/backtester');

  const dashboardType = isJournal
    ? 'journal'
    : isBacktester
      ? 'backtester'
      : 'other';

  const allowedTypes = isJournal
    ? JOURNAL_TYPES
    : isBacktester
      ? BACKTEST_TYPES
      : null;

  const showAccountSelect = isJournal || isBacktester;

  const accountId = isJournal
    ? state.journalAccountId
    : isBacktester
      ? state.backtesterAccountId
      : state.selectedAccountId;

  const setAccountId = useCallback(
    (id) => {
      if (dashboardType === 'other') {
        dispatch({ type: actions.SET_SELECTED_ACCOUNT_ID, payload: id });
        return;
      }
      dispatch({
        type: actions.SET_DASHBOARD_ACCOUNT_ID,
        payload: { dashboardType, accountId: id },
      });
    },
    [dispatch, dashboardType]
  );

  return {
    dashboardType,
    allowedTypes,
    showAccountSelect,
    accountId,
    setAccountId,
  };
}

export { JOURNAL_TYPES, BACKTEST_TYPES };