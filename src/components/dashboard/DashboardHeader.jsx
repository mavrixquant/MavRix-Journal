// src/components/dashboard/DashboardHeader.jsx
import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useFilters } from '../../hooks/useFilters';
import RRTabs from './filters/RRTabs';
import DynamicFilters from './filters/DynamicFilters';
import SessionTimeModal from './filters/SessionTimeModal';
import LimitsModal from './filters/LimitsModal';
import OptimizeModal from './optimize/OptimizeModal';

export default function DashboardHeader({ user, onLogout }) {   // ← ADD PROPS HERE
  const { state } = useAppContext();
  const { resetAllFilters } = useFilters();
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showLimitsModal, setShowLimitsModal] = useState(false);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);

  // Helper to build session/time label
  const getSTLabel = () => {
    if (state.stMode === 'session') {
      if (state.selectedSessions.length === 0) return 'All Sessions';
      return `Session: ${state.selectedSessions.join(', ')}`;
    } else {
      if (state.selectedTimeBlocks.length === 0) return 'All Times';
      return `Time: ${state.selectedTimeBlocks.join(', ')}`;
    }
  };

  const getLimitsLabel = () => {
    switch (state.activeFilterType) {
      case 'none': return 'No Limits';
      case 'day': return `Day: ${state.filterParams.dayLimit}`;
      case 'session': return `Session: ${state.filterParams.sessionLimit}`;
      case 'rrLimit': return `RR: +${state.filterParams.winLimit}/-${state.filterParams.lossLimit}`;
      default: return '';
    }
  };

  return (
    <header>
      <div className="header-row">
        <div>
          <div className="brand-eyebrow"><span className="dot"></span>SYSTEM://BACKTEST-ENGINE&nbsp;v1</div>
          <h1>Backtest Dashboard</h1>
          <div className="subtitle">
            {state.trades.length > 0 
              ? `${state.trades.length} trades loaded · SL fixed at 12.5pt`
              : 'Waiting for a trade log to be loaded…'}
          </div>
        </div>
        <div className="upload-zone">
          {user && (
            <span style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text-dim)', marginRight: '8px' }}>
              {user.email}
            </span>
          )}
          <button onClick={onLogout} className="btn-upload" style={{ borderStyle: 'solid' }}>
            Logout
          </button>
          <span id="fileStatus" style={{ color: 'var(--text-faint)', fontSize: '11px', marginLeft: '8px' }}>
            {state.fileStatus}
          </span>
        </div>
      </div>

      {/* RR bar and filters - keep unchanged */}
      <div className="rr-bar">
        <span className="rr-label">Target R:R</span>
        <RRTabs />

        <div className="filters">
          <DynamicFilters />

          <div className="filter-group">
            <button className="btn-upload" onClick={() => setShowSessionModal(true)} style={{ borderStyle: 'solid', padding: '8px 14px' }}>
              ⏱️ Session / Time
            </button>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-faint)' }}>
              {getSTLabel()}
            </span>
          </div>

          <div className="filter-group">
            <button className="btn-upload" onClick={() => setShowLimitsModal(true)} style={{ borderStyle: 'solid', padding: '8px 14px' }}>
              ⚙️ Limits
            </button>
            <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-faint)' }}>
              {getLimitsLabel()}
            </span>
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

      {/* Modals */}
      <SessionTimeModal isOpen={showSessionModal} onClose={() => setShowSessionModal(false)} />
      <LimitsModal isOpen={showLimitsModal} onClose={() => setShowLimitsModal(false)} />
      <OptimizeModal isOpen={showOptimizeModal} onClose={() => setShowOptimizeModal(false)} />
    </header>
  );
}