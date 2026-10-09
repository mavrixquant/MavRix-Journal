// apps/web/src/shared/symbols/SymbolSelect.jsx
//
// Searchable, icon-rich symbol picker.
//
// Data source: useMarketCatalog() → SYMBOL_CATALOG from the API. This is
// the SAME catalog the chart page uses, so the dropdown is guaranteed to
// contain only symbols that the chart page can render.
//
// Public API:
//   <SymbolSelect
//     value="NQ"
//     onChange={(code) => ...}
//     placeholder="Select symbol…"
//     disabled={false}
//     error={false}
//     id="trade-symbol"
//   />
//
// Behaviour:
//   - Panel opens on trigger click (Radix Popover + cmdk Command)
//   - Rows grouped by category, each row shows SymbolIcon + code + label
//   - Search matches code, label, category, exchange
//   - Selecting a row calls onChange(code) and closes the panel
//   - If `value` is set but not in the catalog (legacy data like "NQ1!"),
//     the trigger still renders it as plain text so the value isn't
//     silently dropped. The user must actively pick a catalog symbol to
//     replace it.
//   - While the catalog is loading, the trigger is disabled and shows
//     "Loading symbols…"
//
// Z-INDEX NOTE:
//   The popover content is portaled to document.body. When SymbolSelect is
//   used inside a modal (e.g. AddTradeModal with .at-overlay z-index 1000),
//   the default z-50 from the shadcn wrapper would sit BEHIND the modal
//   backdrop. `.symsel-pop` therefore forces z-index: 3000 !important.

