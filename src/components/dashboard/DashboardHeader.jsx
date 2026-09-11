// src/components/dashboard/DashboardHeader.jsx
import { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useFilters } from '../../hooks/useFilters';
import { subscribeToAccounts } from '../../firebase/accountsService';
import { subscribeToTrades } from '../../firebase/tradesService';
import { enrichTradesFromDB } from '../../utils/enrichTrades';
import { FaSlidersH } from 'react-icons/fa';

import RRTabs from './filters/RRTabs';
import DynamicFilters from './filters/DynamicFilters';
import SessionTimeModal from './filters/SessionTimeModal';
import LimitsModal from './filters/LimitsModal';
import OptimizeModal from './optimize/OptimizeModal';

export default function DashboardHeader({ onCustomize }) {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const { resetAllFilters } = useFilters();

  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showLimitsModal, setShowLimitsModal] = useState(false);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);

  useEffect(() => {
    if (!user) {
      dispatch({ type: 'SET_ACCOUNTS', payload: [] });
      dispatch({ type: 'SET_SELECTED_ACCOUNT_ID', payload: null });
      return;
    }
    const unsubscribe = subscribeToAccounts(user.uid, (accounts) => {
      dispatch({ type: 'SET_ACCOUNTS', payload: accounts });
    });
    return () => unsubscribe();
  }, [user, dispatch]);

  useEffect(() => {
    if (state.accounts.length > 0 && !state.selectedAccountId) {
      dispatch({ type: 'SET_SELECTED_ACCOUNT_ID', payload: state.accounts[0].id });
    }
  }, [state.accounts, state.selectedAccountId, dispatch]);

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
    });
    return () => unsubscribe();
  }, [state.selectedAccountId, dispatch]);

  const selectedAccount = state.accounts.find((acc) => acc.id === state.selectedAccountId) || null;
  const isBacktest = selectedAccount?.type === 'Backtest';

  return (
    <header className="dashboard-header-container">
      <div className="header-main-row">
        <div className="header-title-group">
          <h1 className="header-title">Dashboard</h1>
          {selectedAccount && (
            <span className={`account-badge badge-${selectedAccount.type?.toLowerCase()}`}>
              {selectedAccount.type}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Customize button */}
          <button
            type="button"
            onClick={onCustomize}
            title="Customize dashboard"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              padding: '9px 14px',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border, #212836)',
              borderRadius: '8px',
              color: 'var(--text-dim, #8892A3)',
              fontSize: '12.5px', fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#FFB020';
              e.currentTarget.style.borderColor = 'rgba(255, 176, 32, 0.4)';
              e.currentTarget.style.background = 'rgba(255, 176, 32, 0.06)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-dim, #8892A3)';
              e.currentTarget.style.borderColor = 'var(--border, #212836)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
            }}
          >
            <FaSlidersH size={12} />
            Customize
          </button>

          {/* Account selector */}
          <div className="account-select-wrapper">
            <label htmlFor="account-select" className="sr-only">Select Trading Account</label>
            <select
              id="account-select"
              className="account-select-dropdown"
              value={state.selectedAccountId || ''}
              onChange={(e) => dispatch({ type: 'SET_SELECTED_ACCOUNT_ID', payload: e.target.value })}
            >
              <option value="" disabled>Select Account</option>
              {state.accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
              ))}
            </select>
            <svg className="select-chevron" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      </div>

      {/* Filter toolbar — unchanged */}
      <div className="filter-toolbar">
        {isBacktest && (
          <div className="filter-toolbar-section">
            <span className="rr-label">Target R:R</span>
            <RRTabs />
          </div>
        )}

        <div className="filter-toolbar-section filter-actions-group">
          <DynamicFilters />

          <button type="button" className="btn-toolbar btn-session" onClick={() => setShowSessionModal(true)}>
            <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Session / Time</span>
          </button>

          <button type="button" className="btn-toolbar btn-limits" onClick={() => setShowLimitsModal(true)}>
            <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <span>Limits</span>
          </button>

          {isBacktest && (
            <button type="button" className="btn-toolbar btn-optimize" onClick={() => setShowOptimizeModal(true)}>
              <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="11" y1="8" x2="11" y2="14" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
              <span>Optimize</span>
            </button>
          )}

          <button type="button" className="btn-toolbar-reset" onClick={resetAllFilters}>
            <svg className="btn-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span>Reset filters</span>
          </button>
        </div>
      </div>

      {showSessionModal && <SessionTimeModal isOpen={showSessionModal} onClose={() => setShowSessionModal(false)} />}
      {showLimitsModal && <LimitsModal isOpen={showLimitsModal} onClose={() => setShowLimitsModal(false)} />}
      {showOptimizeModal && <OptimizeModal isOpen={showOptimizeModal} onClose={() => setShowOptimizeModal(false)} />}
    </header>
  );
}