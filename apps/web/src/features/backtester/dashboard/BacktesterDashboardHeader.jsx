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
