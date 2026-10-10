// apps/web/src/features/backtester/dashboard/BacktesterDashboardHeader.jsx
//
// Backtester-dashboard header.
//
// Title + badge are published to the GLOBAL header bar via usePageHeader()
// so they render next to the account selector.
//
// Everything else stays on the page:
//   - Collapse chevron (toggles the filter toolbar below)
//   - Customize button (disabled when the account has no trades)
//   - Collapsible filter toolbar (RRTabs, DynamicFilters, Session/Time,
//     Limits, Optimize, Reset)

import { useState } from 'react';
import { FaSlidersH } from 'react-icons/fa';

import { useAppContext } from '@/app/providers/AppProvider';
import { useDashboardAccount } from '@/app/providers/useDashboardAccount';
import { useEnrichedTrades } from '@/features/dashboard/hooks/useEnrichedTrades';
import { useFilters } from '@/features/dashboard/hooks/useFilters';
import { useFilterUrlSync } from '@/features/dashboard/hooks/useFilterUrlSync';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';

import RRTabs from '@/features/dashboard/components/filters/RRTabs';
import DynamicFilters from '@/features/dashboard/components/filters/DynamicFilters';
import SessionTimeModal from '@/features/dashboard/components/filters/SessionTimeModal';
import LimitsModal from '@/features/dashboard/components/filters/LimitsModal';
import OptimizeModal from '@/features/dashboard/components/optimize/OptimizeModal';

/* ------------------------------------------------------------------ */
/*  Header-local CSS.                                                  */
/*  Same visual language as the previous version, minus the title row. */
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

    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 2px 0 20px;
  }

  /* ---------- Top actions row ---------- */
  .hdr-actions-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding-bottom: 14px;
    border-bottom: 1px solid var(--line-soft);
  }
  .hdr-spacer { flex: 1; min-width: 8px; }

  /* ---------- Collapse chevron ---------- */
  .hdr-collapse {
    width: 30px;
    height: 30px;
    border-radius: 9px;
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
    transform: rotate(0deg);
  }
  .hdr-collapse.is-closed svg {
    transform: rotate(180deg);
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
  .hdr-customize:hover:not(:disabled) {
    color: var(--accent);
    border-color: var(--accent-soft2);
    background: rgba(245,158,11,.06);
    box-shadow: 0 0 20px -6px rgba(245,158,11,.4);
    transform: translateY(-1px);
  }
  .hdr-customize:disabled {
    opacity: .4;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
  .hdr-customize:focus-visible {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(245,158,11,.18);
  }

  /* ---------- Collapsible toolbar wrapper ---------- */
  .hdr-toolbar-wrap {
    display: grid;
    grid-template-rows: 1fr;
    opacity: 1;
    transition:
      grid-template-rows .38s cubic-bezier(.2,.8,.25,1),
      opacity .28s ease;
  }
  .hdr-toolbar-wrap.is-closed {
    grid-template-rows: 0fr;
    opacity: 0;
    pointer-events: none;
  }
  .hdr-toolbar-inner { min-height: 0; }
  .hdr-toolbar-wrap.is-closed .hdr-toolbar-inner { overflow: hidden; }

  /* ---------- Toolbar row ---------- */
  .hdr-toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-top: 4px;
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
    margin-left: auto;
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

  @media (prefers-reduced-motion: reduce) {
    .hdr-btn, .hdr-btn-reset, .hdr-customize,
    .hdr-collapse, .hdr-collapse svg,
    .hdr-toolbar-wrap { transition: none !important; }
  }

  @media (max-width: 768px) {
    .hdr-toolbar { flex-direction: column; align-items: stretch; }
    .hdr-actions { width: 100%; margin-left: 0; }
  }
`;

export default function BacktesterDashboardHeader({ onCustomize }) {
  const { state } = useAppContext();
  const { accountId } = useDashboardAccount();
  const { resetAllFilters } = useFilters();
  // Mirror filter state to the URL for shareable / back-button support.
  useFilterUrlSync();

  // Enrich + dispatch trades for this Backtest account.
  const enriched = useEnrichedTrades(accountId);

  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showLimitsModal, setShowLimitsModal] = useState(false);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);

  // Toolbar expand/collapse — default OPEN.
  const [toolbarOpen, setToolbarOpen] = useState(true);

  const selectedAccount =
    state.accounts.find((acc) => acc.id === accountId) || null;

  const hasData = enriched.enrichedTrades.length > 0;

  // Publish title + badge to the global header bar.
  usePageHeader({
    title: 'Backtester',
    badge: selectedAccount?.type,
    badgeVariant: 'is-backtest',
  });

  return (
    <>
      <style>{HDR_CSS}</style>
      <div className="hdr-root">
        {/* ---------- Top actions row ---------- */}
        <div className="hdr-actions-row">
          <button
            type="button"
            className={`hdr-collapse ${toolbarOpen ? '' : 'is-closed'}`}
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

          <div className="hdr-spacer" />

          <button
            type="button"
            className="hdr-customize"
            onClick={onCustomize}
            disabled={!hasData}
            title={
              hasData
                ? 'Customize dashboard'
                : 'Add trades to this account first to customize the layout'
            }
          >
            <FaSlidersH size={12} />
            Customize
          </button>
        </div>

        {/* ---------- Collapsible toolbar ---------- */}
        <div className={`hdr-toolbar-wrap ${toolbarOpen ? '' : 'is-closed'}`}>
          <div className="hdr-toolbar-inner">
            <div className="hdr-toolbar" id="hdr-toolbar">
              <div className="hdr-toolbar-section">
                <span className="hdr-rr-label">Target R:R</span>
                <RRTabs />
              </div>

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
        <SessionTimeModal
          isOpen={showSessionModal}
          onClose={() => setShowSessionModal(false)}
        />
      )}
      {showLimitsModal && (
        <LimitsModal
          isOpen={showLimitsModal}
          onClose={() => setShowLimitsModal(false)}
        />
      )}
      {showOptimizeModal && (
        <OptimizeModal
          isOpen={showOptimizeModal}
          onClose={() => setShowOptimizeModal(false)}
        />
      )}
    </>
  );
}