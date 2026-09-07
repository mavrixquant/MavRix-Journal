// src/components/dashboard/Header.jsx
import { useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { useFilters } from '../../../hooks/useFilters';
import RRTabs from '../filters/RRTabs';
import DynamicFilters from '../filters/DynamicFilters';
import SessionTimeModal from '../filters/SessionTimeModal';
import LimitsModal from '../filters/LimitsModal';
import OptimizeModal from '../optimize/OptimizeModal';

export default function Header() {
  const { state } = useAppContext();
  const { resetAllFilters } = useFilters();
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showLimitsModal, setShowLimitsModal] = useState(false);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);

  // Build label for session/time filter
  const getSTLabel = () => {
    if (state.stMode === 'session') {
      if (state.selectedSessions.length === 0) return 'All Sessions';
      return `Session: ${state.selectedSessions.join(', ')}`;
    } else {
      if (state.selectedTimeBlocks.length === 0) return 'All Times';
      return `Time: ${state.selectedTimeBlocks.join(', ')}`;
    }
  };

  // Build label for limits
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
        </div>
        <div className="upload-zone">
          <span id="fileStatus" style={{ color: 'var(--text-faint)', fontSize: '11px' }}>
            {state.fileStatus}
          </span>
        </div>
      </div>

      <div className="rr-bar">
        <span className="rr-label">Target R:R</span>
        <RRTabs />
        <button    className="btn-upload" style={{ borderStyle: 'solid', borderColor: 'var(--white)', color: 'var(--white)', padding: '8px 14px' }}>
          📊 Sheet
        </button>
        <button    className="btn-upload" style={{ borderStyle: 'solid', borderColor: 'green', color: 'var(--white)', padding: '8px 14px' }}>
          💾 Save
        </button>

        <div className="filters" id="filterContainer">
          <DynamicFilters />

          {/* Session / Time button */}
          <div className="filter-group">
            <button
              className="btn-upload"
              onClick={() => setShowSessionModal(true)}
              style={{ borderStyle: 'solid', padding: '8px 14px' }}
            >
              ⏱️ Session / Time
            </button>
            {/* <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-faint)' }}>
              {getSTLabel()}
            </span> */}
          </div>

          {/* Limits button */}
          <div className="filter-group">
            <button
              className="btn-upload"
              onClick={() => setShowLimitsModal(true)}
              style={{ borderStyle: 'solid', padding: '8px 14px' }}
            >
              ⚙️ Limits
            </button>
            {/* <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text-faint)' }}>
              {getLimitsLabel()}
            </span> */}
          </div>

          {/* Optimize button (placeholder for now) */}
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