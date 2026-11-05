import { useMemo, useState } from 'react';
import { Check, Clock, SlidersHorizontal, X, Brain, Target } from 'lucide-react';
import { Command } from 'cmdk';

import { useFilters } from '@/features/dashboard/hooks/useFilters';
import { useStrategies } from '@/shared/api/strategies';
import DynamicFilters from '@/features/dashboard/components/filters/DynamicFilters';
import SessionTimeModal from '@/features/dashboard/components/filters/SessionTimeModal';
import LimitsModal from '@/features/dashboard/components/filters/LimitsModal';
import OptimizeModal from '@/features/dashboard/components/optimize/OptimizeModal';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';

function StrategyPicker({ strategies, selectedIds, onChange }) {
  const [open, setOpen] = useState(false);

  const toggle = (id) => {
    onChange(
      selectedIds.includes(id)
        ? selectedIds.filter((s) => s !== id)
        : [...selectedIds, id]
    );
  };

  const hasSelection = selectedIds.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`af-strat-trigger ${hasSelection ? 'is-active' : ''}`}
          disabled={strategies.length === 0}
          title={strategies.length === 0 ? 'No strategies defined yet' : 'Filter by strategy'}
        >
          <Brain size={12} />
          <span>Strategies</span>
          {hasSelection && <span className="af-strat-count">{selectedIds.length}</span>}
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" sideOffset={6} className="af-strat-pop">
        <Command className="af-strat-cmd">
          <div className="af-strat-input-wrap">
            <Command.Input className="af-strat-input" placeholder="Search strategies..." />
          </div>

          <Command.List className="af-strat-list">
            <Command.Empty className="af-strat-empty">No strategies match.</Command.Empty>
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
                  <Check size={13} className="af-strat-check" />
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
              Select all
            </button>
            <button type="button" className="af-strat-foot-btn clear" onClick={() => onChange([])}>
              Clear
            </button>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

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
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);

  const { data: allStrategies = [] } = useStrategies();
  const strategies = useMemo(() => {
    const visible = allStrategies.filter((s) => s.status !== 'archived');
    const archivedSelected = allStrategies.filter(
      (s) => s.status === 'archived' && strategyIds.includes(s.id)
    );
    return [...visible, ...archivedSelected].sort((a, b) => a.name.localeCompare(b.name));
  }, [allStrategies, strategyIds]);

  const chips = useMemo(() => {
    const list = [];

    if (strategyIds.length > 0) {
      const names = strategyIds
        .map((id) => allStrategies.find((s) => s.id === id)?.name)
        .filter(Boolean);
      list.push({
        id: 'strategy',
        label: names.length > 0 ? `Strategy: ${names.join(', ')}` : `Strategy: ${strategyIds.length} selected`,
        onRemove: () => setStrategyIds([]),
      });
    }

    Object.entries(filterSelections || {}).forEach(([key, values]) => {
      if (Array.isArray(values) && values.length > 0) {
        list.push({
          id: `dyn:${key}`,
          label: `${key}: ${values.join(', ')}`,
          onRemove: () => setFilterSelection(key, []),
        });
      }
    });

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

    if (activeFilterType !== 'none') {
      let label = 'Limits: ';
      if (activeFilterType === 'session') label += `${filterParams.sessionLimit ?? 2} per session`;
      else if (activeFilterType === 'day') label += `${filterParams.dayLimit ?? 2} per day`;
      else if (activeFilterType === 'rrLimit') {
        label += `stop at +${filterParams.winLimit ?? 2} / -${filterParams.lossLimit ?? 2}`;
      } else label += activeFilterType;
      list.push({ id: 'limits', label, onRemove: () => setActiveFilterType('none') });
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
  const sessionTimeActive = selectedSessions.length > 0 || selectedTimeBlocks.length > 0;
  const limitsActive = activeFilterType !== 'none';

  return (
    <>
      <div className="af-root">
        <div className="af-primary">
          <DynamicFilters />
          <StrategyPicker strategies={strategies} selectedIds={strategyIds} onChange={setStrategyIds} />

          <div className="af-spacer" />

          <button
            type="button"
            className={`af-btn ${sessionTimeActive ? 'is-active' : ''}`}
            onClick={() => setShowSessionModal(true)}
          >
            <Clock size={12} />
            <span>Session / time</span>
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
            className="af-btn"
            onClick={() => setShowOptimizeModal(true)}
            title="Test filter combinations"
          >
            <Target size={12} />
            <span>Optimize</span>
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
            <span className="af-chips-label">Active filters</span>
            {chips.map((chip) => (
              <span key={chip.id} className="af-chip">
                <span className="af-chip-text" title={chip.label}>{chip.label}</span>
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
