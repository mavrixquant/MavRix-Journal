// apps/web/src/features/journal/economic-calendar/components/CalendarFilters.jsx
//
// Filter bar for the Economic Calendar page.
//
// Controls:
//   - Impact segmented buttons: All / High / Medium / Low (multi-select).
//   - Currency chips: discovered dynamically from the cache. Empty selection
//     means "all currencies".
//   - Date-range preset buttons: Today / Week / Month + custom from/to.
//   - View toggle: List / Month — grouped with the Sync button.
//   - Sync button: POST /api/calendar/sync and refresh.

import { RefreshCw, Calendar, X, List, CalendarDays } from 'lucide-react';
import {
  IMPACT_LEVELS,
  CURRENCY_NAMES,
} from '@mavrix/shared';
import { useSyncCalendar } from '@/shared/api/calendar';

/* ------------------------------------------------------------------ */
/*  Scoped CSS                                                         */
/* ------------------------------------------------------------------ */

const CSS = `
  .cf-root {
    --accent: #F59E0B;
    --accent-2: #FDE68A;
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;
    --impact-high: #F59E0B;
    --impact-medium: #60A5FA;
    --impact-low: #545E6E;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .cf-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
  }
  .cf-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--ink-3);
    margin-right: 4px;
    flex-shrink: 0;
  }
  .cf-spacer { flex: 1; min-width: 8px; }

  /* ---------- Currency chips ---------- */
  .cf-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,.08);
    background: rgba(255,255,255,.025);
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .18s cubic-bezier(.2,.8,.25,1);
  }
  .cf-chip:hover {
    color: var(--ink-1);
    border-color: rgba(255,255,255,.18);
    background: rgba(255,255,255,.05);
  }
  .cf-chip.is-active {
    background: linear-gradient(135deg, rgba(245,158,11,.18), rgba(245,158,11,.06));
    border-color: rgba(245,158,11,.45);
    color: var(--accent);
  }
  .cf-chip .cf-chip-count {
    font-size: 9.5px;
    color: var(--ink-3);
    font-weight: 500;
  }
  .cf-chip.is-active .cf-chip-count {
    color: rgba(245,158,11,.7);
  }

  /* ---------- Impact segmented control ---------- */
  .cf-seg {
    display: inline-flex;
    padding: 3px;
    background: rgba(0,0,0,.32);
    border: 1px solid rgba(255,255,255,.06);
    border-radius: 10px;
    gap: 2px;
  }
  .cf-seg-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 7px;
    background: transparent;
    border: none;
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .18s;
    white-space: nowrap;
  }
  .cf-seg-btn:hover { color: var(--ink-1); background: rgba(255,255,255,.04); }
  .cf-seg-btn.is-active {
    background: rgba(255,255,255,.08);
    color: var(--ink-1);
  }
  .cf-impact-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .cf-impact-dot.high   { background: var(--impact-high);   box-shadow: 0 0 8px rgba(245,158,11,.6); }
  .cf-impact-dot.medium { background: var(--impact-medium); box-shadow: 0 0 8px rgba(96,165,250,.5); }
  .cf-impact-dot.low    { background: var(--impact-low);    }

  /* ---------- Date range ---------- */
  .cf-date {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .cf-date-input {
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 8px;
    color: var(--ink-1);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    padding: 6px 10px;
    outline: none;
    transition: border-color .18s;
    color-scheme: dark;
  }
  .cf-date-input:hover { border-color: rgba(255,255,255,.2); }
  .cf-date-input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(245,158,11,.15);
  }

  /* ---------- Buttons ---------- */
  .cf-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 12px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .18s cubic-bezier(.2,.8,.25,1);
    white-space: nowrap;
  }
  .cf-btn:hover:not(:disabled) {
    color: var(--ink-1);
    background: rgba(255,255,255,.06);
    border-color: rgba(255,255,255,.2);
    transform: translateY(-1px);
  }
  .cf-btn:disabled { opacity: .5; cursor: not-allowed; }
  .cf-btn.is-active {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    border-color: transparent;
    font-weight: 700;
    box-shadow: 0 6px 18px -8px rgba(245,158,11,.55);
  }
  .cf-btn.is-sync {
    border-color: rgba(245,158,11,.35);
    background: rgba(245,158,11,.06);
    color: var(--accent);
  }
  .cf-btn.is-sync:hover:not(:disabled) {
    background: rgba(245,158,11,.12);
    border-color: var(--accent);
  }
  .cf-btn.is-sync .cf-sync-icon.spinning {
    animation: cfSpin 1s linear infinite;
  }

  /* ---------- View toggle (segmented, in the same row as Sync) ---------- */
  .cf-view-toggle {
    display: inline-flex;
    padding: 3px;
    background: rgba(0,0,0,.32);
    border: 1px solid rgba(255,255,255,.06);
    border-radius: 10px;
    gap: 2px;
  }
  .cf-view-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 12px;
    border-radius: 7px;
    background: transparent;
    border: none;
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    transition: all .18s;
    white-space: nowrap;
  }
  .cf-view-btn:hover { color: var(--ink-1); background: rgba(255,255,255,.04); }
  .cf-view-btn.is-active {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    font-weight: 700;
    box-shadow: 0 6px 16px -8px rgba(245,158,11,.6);
  }

  .cf-clear {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    border-radius: 8px;
    border: 1px solid rgba(239,68,68,.28);
    background: rgba(239,68,68,.05);
    color: #f87171;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all .18s;
  }
  .cf-clear:hover {
    background: rgba(239,68,68,.12);
    border-color: rgba(239,68,68,.55);
  }

  @keyframes cfSpin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    .cf-chip, .cf-btn, .cf-seg-btn, .cf-clear, .cf-view-btn { transition: none !important; }
    .cf-sync-icon.spinning { animation: none !important; }
  }
`;

