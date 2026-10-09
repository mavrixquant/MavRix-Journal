// apps/web/src/features/journal/analyse/AnalyseFilters.jsx
//
// The full filter toolbar for the Analyse page.
//
// Contents:
//   - DynamicFilters        (auto-detected 2–9-valued custom columns)
//   - StrategyPicker        (multi-select of the user's strategies)
//   - Session / Time button (opens SessionTimeModal)
//   - Limits button         (opens LimitsModal)
//   - Reset button          (disabled when no filter is active)
//   - Active-filter chips   (each chip has an X to remove just that filter)

import { useMemo, useState } from 'react';
import { Clock, SlidersHorizontal, X, Brain } from 'lucide-react';

import { useFilters } from '@/features/dashboard/hooks/useFilters';
import { useStrategies } from '@/shared/api/strategies';
import DynamicFilters from '@/features/dashboard/components/filters/DynamicFilters';
import SessionTimeModal from '@/features/dashboard/components/filters/SessionTimeModal';
import LimitsModal from '@/features/dashboard/components/filters/LimitsModal';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/popover';
import { Command } from 'cmdk';

const PICKER_CSS = `
  .af-strat-trigger {
    display: inline-flex;
    align-items: center;
    gap: 8px;
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
  .af-strat-trigger:hover {
    color: var(--ink-1);
    background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.2);
    transform: translateY(-1px);
  }
  .af-strat-trigger.is-active {
    border-color: var(--accent-soft2);
    background: rgba(245,158,11,.10);
    color: var(--accent);
    box-shadow: 0 0 20px -8px rgba(245,158,11,.4);
  }
  .af-strat-trigger svg { flex-shrink: 0; }
  .af-strat-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 6px;
    border-radius: 9px;
    background: #F59E0B;
    color: #0D1117;
    font-size: 10px;
    font-weight: 700;
  }
  .af-strat-pop {
    width: 280px;
    padding: 0 !important;
    background: #11151F !important;
    border: 1px solid #212836 !important;
    border-radius: 10px !important;
    box-shadow: 0 16px 40px -12px rgba(0,0,0,.7) !important;
    overflow: hidden;
  }
  .af-strat-cmd {
    display: flex;
    flex-direction: column;
  }
  .af-strat-input-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-bottom: 1px solid #1A2029;
    color: #545E6E;
  }
  .af-strat-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #E7E9EE;
    font-size: 12.5px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
  }
  .af-strat-input::placeholder { color: #545E6E; }
  .af-strat-list {
    max-height: 260px;
    overflow-y: auto;
    padding: 6px;
  }
  .af-strat-list::-webkit-scrollbar { width: 6px; }
  .af-strat-list::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08);
    border-radius: 99px;
  }
  .af-strat-empty {
    padding: 24px 12px;
    text-align: center;
    color: #545E6E;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    line-height: 1.6;
  }
  .af-strat-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 10px;
    border-radius: 6px;
    cursor: pointer;
    color: #8892A3;
    font-size: 12.5px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    user-select: none;
    transition: background-color .12s ease, color .12s ease;
  }
  .af-strat-item[data-selected="true"] {
    background: rgba(245,158,11,.06);
    color: #FFFFFF;
  }
  .af-strat-item:hover {
    background: rgba(255,255,255,.04);
  }
  .af-strat-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .af-strat-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .af-strat-check {
    color: #F59E0B;
    opacity: 0;
    flex-shrink: 0;
  }
  .af-strat-item[data-selected="true"] .af-strat-check {
    opacity: 1;
  }
  .af-strat-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-top: 1px solid #1A2029;
    background: rgba(0,0,0,.15);
  }
  .af-strat-foot-btn {
    background: none;
    border: none;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: .04em;
    text-transform: uppercase;
    cursor: pointer;
    padding: 3px 6px;
    border-radius: 4px;
  }
  .af-strat-foot-btn.all { color: #F59E0B; }
  .af-strat-foot-btn.all:hover { background: rgba(245,158,11,.10); }
  .af-strat-foot-btn.clear { color: #545E6E; }
  .af-strat-foot-btn.clear:hover { color: #8892A3; background: rgba(255,255,255,.04); }
`;

