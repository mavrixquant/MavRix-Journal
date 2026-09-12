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

/* ------------------------------------------------------------------ */
/*  Scoped CSS — matches the dashboard's panel language                */
/* ------------------------------------------------------------------ */
const HDR_CSS = `
  .hdr-root {
    --accent: #F59E0B;
    --accent-2: #FDE68A;
    --accent-soft: rgba(245,158,11,.10);
    --accent-soft2: rgba(245,158,11,.28);
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;

    position: sticky;
    top: 0;
    z-index: 40;
    margin: 0 0 20px;
    padding: 16px 20px 14px;
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(15,18,25,.78), rgba(15,18,25,.58));
    backdrop-filter: blur(18px) saturate(140%);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
    border: 1px solid var(--line);
    box-shadow:
      0 20px 50px -30px rgba(0,0,0,.9),
      inset 0 1px 0 rgba(255,255,255,.03);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    color: var(--ink-1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .hdr-root::before {
    content: '';
    position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    border-radius: 18px 18px 0 0;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: hdrGrad 4s linear infinite;
    pointer-events: none;
  }

  /* ---------- Top row ---------- */
  .hdr-main {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
  }
  .hdr-title-group {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }
  .hdr-title {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -.02em;
    color: var(--ink-1);
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    line-height: 1.1;
  }
  .hdr-badge {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .1em;
    text-transform: uppercase;
    padding: 4px 10px;
    border-radius: 99px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: var(--ink-2);
    white-space: nowrap;
  }
  .hdr-badge.is-backtest {
    color: #38bdf8;
    border-color: rgba(56,189,248,.35);
    background: rgba(56,189,248,.08);
  }
  .hdr-badge.is-live {
    color: #4ade80;
    border-color: rgba(74,222,128,.35);
    background: rgba(74,222,128,.08);
  }

  /* ---------- Collapse chevron ---------- */
  .hdr-collapse {
    width: 26px;
    height: 26px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: var(--ink-2);
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding: 0;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
  }
  .hdr-collapse svg {
    width: 14px;
    height: 14px;
    transition: transform .38s cubic-bezier(.2,.8,.25,1);
    transform: rotate(0deg);   /* chevron up  = toolbar open */
  }
  .hdr-collapse.is-closed svg {
    transform: rotate(180deg); /* chevron down = toolbar hidden */
  }
  .hdr-collapse:hover {
    color: var(--accent);
    border-color: var(--accent-soft2);
    background: rgba(245,158,11,.06);
    box-shadow: 0 0 16px -6px rgba(245,158,11,.45);
  }
  .hdr-collapse:active { transform: scale(.94); }
  .hdr-collapse:focus-visible {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(245,158,11,.18);
  }

  .hdr-right {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  /* ---------- Customize button ---------- */
  .hdr-customize {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 9px 14px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.035);
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
    white-space: nowrap;
  }
  .hdr-customize:hover {
    color: var(--accent);
    border-color: var(--accent-soft2);
    background: rgba(245,158,11,.06);
    box-shadow: 0 0 20px -6px rgba(245,158,11,.4);
    transform: translateY(-1px);
  }

  /* ---------- Account select ---------- */
  .hdr-account {
    position: relative;
    min-width: 220px;
  }
  .hdr-account-select {
    width: 100%;
    appearance: none;
    -webkit-appearance: none;
    background: rgba(10,13,19,.6);
    color: var(--ink-1);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px;
    padding: 9px 36px 9px 14px;
    font-size: 12.5px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-weight: 500;
    cursor: pointer;
    outline: none;
    transition: all .2s ease;
  }
  .hdr-account-select:hover {
    border-color: rgba(255,255,255,.22);
    background: rgba(15,18,25,.85);
  }
  .hdr-account-select:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(245,158,11,.15);
  }
  .hdr-account-chevron {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    width: 14px;
    height: 14px;
    color: var(--ink-3);
    pointer-events: none;
    transition: color .2s;
  }
  .hdr-account:hover .hdr-account-chevron { color: var(--accent); }

  /* ---------- Collapsible toolbar wrapper ---------- */
  .hdr-toolbar-wrap {
    display: grid;
    grid-template-rows: 1fr;
    margin-top: 14px;
    opacity: 1;
    transition:
      grid-template-rows .38s cubic-bezier(.2,.8,.25,1),
      margin-top .3s cubic-bezier(.2,.8,.25,1),
      opacity .28s ease;
  }
  .hdr-toolbar-wrap.is-closed {
    grid-template-rows: 0fr;
    margin-top: 0;
    opacity: 0;
    pointer-events: none;
  }
  .hdr-toolbar-inner {
    overflow: hidden;
    min-height: 0;
  }

  /* ---------- Toolbar row ---------- */
  .hdr-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--line-soft);
  }
  .hdr-toolbar-section {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .hdr-rr-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--ink-3);
    white-space: nowrap;
  }
  .hdr-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  /* ---------- Toolbar buttons ---------- */
  .hdr-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 8px 14px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
    white-space: nowrap;
  }
  .hdr-btn:hover {
    color: var(--ink-1);
    background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.2);
    transform: translateY(-1px);
  }
  .hdr-btn:active { transform: translateY(0) scale(.98); }
  .hdr-btn svg { flex-shrink: 0; }

  .hdr-btn.is-optimize {
    border-color: var(--accent-soft2);
    background: rgba(245,158,11,.06);
    color: var(--accent);
  }
  .hdr-btn.is-optimize:hover {
    background: rgba(245,158,11,.12);
    border-color: var(--accent);
    color: var(--accent-2);
    box-shadow: 0 0 20px -6px rgba(245,158,11,.5);
  }

  .hdr-btn-reset {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 10px;
    border: 1px solid rgba(239,68,68,.28);
    background: rgba(239,68,68,.05);
    color: #f87171;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
    white-space: nowrap;
  }
  .hdr-btn-reset:hover {
    background: rgba(239,68,68,.12);
    border-color: rgba(239,68,68,.55);
    color: #fca5a5;
    transform: translateY(-1px);
  }

  @keyframes hdrGrad {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }

  @media (prefers-reduced-motion: reduce) {
    .hdr-root::before { animation: none !important; }
    .hdr-btn, .hdr-btn-reset, .hdr-customize,
    .hdr-collapse, .hdr-collapse svg,
    .hdr-toolbar-wrap { transition: none !important; }
  }

  @media (max-width: 768px) {
    .hdr-root { padding: 14px 16px; }
    .hdr-main { flex-direction: column; align-items: stretch; }
    .hdr-right { width: 100%; }
    .hdr-account { flex: 1; min-width: 0; }
    .hdr-toolbar { flex-direction: column; align-items: stretch; }
    .hdr-actions { width: 100%; }
  }
`;

