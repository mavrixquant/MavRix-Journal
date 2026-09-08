import { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useFilters } from '../../hooks/useFilters';
import { subscribeToAccounts } from '../../firebase/accountsService';
import { subscribeToTrades } from '../../firebase/tradesService';
import { enrichTradesFromDB } from '../../utils/enrichTrades';
import RRTabs from './filters/RRTabs';
import DynamicFilters from './filters/DynamicFilters';
import SessionTimeModal from './filters/SessionTimeModal';
import LimitsModal from './filters/LimitsModal';
import OptimizeModal from './optimize/OptimizeModal';

export default function DashboardHeader() {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const { resetAllFilters } = useFilters();
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showLimitsModal, setShowLimitsModal] = useState(false);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);

  // Fetch accounts
  useEffect(() => {
    if (!user) {
      dispatch({ type: 'SET_ACCOUNTS', payload: [] });
      dispatch({ type: 'SET_SELECTED_ACCOUNT_ID', payload: null });
      return;
    }
    const unsubscribe = subscribeToAccounts(user.uid, (accounts) => {
      dispatch({ type: 'SET_ACCOUNTS', payload: accounts });
      if (!state.selectedAccountId && accounts.length > 0) {
        dispatch({ type: 'SET_SELECTED_ACCOUNT_ID', payload: accounts[0].id });
      }
    });
    return () => unsubscribe();
  }, [user, dispatch]);

  // Fetch trades for the selected account
  useEffect(() => {
    if (!state.selectedAccountId) {
      dispatch({ type: 'SET_TRADES', payload: [] });
      dispatch({ type: 'SET_DYNAMIC_FILTER_KEYS', payload: [] });
      return;
    }

    const unsubscribe = subscribeToTrades(state.selectedAccountId, (rawTrades) => {
      const { enrichedTrades, dynamicKeys } = enrichTradesFromDB(rawTrades);
      dispatch({ type: 'SET_TRADES', payload: enrichedTrades });
      dispatch({ type: 'SET_DYNAMIC_FILTER_KEYS', payload: dynamicKeys });
      // Optional: reset filters when switching accounts
      // resetAllFilters();
    });

    return () => unsubscribe();
  }, [state.selectedAccountId, dispatch]);

  const selectedAccount = state.accounts.find(acc => acc.id === state.selectedAccountId) || null;
  const isBacktest = selectedAccount?.type === 'Backtest';

  return (
    <header>
      <div className="header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Dashboard</h1>
        <div>
          <select
            value={state.selectedAccountId || ''}
            onChange={(e) => dispatch({ type: 'SET_SELECTED_ACCOUNT_ID', payload: e.target.value })}
            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
          >
            <option value="" disabled>Select Account</option>
            {state.accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {isBacktest && (
        <div className="rr-bar">
          <span className="rr-label">Target R:R</span>
          <RRTabs />

          <div className="filters">
            <DynamicFilters />

            <div className="filter-group">
              <button className="btn-upload" onClick={() => setShowSessionModal(true)} style={{ borderStyle: 'solid', padding: '8px 14px' }}>
                ⏱️ Session / Time
              </button>
            </div>

            <div className="filter-group">
              <button className="btn-upload" onClick={() => setShowLimitsModal(true)} style={{ borderStyle: 'solid', padding: '8px 14px' }}>
                ⚙️ Limits
              </button>
            </div>

            <div className="filter-group">
              <button
                className="btn-upload"
                onClick={() => setShowOptimizeModal(true)}
                style={{ borderStyle: 'solid', borderColor: 'var(--amber)', color: 'var(--amber)', padding: '8px 14px' }}
              >
                🔍 Optimize
              </button>
            </div>

            <button className="btn-reset" onClick={resetAllFilters}>✕ Reset filters</button>
          </div>
        </div>
      )}

      <SessionTimeModal isOpen={showSessionModal} onClose={() => setShowSessionModal(false)} />
      <LimitsModal isOpen={showLimitsModal} onClose={() => setShowLimitsModal(false)} />
      <OptimizeModal isOpen={showOptimizeModal} onClose={() => setShowOptimizeModal(false)} />
    </header>
  );
}