import { useCallback, useMemo, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { Command } from 'cmdk';

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/popover';
import { useMarketCatalog } from '@/shared/api/marketData';
import SymbolIcon from './SymbolIcon';

/* ------------------------------------------------------------------ */
/*  Scoped styles                                                     */
/* ------------------------------------------------------------------ */

const CSS = `
  /* ---------- Trigger ---------- */
  .symsel-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 9px 32px 9px 12px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 10px;
    color: #E7E9EE;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 13px;
    outline: none;
    box-sizing: border-box;
    cursor: pointer;
    text-align: left;
    position: relative;
    transition: border-color .2s, box-shadow .2s, background-color .2s;
  }
  .symsel-trigger:hover:not(:disabled) {
    border-color: rgba(255,255,255,.2);
  }
  .symsel-trigger:focus-visible,
  .symsel-trigger[data-state="open"] {
    border-color: #F59E0B;
    box-shadow: 0 0 0 3px rgba(245,158,11,.15);
    background: rgba(10,13,19,.9);
  }
  .symsel-trigger:disabled {
    opacity: .55;
    cursor: not-allowed;
  }
  .symsel-trigger.has-error {
    border-color: rgba(239,68,68,.6);
    box-shadow: 0 0 0 3px rgba(239,68,68,.10);
  }
  .symsel-trigger.has-error:focus-visible,
  .symsel-trigger.has-error[data-state="open"] {
    border-color: #ef4444;
    box-shadow: 0 0 0 3px rgba(239,68,68,.20);
  }

  .symsel-trigger-code {
    font-weight: 700;
    color: #E7E9EE;
    letter-spacing: .02em;
    flex-shrink: 0;
  }
  .symsel-trigger-label {
    color: #545E6E;
    font-weight: 400;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
    flex: 1;
  }
  .symsel-trigger-placeholder {
    color: #545E6E;
    font-weight: 400;
    flex: 1;
  }
  .symsel-trigger-chevron {
    position: absolute;
    right: 11px;
    top: 50%;
    transform: translateY(-50%);
    color: #545E6E;
    pointer-events: none;
    transition: transform .18s ease, color .16s ease;
    flex-shrink: 0;
  }
  .symsel-trigger:hover:not(:disabled) .symsel-trigger-chevron {
    color: #8892A3;
  }
  .symsel-trigger[data-state="open"] .symsel-trigger-chevron {
    color: #F59E0B;
    transform: translateY(-50%) rotate(180deg);
  }

  /* ---------- Panel ----------
     z-index: 3000 !important — must float above the AddTradeModal overlay
     (z-index 1000) and any Alert overlay (z-index 2000). */
  .symsel-pop {
    padding: 0 !important;
    background: #11151F !important;
    border: 1px solid #212836 !important;
    border-radius: 10px !important;
    box-shadow: 0 16px 40px -12px rgba(0,0,0,.7) !important;
    overflow: hidden;
    width: var(--radix-popover-trigger-width);
    min-width: 280px;
    max-width: 420px;
    z-index: 3000 !important;
  }

  .symsel-cmd {
    display: flex;
    flex-direction: column;
    background: transparent;
    width: 100%;
  }

  /* ---------- Search row ---------- */
  .symsel-cmd-input-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-bottom: 1px solid #1A2029;
    color: #545E6E;
    flex-shrink: 0;
  }
  .symsel-cmd-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: #E7E9EE;
    font-size: 12.5px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    min-width: 0;
  }
  .symsel-cmd-input::placeholder {
    color: #545E6E;
  }

  /* ---------- List ---------- */
  .symsel-cmd-list {
    max-height: 340px;
    overflow-y: auto;
    padding: 6px;
  }
  .symsel-cmd-list::-webkit-scrollbar { width: 6px; }
  .symsel-cmd-list::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08);
    border-radius: 99px;
  }

  .symsel-cmd-empty {
    padding: 24px 12px;
    text-align: center;
    color: #545E6E;
    font-size: 11.5px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    line-height: 1.6;
  }

  /* ---------- Group ---------- */
  .symsel-cmd-group {
    padding: 0;
    margin-bottom: 4px;
  }
  .symsel-cmd-group:last-child {
    margin-bottom: 0;
  }
  .symsel-cmd-group [cmdk-group-heading] {
    padding: 8px 10px 4px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: #545E6E;
    user-select: none;
  }

  /* ---------- Item ---------- */
  .symsel-cmd-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 7px;
    cursor: pointer;
    color: #8892A3;
    font-size: 12.5px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    user-select: none;
    transition: background-color .12s ease, color .12s ease;
    scroll-margin-top: 8px;
  }
  .symsel-cmd-item[data-selected="true"] {
    background: rgba(245,158,11,.08);
    color: #E7E9EE;
  }
  .symsel-cmd-item[data-selected="true"] .symsel-cmd-item-code {
    color: #F59E0B;
  }
  .symsel-cmd-item:hover {
    background: rgba(255,255,255,.04);
    color: #E7E9EE;
  }

  .symsel-cmd-item-icon {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
  }

  .symsel-cmd-item-code {
    font-weight: 700;
    color: #E7E9EE;
    letter-spacing: .02em;
    flex-shrink: 0;
    min-width: 52px;
  }

  .symsel-cmd-item-label {
    color: #545E6E;
    font-weight: 400;
    font-size: 11.5px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }
  .symsel-cmd-item[data-selected="true"] .symsel-cmd-item-label {
    color: #8892A3;
  }

  .symsel-cmd-item-check {
    flex-shrink: 0;
    color: #F59E0B;
    opacity: 0;
    transition: opacity .12s ease;
  }
  .symsel-cmd-item.is-current .symsel-cmd-item-check {
    opacity: 1;
  }

  @media (prefers-reduced-motion: reduce) {
    .symsel-trigger,
    .symsel-trigger-chevron,
    .symsel-cmd-item,
    .symsel-cmd-item-check { transition: none !important; }
  }
`;

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function SymbolSelect({
  value = '',
  onChange,
  placeholder = 'Select symbol…',
  disabled = false,
  error = false,
  id,
  className,
}) {
  const [open, setOpen] = useState(false);

  const { data: catalog, isLoading } = useMarketCatalog();
  const symbols = useMemo(() => catalog?.symbols ?? [], [catalog]);

  const current = useMemo(
    () => symbols.find((s) => s.code === value) || null,
    [symbols, value]
  );

  // Group by category, preserving catalog order within each group.
  const grouped = useMemo(() => {
    const m = new Map();
    for (const s of symbols) {
      if (!m.has(s.category)) m.set(s.category, []);
      m.get(s.category).push(s);
    }
    return [...m.entries()];
  }, [symbols]);

  const handlePick = useCallback(
    (code) => {
      if (onChange) onChange(code);
      setOpen(false);
    },
    [onChange]
  );

  const isDisabled = disabled || isLoading;
  const showPlaceholder = !value;

  // cmdk resets its internal query whenever the Command unmounts. Because
  // the Popover contents unmount on close, we get a fresh search box on
  // every open — no manual reset needed.

  return (
    <>
      <style>{CSS}</style>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            className={`symsel-trigger ${error ? 'has-error' : ''} ${className || ''}`}
            disabled={isDisabled}
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            {isLoading ? (
              <span className="symsel-trigger-placeholder">Loading symbols…</span>
            ) : showPlaceholder ? (
              <span className="symsel-trigger-placeholder">{placeholder}</span>
            ) : current ? (
              <>
                <SymbolIcon symbol={current.code} size={16} />
                <span className="symsel-trigger-code">{current.code}</span>
                <span className="symsel-trigger-label">{current.label}</span>
              </>
            ) : (
              // Legacy / unknown value — render as plain code so the
              // existing value is not silently dropped.
              <span className="symsel-trigger-code">{value}</span>
            )}

            <ChevronDown size={14} className="symsel-trigger-chevron" aria-hidden />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={6}
          className="symsel-pop"
        >
          <Command className="symsel-cmd">
            <div className="symsel-cmd-input-wrap">
              <Search size={13} />
              <Command.Input
                className="symsel-cmd-input"
                placeholder="Search symbols…"
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <Command.List className="symsel-cmd-list">
              <Command.Empty className="symsel-cmd-empty">
                No symbols match.
                <br />
                Try NQ, EUR, or BTC.
              </Command.Empty>

              {grouped.map(([category, items]) => (
                <Command.Group
                  key={category}
                  heading={category}
                  className="symsel-cmd-group"
                >
                  {items.map((s) => {
                    const isCurrent = s.code === value;
                    // `value` is what cmdk filters against — include every
                    // searchable field so users can type "nasdaq", "cme",
                    // "crypto", etc.
                    const searchValue = `${s.code} ${s.label} ${s.category} ${s.exchange || ''}`;
                    return (
                      <Command.Item
                        key={s.code}
                        value={searchValue}
                        onSelect={() => handlePick(s.code)}
                        className={`symsel-cmd-item${isCurrent ? ' is-current' : ''}`}
                      >
                        <span className="symsel-cmd-item-icon">
                          <SymbolIcon symbol={s.code} size={18} />
                        </span>
                        <span className="symsel-cmd-item-code">{s.code}</span>
                        <span className="symsel-cmd-item-label">{s.label}</span>
                        <Check
                          size={13}
                          className="symsel-cmd-item-check"
                          aria-hidden
                        />
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              ))}
            </Command.List>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}