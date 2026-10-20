
import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, ChevronDown, Search, Check, List, CalendarDays } from 'lucide-react';
import { Command } from 'cmdk';

import { IMPACT_LEVELS, CURRENCY_NAMES } from '@mavrix/shared';
import { useSyncCalendar } from '@/shared/api/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/popover';

const CSS = `
  .cf-root { --ink-1: #E7E9EE; --ink-2: #8892A3; --ink-3: #545E6E;
    display: flex; flex-direction: column; gap: 12px; }
  .cf-row { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
  .cf-label { font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; font-weight: 700; letter-spacing: .14em;
    text-transform: uppercase; color: var(--ink-3);
    margin-right: 4px; flex-shrink: 0; }
  .cf-spacer { flex: 1; min-width: 8px; }

  .cf-seg { display: inline-flex; padding: 3px; background: rgba(0,0,0,.32);
    border: 1px solid rgba(255,255,255,.06); border-radius: 10px; gap: 2px; }
  .cf-seg-btn { display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 12px; border-radius: 7px; background: transparent; border: none;
    color: var(--ink-2); font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px; font-weight: 600; letter-spacing: .02em; cursor: pointer;
    transition: all .18s; white-space: nowrap; }
  .cf-seg-btn:hover { color: var(--ink-1); background: rgba(255,255,255,.04); }
  .cf-seg-btn.is-active { background: rgba(255,255,255,.08); color: var(--ink-1); }
  .cf-impact-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .cf-impact-dot.high   { background: var(--accent); box-shadow: 0 0 8px color-mix(in srgb, var(--accent) 60%, transparent); }
  .cf-impact-dot.medium { background: #60A5FA; box-shadow: 0 0 8px rgba(96,165,250,.5); }
  .cf-impact-dot.low    { background: #545E6E; }

  .cf-ms-btn { display: inline-flex; align-items: center; gap: 8px;
    padding: 7px 11px 7px 12px; border-radius: 9px;
    border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.025);
    color: var(--ink-2); font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px; font-weight: 600; letter-spacing: .02em; cursor: pointer;
    transition: all .18s; white-space: nowrap; }
  .cf-ms-btn:hover { color: var(--ink-1); border-color: rgba(255,255,255,.18);
    background: rgba(255,255,255,.05); }
  .cf-ms-btn.is-active { background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 16%, transparent), color-mix(in srgb, var(--accent) 6%, transparent));
    border-color: color-mix(in srgb, var(--accent) 42%, transparent); color: var(--accent); }
  .cf-ms-btn[data-state="open"] { border-color: color-mix(in srgb, var(--accent) 55%, transparent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 14%, transparent); }
  .cf-ms-count { display: inline-flex; align-items: center; justify-content: center;
    min-width: 18px; height: 18px; padding: 0 6px; border-radius: 9px;
    background: var(--accent); color: #0D1117; font-size: 10px; font-weight: 700; line-height: 1; }
  .cf-ms-chevron { flex-shrink: 0; color: var(--ink-3);
    transition: transform .18s ease, color .16s ease; }
  .cf-ms-btn:hover .cf-ms-chevron { color: var(--ink-2); }
  .cf-ms-btn[data-state="open"] .cf-ms-chevron { color: var(--accent); transform: rotate(180deg); }

  .cf-ms-pop { width: 320px !important; padding: 0 !important;
    background: #11151F !important; border: 1px solid #212836 !important;
    border-radius: 12px !important;
    box-shadow: 0 20px 50px -20px rgba(0,0,0,.85), 0 0 0 1px color-mix(in srgb, var(--accent) 6%, transparent) !important;
    overflow: hidden; z-index: 3000 !important; }
  .cf-ms-cmd { display: flex; flex-direction: column; background: transparent; width: 100%; }
  .cf-ms-search { display: flex; align-items: center; gap: 8px; padding: 10px 12px;
    border-bottom: 1px solid #1A2029; color: #545E6E; flex-shrink: 0; }
  .cf-ms-search input { flex: 1; background: transparent; border: none; outline: none;
    color: var(--ink-1); font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px; min-width: 0; }
  .cf-ms-search input::placeholder { color: var(--ink-3); }
  .cf-ms-list { max-height: 320px; overflow-y: auto; padding: 6px; }
  .cf-ms-list::-webkit-scrollbar { width: 6px; }
  .cf-ms-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,.08); border-radius: 99px; }
  .cf-ms-empty { padding: 28px 14px; text-align: center; color: var(--ink-3);
    font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 11.5px; }

  .cf-ms-sep { display: flex; align-items: center; gap: 8px; padding: 8px 10px 4px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 9px; font-weight: 700;
    letter-spacing: .16em; text-transform: uppercase; color: var(--ink-3); user-select: none; }
  .cf-ms-sep::after { content: ''; flex: 1; height: 1px;
    background: linear-gradient(90deg, rgba(255,255,255,.08), transparent); }

  .cf-ms-item { position: relative; display: flex; align-items: center; gap: 10px;
    padding: 9px 12px 9px 14px; border-radius: 8px; border: 1px solid transparent;
    cursor: pointer; color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 12px;
    user-select: none; transition: background-color .14s ease, border-color .14s ease;
    outline: none; }

  .cf-ms-item:not([data-checked="true"]):hover,
  .cf-ms-item:not([data-checked="true"])[data-selected="true"] {
    background: rgba(255,255,255,.07);
    border-color: rgba(255,255,255,.12);
    color: #E7E9EE;
  }

  .cf-ms-item-code { font-weight: 700; letter-spacing: .04em; flex-shrink: 0;
    min-width: 42px; }
  .cf-ms-item-name { flex: 1; min-width: 0; font-size: 11px; color: #545E6E;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .cf-ms-item-count { font-size: 10px; font-weight: 700; color: #545E6E;
    padding: 2px 7px; border-radius: 4px; background: rgba(255,255,255,.03); flex-shrink: 0; }
  .cf-ms-item-check { display: inline-flex; align-items: center; justify-content: center;
    flex-shrink: 0; width: 20px; height: 20px; border-radius: 50%;
    background: linear-gradient(135deg, var(--accent), var(--accent-2)); color: #0D1117;
    opacity: 0; transform: scale(.5);
    transition: opacity .16s ease, transform .2s cubic-bezier(.2,.8,.25,1); }

  .cf-ms-foot { display: flex; align-items: center; justify-content: space-between;
    padding: 8px 12px; border-top: 1px solid #1A2029; background: rgba(0,0,0,.15); }
  .cf-ms-foot-btn { background: none; border: none;
    font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 10.5px;
    font-weight: 700; letter-spacing: .04em; text-transform: uppercase; cursor: pointer;
    padding: 3px 6px; border-radius: 4px; transition: all .15s; }
  .cf-ms-foot-btn.all { color: var(--accent); }
  .cf-ms-foot-btn.all:hover { background: color-mix(in srgb, var(--accent) 10%, transparent); }
  .cf-ms-foot-btn.clear { color: var(--ink-3); }
  .cf-ms-foot-btn.clear:hover { color: var(--ink-2); background: rgba(255,255,255,.04); }

  .cf-btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px;
    border-radius: 8px; border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03); color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 11px;
    font-weight: 600; letter-spacing: .02em; cursor: pointer;
    transition: all .18s; white-space: nowrap; }
  .cf-btn:hover:not(:disabled) { color: var(--ink-1); background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.2); transform: translateY(-1px); }
  .cf-btn:disabled { opacity: .5; cursor: not-allowed; }
  .cf-btn.is-active { background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117; border-color: transparent; font-weight: 700;
    box-shadow: 0 6px 18px -8px color-mix(in srgb, var(--accent) 55%, transparent); }
  .cf-btn.is-sync { border-color: color-mix(in srgb, var(--accent) 35%, transparent); background: color-mix(in srgb, var(--accent) 6%, transparent);
    color: var(--accent); }
  .cf-btn.is-sync:hover:not(:disabled) { background: color-mix(in srgb, var(--accent) 12%, transparent);
    border-color: var(--accent); }
  .cf-sync-icon.spinning { animation: cfSpin 1s linear infinite; }

  .cf-date { display: inline-flex; align-items: center; gap: 6px; }
  .cf-date-input { background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1); border-radius: 8px; color: var(--ink-1);
    font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 11.5px;
    padding: 6px 10px; outline: none; transition: border-color .18s; color-scheme: dark; }
  .cf-date-input:hover { border-color: rgba(255,255,255,.2); }
  .cf-date-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent); }

  .cf-view-toggle { display: inline-flex; padding: 3px; background: rgba(0,0,0,.32);
    border: 1px solid rgba(255,255,255,.06); border-radius: 10px; gap: 2px; }
  .cf-view-btn { display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 12px; border-radius: 7px; background: transparent; border: none;
    color: var(--ink-2); font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px; font-weight: 600; letter-spacing: .02em; cursor: pointer;
    transition: all .18s; white-space: nowrap; }
  .cf-view-btn:hover { color: var(--ink-1); background: rgba(255,255,255,.04); }
  .cf-view-btn.is-active { background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117; font-weight: 700; box-shadow: 0 6px 16px -8px color-mix(in srgb, var(--accent) 60%, transparent); }

  @keyframes cfSpin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    .cf-ms-btn, .cf-ms-item, .cf-ms-item-check, .cf-ms-chevron,
    .cf-btn, .cf-view-btn, .cf-ms-foot-btn { transition: none !important; }
    .cf-sync-icon.spinning { animation: none !important; }
  }
`;

