// apps/web/src/features/charts/components/WatchlistSidebar.jsx
//
// Left sidebar: every catalog symbol grouped by category, with live price
// + change % and per-symbol icon.
//
// Category headers are collapsible accordions; collapse state persists in
// localStorage. The search box above filters across all symbols.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Minimize2, Maximize2, Search, X } from 'lucide-react';

import { useMarketQuotes } from '@/shared/api/marketData';
import { SymbolIcon } from '@/shared/symbols';

const STORAGE_KEY = 'mavrix:chart:watchlist:collapsed';

function loadCollapsed() {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function saveCollapsed(set) {
  if (typeof window === 'undefined') return;
  try {
    if (!set || set.size === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
    }
  } catch {
    // localStorage disabled — silent
  }
}

function fmtPrice(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* ------------------------------------------------------------------ */
/*  Scoped styles                                                     */
/* ------------------------------------------------------------------ */

const CSS = `
  .wl-root {
    position: sticky; top: 12px;
    max-height: 100vh;
    display: flex; flex-direction: column;
    border-radius: 12px;
    background: rgba(15,18,25,.55);
    border: 1px solid rgba(255,255,255,.085);
    overflow: hidden;
  }
  @media (max-width: 1100px) { .wl-root { display: none; } }

  /* ---------- Header ---------- */
  .wl-head {
    display: flex; align-items: center; gap: 8px;
    padding: 12px 10px 12px 14px;
    border-bottom: 1px solid rgba(255,255,255,.05);
    flex-shrink: 0;
  }
  .wl-title {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; font-weight: 700; letter-spacing: .14em;
    text-transform: uppercase; color: #8892A3;
  }
  .wl-count {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; color: #F59E0B; font-weight: 700;
    padding: 1px 6px; border-radius: 4px;
    background: rgba(245,158,11,.10);
    border: 1px solid rgba(245,158,11,.28);
  }
  .wl-toggle-all {
    margin-left: auto;
    display: inline-flex; align-items: center; justify-content: center;
    width: 22px; height: 22px; padding: 0;
    border-radius: 5px;
    border: 1px solid rgba(255,255,255,.08);
    background: rgba(255,255,255,.02);
    color: #545E6E;
    cursor: pointer;
    transition: color .15s, border-color .15s, background-color .15s;
  }
  .wl-toggle-all:hover:not(:disabled) {
    color: #F59E0B;
    border-color: rgba(245,158,11,.28);
    background: rgba(245,158,11,.06);
  }
  .wl-toggle-all:disabled { opacity: .35; cursor: not-allowed; }
  .wl-toggle-all:focus-visible {
    outline: none;
    border-color: #F59E0B;
    box-shadow: 0 0 0 3px rgba(245,158,11,.16);
  }

  /* ---------- Search ---------- */
  .wl-search {
    position: relative;
    padding: 8px 10px;
    border-bottom: 1px solid rgba(255,255,255,.05);
    flex-shrink: 0;
  }
  .wl-search-icon {
    position: absolute;
    left: 18px;
    top: 50%;
    transform: translateY(-50%);
    color: #545E6E;
    pointer-events: none;
  }
  .wl-search-input {
    width: 100%;
    padding: 7px 30px 7px 30px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 8px;
    color: #E7E9EE;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    outline: none;
    box-sizing: border-box;
    transition: border-color .15s, box-shadow .15s, background-color .15s;
  }
  .wl-search-input::placeholder { color: #545E6E; }
  .wl-search-input:hover { border-color: rgba(255,255,255,.2); }
  .wl-search-input:focus {
    border-color: #F59E0B;
    background: rgba(10,13,19,.9);
    box-shadow: 0 0 0 3px rgba(245,158,11,.15);
  }
  .wl-search-clear {
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    display: inline-flex; align-items: center; justify-content: center;
    width: 18px; height: 18px; padding: 0;
    border: none;
    border-radius: 50%;
    background: rgba(255,255,255,.06);
    color: #8892A3;
    cursor: pointer;
    transition: background-color .15s, color .15s;
  }
  .wl-search-clear:hover {
    color: #F59E0B;
    background: rgba(245,158,11,.14);
  }
  .wl-search-clear:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px rgba(245,158,11,.4);
  }

  /* ---------- List ---------- */
  .wl-list {
    flex: 1; min-height: 0;
    overflow-y: auto;
    padding: 4px;
  }
  .wl-list::-webkit-scrollbar { width: 6px; }
  .wl-list::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08);
    border-radius: 99px;
  }

  /* ---------- Group ---------- */
  .wl-group { margin-bottom: 2px; }

  .wl-group-head {
    display: flex; align-items: center; gap: 6px;
    width: 100%;
    padding: 8px 10px 6px;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9px; font-weight: 700; letter-spacing: .14em;
    text-transform: uppercase;
    color: #545E6E;
    border-radius: 6px;
    transition: color .15s, background-color .15s;
  }
  .wl-group-head:hover {
    color: #8892A3;
    background: rgba(255,255,255,.03);
  }
  .wl-group-head:focus-visible {
    outline: none;
    color: #F59E0B;
    background: rgba(245,158,11,.06);
  }
  .wl-group-chevron {
    flex-shrink: 0;
    transition: transform .22s cubic-bezier(.2,.8,.25,1);
    transform: rotate(0deg);
  }
  .wl-group.is-collapsed .wl-group-chevron { transform: rotate(-90deg); }
  .wl-group-label { flex: 1; }
  .wl-group-count {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9px; font-weight: 600;
    color: rgba(84,94,110,.75);
    padding: 1px 5px;
    border-radius: 3px;
    background: rgba(255,255,255,.03);
    letter-spacing: 0;
  }
  .wl-group.is-collapsed .wl-group-count {
    color: #545E6E;
    background: rgba(245,158,11,.08);
  }

  /* ---------- Group items ---------- */
  .wl-group-items {
    display: flex; flex-direction: column;
    animation: wlGroupOpen .2s cubic-bezier(.2,.8,.25,1);
  }
  @keyframes wlGroupOpen {
    from { opacity: 0; transform: translateY(-2px); }
    to   { opacity: 1; transform: none; }
  }

  /* ---------- Symbol row ---------- */
  .wl-row {
    display: flex; align-items: center; justify-content: space-between;
    gap: 8px;
    width: 100%;
    padding: 8px 10px;
    border-radius: 7px;
    border: 1px solid transparent;
    background: transparent;
    cursor: pointer;
    text-align: left;
    transition: background-color .14s, border-color .14s;
    font-family: inherit;
  }
  .wl-row:hover { background: rgba(255,255,255,.04); }
  .wl-row.is-active {
    background: rgba(245,158,11,.10);
    border-color: rgba(245,158,11,.28);
  }

  .wl-row-main {
    display: flex; flex-direction: column; gap: 1px;
    min-width: 0; flex: 1;
  }
  .wl-code-row {
    display: flex; align-items: center; gap: 7px;
    min-width: 0;
  }
  .wl-code {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px; font-weight: 700;
    color: #E7E9EE;
    letter-spacing: .02em;
    white-space: nowrap;
  }
  .wl-row.is-active .wl-code { color: #F59E0B; }
  .wl-label {
    font-size: 10px;
    color: #545E6E;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .wl-row-right {
    display: flex; flex-direction: column; align-items: flex-end; gap: 1px;
    flex-shrink: 0;
  }
  .wl-price {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px; color: #8892A3; font-weight: 600;
  }
  .wl-change {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; color: #545E6E; font-weight: 600;
  }
  .wl-change.is-up { color: #35C4A1; }
  .wl-change.is-down { color: #FF5C5C; }

  /* ---------- Search results (flat) ---------- */
  .wl-results {
    display: flex; flex-direction: column;
    padding: 2px 0;
  }
  .wl-results-head {
    padding: 6px 10px 8px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9px; font-weight: 700; letter-spacing: .14em;
    text-transform: uppercase;
    color: #545E6E;
  }
  .wl-results-cat {
    font-size: 8.5px;
    color: #545E6E;
    opacity: .75;
    margin-left: 6px;
    letter-spacing: .06em;
  }
  .wl-empty {
    padding: 30px 16px;
    text-align: center;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    color: #545E6E;
    line-height: 1.6;
  }

  @media (prefers-reduced-motion: reduce) {
    .wl-toggle-all, .wl-search-input, .wl-search-clear,
    .wl-group-head, .wl-group-chevron, .wl-row { transition: none !important; }
    .wl-group-items { animation: none !important; }
  }
`;

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function WatchlistSidebar({ catalog = [], activeSymbol, onChange }) {
  const symbols = useMemo(() => catalog.map((s) => s.code), [catalog]);

  const { data } = useMarketQuotes(symbols, { enabled: symbols.length > 0 });

  const [collapsed, setCollapsed] = useState(loadCollapsed);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    saveCollapsed(collapsed);
  }, [collapsed]);

  const quoteMap = useMemo(() => {
    const map = new Map();
    (data?.quotes || []).forEach((q) => map.set(q.symbol, q));
    return map;
  }, [data]);

  const grouped = useMemo(() => {
    const m = new Map();
    for (const s of catalog) {
      if (!m.has(s.category)) m.set(s.category, []);
      m.get(s.category).push(s);
    }
    return [...m.entries()];
  }, [catalog]);

  const normalizedQuery = query.trim().toLowerCase();

  const searchResults = useMemo(() => {
    if (!normalizedQuery) return [];
    return catalog.filter((s) => {
      const code = s.code.toLowerCase();
      const label = (s.label || '').toLowerCase();
      const category = (s.category || '').toLowerCase();
      const exchange = (s.exchange || '').toLowerCase();
      return (
        code.includes(normalizedQuery) ||
        label.includes(normalizedQuery) ||
        category.includes(normalizedQuery) ||
        exchange.includes(normalizedQuery)
      );
    });
  }, [catalog, normalizedQuery]);

  const isSearching = normalizedQuery.length > 0;

  const toggleGroup = useCallback((category) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }, []);

  const allCollapsed =
    grouped.length > 0 && grouped.every(([c]) => collapsed.has(c));

  const toggleAll = useCallback(() => {
    setCollapsed((prev) => {
      const isAllCollapsed =
        grouped.length > 0 && grouped.every(([c]) => prev.has(c));
      if (isAllCollapsed) return new Set();
      return new Set(grouped.map(([c]) => c));
    });
  }, [grouped]);

  const handlePick = useCallback(
    (code) => {
      onChange(code);
      setQuery('');
      inputRef.current?.blur();
    },
    [onChange]
  );

  const handleQueryChange = useCallback((e) => {
    setQuery(e.target.value);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      if (query) setQuery('');
      else e.currentTarget.blur();
    }
  }, [query]);

  const clearQuery = useCallback(() => {
    setQuery('');
    inputRef.current?.focus();
  }, []);

  const renderRow = (s, { showCategory = false } = {}) => {
    const q = quoteMap.get(s.code);
    const change = q?.changePct;
    const isUp = change != null && change >= 0;
    const isDown = change != null && change < 0;
    const isActive = s.code === activeSymbol;

    return (
      <button
        key={s.code}
        type="button"
        className={`wl-row${isActive ? ' is-active' : ''}`}
        onClick={() => handlePick(s.code)}
      >
        <div className="wl-row-main">
          <div className="wl-code-row">
            <SymbolIcon symbol={s.code} size={16} />
            <span className="wl-code">{s.code}</span>
            {showCategory && (
              <span className="wl-results-cat">{s.category}</span>
            )}
          </div>
          <span className="wl-label">{s.label}</span>
        </div>
        <div className="wl-row-right">
          <span className="wl-price">{fmtPrice(q?.price)}</span>
          <span
            className={`wl-change ${isUp ? 'is-up' : isDown ? 'is-down' : ''}`}
          >
            {change != null
              ? `${isUp ? '+' : ''}${change.toFixed(2)}%`
              : '—'}
          </span>
        </div>
      </button>
    );
  };

  return (
    <aside className="wl-root">
      <style>{CSS}</style>

      <div className="wl-head">
        <span className="wl-title">Watchlist</span>
        <span className="wl-count">{catalog.length}</span>

        <button
          type="button"
          className="wl-toggle-all"
          onClick={toggleAll}
          title={allCollapsed ? 'Expand all groups' : 'Collapse all groups'}
          aria-label={allCollapsed ? 'Expand all groups' : 'Collapse all groups'}
          disabled={isSearching}
        >
          {allCollapsed ? <Maximize2 size={11} /> : <Minimize2 size={11} />}
        </button>
      </div>

      <div className="wl-search">
        <Search size={12} className="wl-search-icon" />
        <input
          ref={inputRef}
          type="text"
          className="wl-search-input"
          placeholder="Search symbols…"
          value={query}
          onChange={handleQueryChange}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          autoComplete="off"
        />
        {query.length > 0 && (
          <button
            type="button"
            className="wl-search-clear"
            onClick={clearQuery}
            aria-label="Clear search"
            title="Clear search"
          >
            <X size={11} />
          </button>
        )}
      </div>

      <div className="wl-list">
        {isSearching ? (
          searchResults.length === 0 ? (
            <div className="wl-empty">
              No symbols match "{query}".
              <br />
              Try NQ, EUR, or BTC.
            </div>
          ) : (
            <div className="wl-results">
              <div className="wl-results-head">
                {searchResults.length}{' '}
                {searchResults.length === 1 ? 'result' : 'results'}
              </div>
              {searchResults.map((s) => renderRow(s, { showCategory: true }))}
            </div>
          )
        ) : (
          grouped.map(([category, items]) => {
            const isCollapsed = collapsed.has(category);
            return (
              <div
                key={category}
                className={`wl-group${isCollapsed ? ' is-collapsed' : ''}`}
              >
                <button
                  type="button"
                  className="wl-group-head"
                  onClick={() => toggleGroup(category)}
                  aria-expanded={!isCollapsed}
                  aria-controls={`wl-group-${category}`}
                >
                  <ChevronDown size={11} className="wl-group-chevron" />
                  <span className="wl-group-label">{category}</span>
                  <span className="wl-group-count">{items.length}</span>
                </button>

                {!isCollapsed && (
                  <div className="wl-group-items" id={`wl-group-${category}`}>
                    {items.map((s) => renderRow(s))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}