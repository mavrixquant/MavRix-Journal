import { useState } from 'react';
import { Clock, SlidersHorizontal, Sparkles, X } from 'lucide-react';

import { useAppContext } from '@/app/providers/AppProvider';
import { useDashboardAccount } from '@/app/providers/useDashboardAccount';
import { useFilters } from '@/features/dashboard/hooks/useFilters';
import { useFilterUrlSync } from '@/features/dashboard/hooks/useFilterUrlSync';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';

import RRTabs from '@/features/dashboard/components/filters/RRTabs';
import DynamicFilters from '@/features/dashboard/components/filters/DynamicFilters';
import SessionTimeModal from '@/features/dashboard/components/filters/SessionTimeModal';
import LimitsModal from '@/features/dashboard/components/filters/LimitsModal';
import OptimizeModal from '@/features/dashboard/components/optimize/OptimizeModal';

const HDR_CSS = `
  .hdr-root { padding: 2px 0 18px; }

  .hdr-bar {
    display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
    gap: 12px; padding: 10px 12px;
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.01)), #0F131C;
    border: 1px solid rgba(255,255,255,.07);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.04);
  }

  .hdr-section { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .hdr-actions { margin-left: auto; gap: 8px; }

  .hdr-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
    color: #545E6E; white-space: nowrap;
  }

  .hdr-divider { width: 1px; height: 22px; background: rgba(255,255,255,.08); }

  .hdr-btn, .hdr-btn-reset {
    display: inline-flex; align-items: center; gap: 7px;
    height: 34px; padding: 0 13px; border-radius: 10px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; font-weight: 600; letter-spacing: .02em;
    cursor: pointer; white-space: nowrap;
    transition: all .18s cubic-bezier(.2,.8,.25,1);
  }
  .hdr-btn svg, .hdr-btn-reset svg { flex-shrink: 0; }

  .hdr-btn {
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: #8892A3;
  }
  .hdr-btn:hover { color: #E7E9EE; background: rgba(255,255,255,.07); border-color: rgba(255,255,255,.2); }
  .hdr-btn:active { transform: scale(.98); }

  .hdr-btn.is-optimize {
    border-color: var(--accent-soft2);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    color: var(--accent);
  }
  .hdr-btn.is-optimize:hover {
    background: color-mix(in srgb, var(--accent) 16%, transparent);
    border-color: var(--accent);
    box-shadow: 0 0 20px -6px color-mix(in srgb, var(--accent) 55%, transparent);
  }

  .hdr-btn-reset {
    border: 1px solid transparent; background: transparent; color: #8892A3; padding: 0 10px;
  }
  .hdr-btn-reset:hover { color: #FF8080; background: rgba(255,92,92,.08); border-color: rgba(255,92,92,.28); }

  @media (prefers-reduced-motion: reduce) { .hdr-btn, .hdr-btn-reset { transition: none !important; } }
  @media (max-width: 768px) {
    .hdr-bar { flex-direction: column; align-items: stretch; }
    .hdr-actions { width: 100%; margin-left: 0; }
    .hdr-divider { display: none; }
  }
`;

export default function BacktesterDashboardHeader() {
  const { state } = useAppContext();
  const { accountId } = useDashboardAccount();
  const { resetAllFilters } = useFilters();
  useFilterUrlSync();

  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showLimitsModal, setShowLimitsModal] = useState(false);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);

  const selectedAccount = state.accounts.find((acc) => acc.id === accountId) || null;

  usePageHeader({
    title: 'Backtester',
    badge: selectedAccount?.type,
    badgeVariant: 'is-backtest',
  });

  return (
    <>
      <style>{HDR_CSS}</style>
      <div className="hdr-root">
        <div className="hdr-bar" id="hdr-toolbar">
          <div className="hdr-section">
            <span className="hdr-label">Target R:R</span>
            <RRTabs />
          </div>

          <div className="hdr-section hdr-actions">
            <DynamicFilters />

            <span className="hdr-divider" />

            <button type="button" className="hdr-btn" onClick={() => setShowSessionModal(true)}>
              <Clock size={14} />
              <span>Session / Time</span>
            </button>

            <button type="button" className="hdr-btn" onClick={() => setShowLimitsModal(true)}>
              <SlidersHorizontal size={14} />
              <span>Limits</span>
            </button>

            <button type="button" className="hdr-btn is-optimize" onClick={() => setShowOptimizeModal(true)}>
              <Sparkles size={14} />
              <span>Optimize</span>
            </button>

            <button type="button" className="hdr-btn-reset" onClick={resetAllFilters}>
              <X size={13} />
              <span>Reset</span>
            </button>
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
