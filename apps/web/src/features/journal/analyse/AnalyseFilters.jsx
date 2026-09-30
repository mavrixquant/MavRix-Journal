// apps/web/src/features/journal/analyse/AnalyseFilters.jsx
//
// The full filter toolbar for the Analyse page.
//
// This is the filter UI that USED to live on the Journal dashboard header.
// It was moved here in the Analyse revamp — filters belong next to the
// deep-dive reports they affect, not on the visual overview dashboard.
//
// Contents:
//   - DynamicFilters        (auto-detected 2–9-valued custom columns)
//   - Session / Time button (opens SessionTimeModal)
//   - Limits button         (opens LimitsModal)
//   - Reset button          (disabled when no filter is active)
//   - Active-filter chips   (each chip has an X to remove just that filter)

import { useMemo, useState } from 'react';
import { Clock, SlidersHorizontal, X } from 'lucide-react';

import { useFilters } from '@/features/dashboard/hooks/useFilters';
import DynamicFilters from '@/features/dashboard/components/filters/DynamicFilters';
import SessionTimeModal from '@/features/dashboard/components/filters/SessionTimeModal';
import LimitsModal from '@/features/dashboard/components/filters/LimitsModal';

export default function AnalyseFilters() {
  const {
    filterSelections,
    stMode,
    selectedSessions,
    selectedTimeBlocks,
    activeFilterType,
    filterParams,
    setFilterSelection,
    setSelectedSessions,
    setSelectedTimeBlocks,
    setActiveFilterType,
    resetAllFilters,
  } = useFilters();

  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showLimitsModal, setShowLimitsModal] = useState(false);

  /* ---- Active filter chips ---- */
  const chips = useMemo(() => {
    const list = [];

    // Dynamic column filters
    Object.entries(filterSelections || {}).forEach(([key, values]) => {
      if (Array.isArray(values) && values.length > 0) {
        list.push({
          id: `dyn:${key}`,
          label: `${key}: ${values.join(', ')}`,
          onRemove: () => setFilterSelection(key, []),
        });
      }
    });

    // Session / Time
    if (stMode === 'session' && selectedSessions.length > 0) {
      list.push({
        id: 'sessions',
        label: `Sessions: ${selectedSessions.join(', ')}`,
        onRemove: () => setSelectedSessions([]),
      });
    }
    if (stMode === 'time' && selectedTimeBlocks.length > 0) {
      list.push({
        id: 'blocks',
        label: `Time: ${selectedTimeBlocks.join(', ')}`,
        onRemove: () => setSelectedTimeBlocks([]),
      });
    }

    // Limits
    if (activeFilterType !== 'none') {
      let label = 'Limits: ';
      if (activeFilterType === 'session') {
        label += `Session × ${filterParams.sessionLimit ?? 2}`;
      } else if (activeFilterType === 'day') {
        label += `Daily × ${filterParams.dayLimit ?? 2}`;
      } else if (activeFilterType === 'rrLimit') {
        label += `± ${filterParams.winLimit ?? 2} / ${filterParams.lossLimit ?? 2}`;
      } else {
        label += activeFilterType;
      }
      list.push({
        id: 'limits',
        label,
        onRemove: () => setActiveFilterType('none'),
      });
    }

    return list;
  }, [
    filterSelections,
    stMode,
    selectedSessions,
    selectedTimeBlocks,
    activeFilterType,
    filterParams,
    setFilterSelection,
    setSelectedSessions,
    setSelectedTimeBlocks,
    setActiveFilterType,
  ]);

  const hasAnyFilters = chips.length > 0;
  const sessionTimeActive =
    selectedSessions.length > 0 || selectedTimeBlocks.length > 0;
  const limitsActive = activeFilterType !== 'none';

  return (
    <>
      <div className="af-root">
        <div className="af-primary">
          <DynamicFilters />

          <div className="af-spacer" />

          <button
            type="button"
            className={`af-btn ${sessionTimeActive ? 'is-active' : ''}`}
            onClick={() => setShowSessionModal(true)}
          >
            <Clock size={12} />
            <span>Session / Time</span>
          </button>

          <button
            type="button"
            className={`af-btn ${limitsActive ? 'is-active' : ''}`}
            onClick={() => setShowLimitsModal(true)}
          >
            <SlidersHorizontal size={12} />
            <span>Limits</span>
          </button>

          <button
            type="button"
            className="af-btn-reset"
            onClick={resetAllFilters}
            disabled={!hasAnyFilters}
            title={hasAnyFilters ? 'Clear all filters' : 'No filters active'}
          >
            <X size={11} />
            <span>Reset</span>
          </button>
        </div>

        {hasAnyFilters && (
          <div className="af-chips">
            <span className="af-chips-label">Active</span>
            {chips.map((chip) => (
              <span key={chip.id} className="af-chip">
                <span className="af-chip-text" title={chip.label}>
                  {chip.label}
                </span>
                <button
                  type="button"
                  className="af-chip-x"
                  onClick={chip.onRemove}
                  aria-label={`Remove ${chip.label}`}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
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
    </>
  );
}