/* ------------------------------------------------------------------ */
/*  Strategy picker popover                                            */
/* ------------------------------------------------------------------ */
function StrategyPicker({ strategies, selectedIds, onChange, disabled }) {
  const [open, setOpen] = useState(false);

  const toggle = (id) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((s) => s !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const hasSelection = selectedIds.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`af-strat-trigger ${hasSelection ? 'is-active' : ''}`}
          disabled={disabled || strategies.length === 0}
          title={
            strategies.length === 0
              ? 'No strategies defined yet'
              : 'Filter by strategy'
          }
        >
          <Brain size={12} />
          <span>Strategies</span>
          {hasSelection && (
            <span className="af-strat-count">{selectedIds.length}</span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" sideOffset={6} className="af-strat-pop">
        <Command className="af-strat-cmd">
          <div className="af-strat-input-wrap">
            <Command.Input
              className="af-strat-input"
              placeholder="Search strategies…"
            />
          </div>

          <Command.List className="af-strat-list">
            <Command.Empty className="af-strat-empty">
              No strategies match.
            </Command.Empty>

            {strategies.map((s) => {
              const isSelected = selectedIds.includes(s.id);
              return (
                <Command.Item
                  key={s.id}
                  value={`${s.name} ${s.status}`}
                  onSelect={() => toggle(s.id)}
                  data-selected={String(isSelected)}
                  className="af-strat-item"
                >
                  <span
                    className="af-strat-dot"
                    style={{
                      background: s.color || '#8892A3',
                      boxShadow: `0 0 6px ${s.color || '#8892A3'}aa`,
                    }}
                  />
                  <span className="af-strat-name">{s.name}</span>
                  <span
                    className="af-strat-check"
                    style={{ fontWeight: 700 }}
                  >
                    ✓
                  </span>
                </Command.Item>
              );
            })}
          </Command.List>

          <div className="af-strat-foot">
            <button
              type="button"
              className="af-strat-foot-btn all"
              onClick={() => onChange(strategies.map((s) => s.id))}
            >
              All
            </button>
            <button
              type="button"
              className="af-strat-foot-btn clear"
              onClick={() => onChange([])}
            >
              Reset
            </button>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */
export default function AnalyseFilters() {
  const {
    filterSelections,
    strategyIds,
    stMode,
    selectedSessions,
    selectedTimeBlocks,
    activeFilterType,
    filterParams,
    setFilterSelection,
    setStrategyIds,
    setSelectedSessions,
    setSelectedTimeBlocks,
    setActiveFilterType,
    resetAllFilters,
  } = useFilters();

  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showLimitsModal, setShowLimitsModal] = useState(false);

  // Only show ACTIVE + PAUSED strategies in the picker. Archived ones are
  // hidden unless they're already selected (so an archived-tag filter in
  // a shared URL still works).
  const { data: allStrategies = [] } = useStrategies();
  const strategies = useMemo(() => {
    const visible = allStrategies.filter((s) => s.status !== 'archived');
    const archivedSelected = allStrategies.filter(
      (s) => s.status === 'archived' && strategyIds.includes(s.id)
    );
    return [...visible, ...archivedSelected].sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [allStrategies, strategyIds]);

  /* ---- Active filter chips ---- */
  const chips = useMemo(() => {
    const list = [];

    // Strategy filter
    if (strategyIds.length > 0) {
      const names = strategyIds
        .map((id) => allStrategies.find((s) => s.id === id)?.name)
        .filter(Boolean);
      const label =
        names.length > 0
          ? `Strategy: ${names.join(', ')}`
          : `Strategy: ${strategyIds.length} selected`;
      list.push({
        id: 'strategy',
        label,
        onRemove: () => setStrategyIds([]),
      });
    }

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
    strategyIds,
    allStrategies,
    filterSelections,
    stMode,
    selectedSessions,
    selectedTimeBlocks,
    activeFilterType,
    filterParams,
    setFilterSelection,
    setStrategyIds,
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
      <style>{PICKER_CSS}</style>
      <div className="af-root">
        <div className="af-primary">
          <DynamicFilters />

          <StrategyPicker
            strategies={strategies}
            selectedIds={strategyIds}
            onChange={setStrategyIds}
            disabled={false}
          />

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