const IMPACT_LABELS = { high: 'High', medium: 'Medium', low: 'Low' };


const SELECTED_ITEM_STYLE = {
  background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
  borderColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
  color: '#F5F6F8',
};

const SELECTED_CODE_STYLE = {
  color: '#FBBF24',
  fontWeight: 700,
};

const SELECTED_NAME_STYLE = { color: '#8892A3' };

const SELECTED_COUNT_STYLE = {
  color: '#FBBF24',
  background: 'color-mix(in srgb, var(--accent) 14%, transparent)',
};

const SELECTED_CHECK_STYLE = {
  opacity: 1,
  transform: 'scale(1)',
  background: 'var(--accent)',
  boxShadow: 'none',
};

const SELECTED_BAR_STYLE = {
  position: 'absolute',
  left: 3,
  top: '50%',
  transform: 'translateY(-50%)',
  width: 3,
  height: '55%',
  borderRadius: 3,
  background: 'var(--accent)',
  opacity: 0.85,
};

function CurrencyMultiSelect({
  availableCurrencies = [],
  selected = [],
  toggleCurrency,
  clearCurrencies,
  selectAllCurrencies,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const hasSelection = selected.length > 0;

  useEffect(() => { if (!open) setQuery(''); }, [open]);

  const ordered = useMemo(() => {
    const selSet = new Set(selected);
    return [...availableCurrencies].sort((a, b) => {
      const aSel = selSet.has(a.currency);
      const bSel = selSet.has(b.currency);
      if (aSel !== bSel) return aSel ? -1 : 1;
      if (b.count !== a.count) return b.count - a.count;
      return a.currency.localeCompare(b.currency);
    });
  }, [availableCurrencies, selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ordered;
    return ordered.filter((c) => {
      const code = c.currency.toLowerCase();
      const name = (CURRENCY_NAMES[c.currency] || '').toLowerCase();
      return code.includes(q) || name.includes(q);
    });
  }, [ordered, query]);

  const showSplit = hasSelection && !query.trim();
  const selectedRows = showSplit ? filtered.filter((c) => selected.includes(c.currency)) : [];
  const unselectedRows = showSplit ? filtered.filter((c) => !selected.includes(c.currency)) : filtered;

  const triggerLabel = hasSelection ? 'Currencies' : 'All currencies';

  const renderItem = ({ currency, count }) => {
    const isSelected = selected.includes(currency);
    const name = CURRENCY_NAMES[currency] || currency;
    return (
      <Command.Item
        key={currency}
        value={`${currency} ${name}`}
        onSelect={() => toggleCurrency(currency)}
        data-checked={String(isSelected)}
        className="cf-ms-item"
        style={isSelected ? SELECTED_ITEM_STYLE : undefined}
      >
        {isSelected && <span style={SELECTED_BAR_STYLE} aria-hidden />}

        <span
          className="cf-ms-item-code"
          style={isSelected ? SELECTED_CODE_STYLE : undefined}
        >
          {currency}
        </span>

        <span
          className="cf-ms-item-name"
          style={isSelected ? SELECTED_NAME_STYLE : undefined}
        >
          {name}
        </span>

        <span
          className="cf-ms-item-count"
          style={isSelected ? SELECTED_COUNT_STYLE : undefined}
        >
          {count}
        </span>

        <span
          className="cf-ms-item-check"
          style={isSelected ? SELECTED_CHECK_STYLE : undefined}
          aria-hidden
        >
          <Check size={12} strokeWidth={3.5} />
        </span>
      </Command.Item>
    );
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`cf-ms-btn${hasSelection ? ' is-active' : ''}`}
          aria-label="Currency filter"
        >
          <span className="cf-ms-label">{triggerLabel}</span>
          {hasSelection && <span className="cf-ms-count">{selected.length}</span>}
          <ChevronDown size={11} className="cf-ms-chevron" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" sideOffset={6} className="cf-ms-pop">
        <Command className="cf-ms-cmd" shouldFilter={false}>
          <div className="cf-ms-search">
            <Search size={12} />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search currencies…"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <Command.List className="cf-ms-list">
            {filtered.length === 0 && (
              <div className="cf-ms-empty">
                {availableCurrencies.length === 0 ? 'Loading currencies…' : 'No currencies match.'}
              </div>
            )}

            {showSplit ? (
              <>
                {selectedRows.length > 0 && (
                  <>
                    <div className="cf-ms-sep">Selected</div>
                    {selectedRows.map(renderItem)}
                  </>
                )}
                {unselectedRows.length > 0 && (
                  <>
                    <div className="cf-ms-sep">All currencies</div>
                    {unselectedRows.map(renderItem)}
                  </>
                )}
              </>
            ) : (
              filtered.map(renderItem)
            )}
          </Command.List>

          <div className="cf-ms-foot">
            <button type="button" className="cf-ms-foot-btn all" onClick={selectAllCurrencies}>
              All
            </button>
            <button type="button" className="cf-ms-foot-btn clear" onClick={clearCurrencies}>
              Reset
            </button>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function CalendarFilters({
  availableCurrencies = [],
  currencies,
  impacts,
  toggleCurrency,
  clearCurrencies,
  toggleImpact,
  clearImpacts,
  from,
  to,
  rangePreset,
  applyPreset,
  setCustomRange,
  view,
  setView,
}) {
  const syncMutation = useSyncCalendar();
  const handleSync = () => syncMutation.mutate();

  const handleFromChange = (e) => { const v = e.target.value; if (v) setCustomRange(v, to); };
  const handleToChange = (e) => { const v = e.target.value; if (v) setCustomRange(from, v); };

  const handleSelectAllCurrencies = () => {
    availableCurrencies.forEach(({ currency }) => {
      if (!currencies.includes(currency)) toggleCurrency(currency);
    });
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="cf-root">
        <div className="cf-row">
          <span className="cf-label">Impact</span>
          <div className="cf-seg">
            <button
              type="button"
              className={`cf-seg-btn ${impacts.length === 0 ? 'is-active' : ''}`}
              onClick={clearImpacts}
            >All</button>
            {IMPACT_LEVELS.map((level) => {
              const active = impacts.includes(level);
              return (
                <button
                  key={level}
                  type="button"
                  className={`cf-seg-btn ${active ? 'is-active' : ''}`}
                  onClick={() => toggleImpact(level)}
                >
                  <span className={`cf-impact-dot ${level}`} />
                  {IMPACT_LABELS[level]}
                </button>
              );
            })}
          </div>

          <span className="cf-label" style={{ marginLeft: 8 }}>Currency</span>
          <CurrencyMultiSelect
            availableCurrencies={availableCurrencies}
            selected={currencies}
            toggleCurrency={toggleCurrency}
            clearCurrencies={clearCurrencies}
            selectAllCurrencies={handleSelectAllCurrencies}
          />

          <div className="cf-spacer" />

          <button
            type="button"
            className="cf-btn is-sync"
            onClick={handleSync}
            disabled={syncMutation.isPending}
            title="Force a sync from Biquote now"
          >
            <RefreshCw size={12} className={`cf-sync-icon ${syncMutation.isPending ? 'spinning' : ''}`} />
            {syncMutation.isPending ? 'Syncing…' : 'Sync now'}
          </button>

          <div className="cf-view-toggle" role="tablist">
            <button
              type="button" role="tab" aria-selected={view === 'list'}
              className={`cf-view-btn ${view === 'list' ? 'is-active' : ''}`}
              onClick={() => setView('list')}
            ><List size={12} /> List</button>
            <button
              type="button" role="tab" aria-selected={view === 'month'}
              className={`cf-view-btn ${view === 'month' ? 'is-active' : ''}`}
              onClick={() => setView('month')}
            ><CalendarDays size={12} /> Month</button>
          </div>
        </div>

        <div className="cf-row">
          <span className="cf-label">Range</span>
          <button type="button" className={`cf-btn ${rangePreset === 'today' ? 'is-active' : ''}`} onClick={() => applyPreset('today')}>Today</button>
          <button type="button" className={`cf-btn ${rangePreset === 'week' ? 'is-active' : ''}`} onClick={() => applyPreset('week')}>Week</button>
          <button type="button" className={`cf-btn ${rangePreset === 'month' ? 'is-active' : ''}`} onClick={() => applyPreset('month')}>Month</button>

          <div className="cf-date">
            <input type="date" className="cf-date-input" value={from} onChange={handleFromChange} />
            <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>→</span>
            <input type="date" className="cf-date-input" value={to} onChange={handleToChange} />
          </div>
        </div>
      </div>
    </>
  );
}