export default function DashboardHeader({ onCustomize }) {
  const { state, dispatch } = useAppContext();
  const { user } = useAuth();
  const { resetAllFilters } = useFilters();

  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showLimitsModal, setShowLimitsModal] = useState(false);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);

  // Toolbar expand/collapse — default OPEN (chevron up)
  const [toolbarOpen, setToolbarOpen] = useState(true);

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
    <>
      <style>{HDR_CSS}</style>
      <div className="hdr-root">
        {/* Top row */}
        <div className="hdr-main">
          <div className="hdr-title-group">
            <button
              type="button"
              className={`hdr-collapse ${toolbarOpen ? 'is-open' : 'is-closed'}`}
              onClick={() => setToolbarOpen((v) => !v)}
              aria-expanded={toolbarOpen}
              aria-controls="hdr-toolbar"
              title={toolbarOpen ? 'Hide filters' : 'Show filters'}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="6 15 12 9 18 15" />
              </svg>
            </button>

            <h1 className="hdr-title">Dashboard</h1>
            {selectedAccount && (
              <span className={`hdr-badge ${isBacktest ? 'is-backtest' : 'is-live'}`}>
                {selectedAccount.type}
              </span>
            )}
          </div>

          <div className="hdr-right">
            <button
              type="button"
              className="hdr-customize"
              onClick={onCustomize}
              title="Customize dashboard"
            >
              <FaSlidersH size={12} />
              Customize
            </button>

            <div className="hdr-account">
              <label htmlFor="account-select" className="sr-only">
                Select Trading Account
              </label>
              <select
                id="account-select"
                className="hdr-account-select"
                value={state.selectedAccountId || ''}
                onChange={(e) =>
                  dispatch({ type: 'SET_SELECTED_ACCOUNT_ID', payload: e.target.value })
                }
              >
                <option value="" disabled>Select Account</option>
                {state.accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.type})
                  </option>
                ))}
              </select>
              <svg className="hdr-account-chevron" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Collapsible toolbar */}
        <div className={`hdr-toolbar-wrap ${toolbarOpen ? '' : 'is-closed'}`}>
          <div className="hdr-toolbar-inner">
            <div className="hdr-toolbar" id="hdr-toolbar">
              {isBacktest && (
                <div className="hdr-toolbar-section">
                  <span className="hdr-rr-label">Target R:R</span>
                  <RRTabs />
                </div>
              )}

              <div className="hdr-toolbar-section hdr-actions">
                <DynamicFilters />

                <button
                  type="button"
                  className="hdr-btn"
                  onClick={() => setShowSessionModal(true)}
                >
                  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span>Session / Time</span>
                </button>

                <button
                  type="button"
                  className="hdr-btn"
                  onClick={() => setShowLimitsModal(true)}
                >
                  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                  <span>Limits</span>
                </button>

                {isBacktest && (
                  <button
                    type="button"
                    className="hdr-btn is-optimize"
                    onClick={() => setShowOptimizeModal(true)}
                  >
                    <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      <line x1="11" y1="8" x2="11" y2="14" />
                      <line x1="8" y1="11" x2="14" y2="11" />
                    </svg>
                    <span>Optimize</span>
                  </button>
                )}

                <button
                  type="button"
                  className="hdr-btn-reset"
                  onClick={resetAllFilters}
                >
                  <svg className="btn-icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                  <span>Reset filters</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showSessionModal && (
        <SessionTimeModal isOpen={showSessionModal} onClose={() => setShowSessionModal(false)} />
      )}
      {showLimitsModal && (
        <LimitsModal isOpen={showLimitsModal} onClose={() => setShowLimitsModal(false)} />
      )}
      {showOptimizeModal && (
        <OptimizeModal isOpen={showOptimizeModal} onClose={() => setShowOptimizeModal(false)} />
      )}
    </>
  );
}