// apps/web/src/features/charts/components/SymbolSearch.jsx
//
// Searchable symbol picker. Reads the catalog from the API — nothing is
// hardcoded here. Adding a symbol to apps/api/src/lib/marketData/symbolMap.js
// makes it appear automatically.

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';

export default function SymbolSearch({ catalog = [], value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Focus search input when the panel opens
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? catalog.filter(
          (s) =>
            s.code.toLowerCase().includes(q) ||
            s.label.toLowerCase().includes(q) ||
            (s.yahoo || '').toLowerCase().includes(q)
        )
      : catalog;

    const map = new Map();
    for (const s of filtered) {
      if (!map.has(s.category)) map.set(s.category, []);
      map.get(s.category).push(s);
    }
    return [...map.entries()];
  }, [catalog, query]);

  const current = catalog.find((s) => s.code === value);

  const handlePick = (code) => {
    onChange(code);
    setOpen(false);
    setQuery('');
  };

  return (
    <div className="sym-root" ref={rootRef}>
      <button
        type="button"
        className={`sym-trigger${open ? ' is-open' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="sym-trigger-code">{current?.code ?? value ?? '—'}</span>
        <span className="sym-trigger-label">
          {current?.label ?? 'Pick a symbol'}
        </span>
        <ChevronDown size={14} className="sym-trigger-chevron" />
      </button>

      {open && (
        <div className="sym-panel" role="listbox">
          <div className="sym-search">
            <Search size={13} className="sym-search-icon" />
            <input
              ref={inputRef}
              type="text"
              className="sym-search-input"
              placeholder="Search symbols…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="sym-list">
            {grouped.length === 0 && (
              <div className="sym-empty">No matches for "{query}"</div>
            )}

            {grouped.map(([category, items]) => (
              <div key={category} className="sym-group">
                <div className="sym-group-head">{category}</div>
                {items.map((s) => (
                  <button
                    key={s.code}
                    type="button"
                    role="option"
                    aria-selected={s.code === value}
                    className={`sym-item${s.code === value ? ' is-active' : ''}`}
                    onClick={() => handlePick(s.code)}
                  >
                    <span className="sym-item-code">{s.code}</span>
                    <span className="sym-item-label">{s.label}</span>
                    {s.exchange && (
                      <span className="sym-item-exchange">{s.exchange}</span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}