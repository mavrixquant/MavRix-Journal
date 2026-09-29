// apps/web/src/features/dashboard/components/filters/DynamicFilters.jsx
import { useMemo, useCallback, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Command } from 'cmdk';

import { useAppContext } from '@/app/providers/AppProvider';
import { useFilters } from '@/features/dashboard/hooks/useFilters';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/popover';

/* ------------------------------------------------------------------ */
/*  Scoped styles for cmdk + popover                                  */
/* ------------------------------------------------------------------ */
const CSS = `
  .dyn-filter-bar {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  }

  .dyn-filter-trigger {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 34px;
    padding: 0 12px;
    border-radius: 8px;
    border: 1px solid #212836;
    background: #161B26;
    color: #C5C9D3;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all .15s ease;
  }
  .dyn-filter-trigger:hover {
    border-color: #3A4456;
    background: #1A2029;
  }
  .dyn-filter-trigger.has-selection {
    background: rgba(255, 176, 32, 0.08);
    border-color: #FFB020;
    color: #FFFFFF;
  }
  .dyn-filter-trigger[data-state="open"] {
    border-color: #3A4456;
  }

  .dyn-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 6px;
    border-radius: 9px;
    background: #FFB020;
    color: #0D1117;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
  }

  .dyn-label {
    font-size: 11px;
    color: #545E6E;
    font-weight: 400;
  }
  .dyn-filter-trigger.has-selection .dyn-label {
    color: rgba(255, 255, 255, 0.55);
  }

  .dyn-pop {
    width: 260px;
    padding: 0;
    background: #11151F !important;
    border: 1px solid #212836 !important;
    border-radius: 10px !important;
    box-shadow: 0 16px 40px -12px rgba(0, 0, 0, 0.7) !important;
    overflow: hidden;
  }

  .dyn-cmd {
    display: flex;
    flex-direction: column;
    background: transparent;
  }

  .dyn-cmd-input-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-bottom: 1px solid #1A2029;
  }
  .dyn-cmd-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #E7E9EE;
    font-size: 12.5px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
  }
  .dyn-cmd-input::placeholder {
    color: #545E6E;
  }

  .dyn-cmd-list {
    max-height: 240px;
    overflow-y: auto;
    padding: 6px;
  }
  .dyn-cmd-empty {
    padding: 16px 12px;
    text-align: center;
    color: #545E6E;
    font-size: 11.5px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
  }

  .dyn-cmd-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 7px 10px;
    border-radius: 6px;
    cursor: pointer;
    color: #C5C9D3;
    font-size: 12px;
    transition: background-color .12s ease;
  }
  .dyn-cmd-item[data-selected="true"] {
    background: rgba(255, 176, 32, 0.06);
    color: #FFFFFF;
    font-weight: 500;
  }
  .dyn-cmd-item[data-selected="true"] .dyn-cmd-item-check {
    opacity: 1;
    color: #FFB020;
  }
  .dyn-cmd-item[data-selected="false"] .dyn-cmd-item-check {
    opacity: 0;
  }

  .dyn-cmd-item[data-selected="true"]:hover,
  .dyn-cmd-item[data-selected="false"]:hover {
    background: #161B26;
  }

  .dyn-cmd-item-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .dyn-cmd-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    border-top: 1px solid #1A2029;
    background: rgba(0, 0, 0, 0.15);
  }
  .dyn-cmd-foot-btn {
    background: none;
    border: none;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: .04em;
    text-transform: uppercase;
    cursor: pointer;
    padding: 3px 6px;
    border-radius: 4px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
  }
  .dyn-cmd-foot-btn.all {
    color: #FFB020;
  }
  .dyn-cmd-foot-btn.all:hover {
    background: rgba(255, 176, 32, 0.10);
  }
  .dyn-cmd-foot-btn.clear {
    color: #545E6E;
  }
  .dyn-cmd-foot-btn.clear:hover {
    color: #8892A3;
    background: rgba(255, 255, 255, 0.04);
  }
`;

/* ------------------------------------------------------------------ */
/*  Main                                                                */
/* ------------------------------------------------------------------ */
export default function DynamicFilters() {
  const { state } = useAppContext();
  const { setFilterSelection } = useFilters();

  // Compute options for a key
  const getOptions = useCallback(
    (key) => {
      const set = new Set();
      state.trades.forEach((t) => {
        const v = t.dynamic?.[key];
        if (v && v !== '—') set.add(v);
      });
      return [...set].sort();
    },
    [state.trades]
  );

  // Eligible keys: 2 ≤ uniqueValues ≤ 9
  const eligibleKeys = useMemo(() => {
    return state.dynamicFilterKeys.filter((key) => {
      const set = new Set();
      state.trades.forEach((t) => {
        const v = t.dynamic?.[key];
        if (v) set.add(v);
      });
      return set.size > 1 && set.size < 10;
    });
  }, [state.dynamicFilterKeys, state.trades]);

  // Clear selections for keys that dropped out
  useEffect(() => {
    const invalidKeys = Object.keys(state.filterSelections).filter(
      (key) => !eligibleKeys.includes(key)
    );
    invalidKeys.forEach((key) => setFilterSelection(key, []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligibleKeys]);

  if (eligibleKeys.length === 0) return null;

  return (
    <>
      <style>{CSS}</style>
      <div className="dyn-filter-bar">
        {eligibleKeys.map((key) => (
          <FilterPopover
            key={key}
            filterKey={key}
            options={getOptions(key)}
            selected={state.filterSelections[key] || []}
            onChange={(values) => setFilterSelection(key, values)}
          />
        ))}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Single filter popover                                              */
/* ------------------------------------------------------------------ */
function FilterPopover({ filterKey, options, selected, onChange }) {
  const hasSelection = selected.length > 0;

  const toggleValue = (value) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const selectAll = () => onChange([...options]);
  const clearAll = () => onChange([]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`dyn-filter-trigger ${hasSelection ? 'has-selection' : ''}`}
        >
          <span>{filterKey}</span>
          {hasSelection ? (
            <span className="dyn-badge">{selected.length}</span>
          ) : (
            <span className="dyn-label">All</span>
          )}
          <ChevronDown size={12} />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" sideOffset={6} className="dyn-pop">
        <Command className="dyn-cmd">
          <div className="dyn-cmd-input-wrap">
            <Command.Input
              placeholder={`Search ${filterKey}…`}
              className="dyn-cmd-input"
            />
          </div>

          <Command.List className="dyn-cmd-list">
            <Command.Empty className="dyn-cmd-empty">
              No matches.
            </Command.Empty>

            {options.map((opt) => {
              const isSelected = selected.includes(opt);
              return (
                <Command.Item
                  key={opt}
                  value={opt}
                  onSelect={() => toggleValue(opt)}
                  data-selected={String(isSelected)}
                  className="dyn-cmd-item"
                >
                  <span className="dyn-cmd-item-label">{opt}</span>
                  <Check size={14} className="dyn-cmd-item-check" />
                </Command.Item>
              );
            })}
          </Command.List>

          <div className="dyn-cmd-foot">
            <button
              type="button"
              className="dyn-cmd-foot-btn all"
              onClick={selectAll}
            >
              All
            </button>
            <button
              type="button"
              className="dyn-cmd-foot-btn clear"
              onClick={clearAll}
            >
              Reset
            </button>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}