/* ------------------------------------------------------------------ */
/*  Impact labels                                                      */
/* ------------------------------------------------------------------ */

const IMPACT_LABELS = {
  high:   'High',
  medium: 'Medium',
  low:    'Low',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CalendarFilters({
  // Currency list from the API — array of { currency, count }
  availableCurrencies = [],

  // Selected values (arrays)
  currencies,
  impacts,

  // Setters
  toggleCurrency,
  clearCurrencies,
  toggleImpact,
  clearImpacts,

  // Date range
  from,
  to,
  rangePreset,
  applyPreset,
  setCustomRange,
  goToToday,

  // View toggle (moved here from the page header)
  view,
  setView,
}) {
  const syncMutation = useSyncCalendar();

  const handleSync = () => {
    syncMutation.mutate();
  };

  const handleFromChange = (e) => {
    const value = e.target.value;
    if (value) setCustomRange(value, to);
  };

  const handleToChange = (e) => {
    const value = e.target.value;
    if (value) setCustomRange(from, value);
  };

  // Sort currencies: selected first, then by count desc, then alphabetically.
  const sortedCurrencies = [...availableCurrencies].sort((a, b) => {
    const aSel = currencies.includes(a.currency);
    const bSel = currencies.includes(b.currency);
    if (aSel !== bSel) return aSel ? -1 : 1;
    if (b.count !== a.count) return b.count - a.count;
    return a.currency.localeCompare(b.currency);
  });

  return (
    <>
      <style>{CSS}</style>
      <div className="cf-root">

        {/* ---------- Row 1: Impact + view toggle + sync ---------- */}
        <div className="cf-row">
          <span className="cf-label">Impact</span>
          <div className="cf-seg">
            <button
              type="button"
              className={`cf-seg-btn ${impacts.length === 0 ? 'is-active' : ''}`}
              onClick={clearImpacts}
            >
              All
            </button>
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

          <div className="cf-spacer" />

          <button
            type="button"
            className="cf-btn is-sync"
            onClick={handleSync}
            disabled={syncMutation.isPending}
            title="Force a sync from Biquote now"
          >
            <RefreshCw
              size={12}
              className={`cf-sync-icon ${syncMutation.isPending ? 'spinning' : ''}`}
            />
            {syncMutation.isPending ? 'Syncing…' : 'Sync now'}
          </button>

          {/* View toggle: sits on the same row, to the right of Sync */}
          <div className="cf-view-toggle" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={view === 'list'}
              className={`cf-view-btn ${view === 'list' ? 'is-active' : ''}`}
              onClick={() => setView('list')}
            >
              <List size={12} /> List
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'month'}
              className={`cf-view-btn ${view === 'month' ? 'is-active' : ''}`}
              onClick={() => setView('month')}
            >
              <CalendarDays size={12} /> Month
            </button>
          </div>
        </div>

        {/* ---------- Row 2: Currency ---------- */}
        <div className="cf-row">
          <span className="cf-label">Currency</span>

          {sortedCurrencies.length === 0 ? (
            <span style={{ fontSize: 11.5, color: 'var(--ink-3)', fontStyle: 'italic' }}>
              Loading currencies…
            </span>
          ) : (
            sortedCurrencies.slice(0, 12).map(({ currency, count }) => {
              const active = currencies.includes(currency);
              return (
                <button
                  key={currency}
                  type="button"
                  className={`cf-chip ${active ? 'is-active' : ''}`}
                  onClick={() => toggleCurrency(currency)}
                  title={CURRENCY_NAMES[currency] || currency}
                >
                  {currency}
                  <span className="cf-chip-count">{count}</span>
                </button>
              );
            })
          )}

          {currencies.length > 0 && (
            <button
              type="button"
              className="cf-clear"
              onClick={clearCurrencies}
              title="Clear currency filter"
            >
              <X size={11} /> Clear
            </button>
          )}
        </div>

        {/* ---------- Row 3: Date range ---------- */}
        <div className="cf-row">
          <span className="cf-label">Range</span>

          <button
            type="button"
            className={`cf-btn ${rangePreset === 'today' ? 'is-active' : ''}`}
            onClick={() => applyPreset('today')}
          >
            Today
          </button>
          <button
            type="button"
            className={`cf-btn ${rangePreset === 'week' ? 'is-active' : ''}`}
            onClick={() => applyPreset('week')}
          >
            Week
          </button>
          <button
            type="button"
            className={`cf-btn ${rangePreset === 'month' ? 'is-active' : ''}`}
            onClick={() => applyPreset('month')}
          >
            Month
          </button>

          <button
            type="button"
            className="cf-btn"
            onClick={goToToday}
            title="Jump to today"
          >
            <Calendar size={11} /> Today
          </button>

          <div className="cf-date">
            <input
              type="date"
              className="cf-date-input"
              value={from}
              onChange={handleFromChange}
            />
            <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>→</span>
            <input
              type="date"
              className="cf-date-input"
              value={to}
              onChange={handleToChange}
            />
          </div>
        </div>
      </div>
    </>
  );
}