import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { CornerDownLeft, Search, Star } from 'lucide-react';
import { CALCULATORS, CATEGORIES, calculatorPath, calculatorsIn, findCalculator, getCategory, searchCalculators } from '../registry';
import { usePinned } from '../lib/usePinned.js';

const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);

/**
 * Jump to any calculator from anywhere: press Ctrl/⌘ + K (or click the button).
 * ↑ ↓ to move · Enter to open · Esc to close.
 */
export default function CalculatorSwitcher({ currentId }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef(null);
  const { pins } = usePinned();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
    }
  }, [open]);

  const sections = useMemo(() => {
    if (!open) return [];
    if (query.trim()) return [{ key: 'r', label: 'Results', items: searchCalculators(query) }];
    const out = [];
    const pinned = pins.map(findCalculator).filter(Boolean);
    if (pinned.length) out.push({ key: 'p', label: 'Pinned', icon: Star, items: pinned });
    CATEGORIES.forEach((cat) => out.push({ key: cat.id, label: cat.label, color: cat.color, items: calculatorsIn(cat.id) }));
    return out;
  }, [open, query, pins]);

  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const go = (calc) => {
    if (!calc) return;
    setOpen(false);
    navigate(calculatorPath(calc));
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') setOpen(false);
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(flat.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(flat[active]);
    }
  };

  let n = -1;
  return (
    <>
      <button type="button" className="cx-btn cx-switch-btn" onClick={() => setOpen(true)} title="Switch calculator">
        <Search size={12} /> Switch
        <span className="cx-kbd">{isMac ? '⌘' : 'Ctrl'} K</span>
      </button>

      {open &&
        createPortal(
          <div className="cx-root cx-layer" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
            <div className="cx-pal" role="dialog" aria-modal="true" aria-label="Switch calculator">
              <div className="cx-pal-search">
                <Search size={16} />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={`Jump to any of ${CALCULATORS.length} calculators…`}
                  aria-label="Search calculators"
                />
                <span className="cx-kbd">Esc</span>
              </div>

              <div className="cx-pal-list" ref={listRef}>
                {flat.length === 0 && <div className="cx-pal-empty">No calculator matches “{query}”.</div>}
                {sections.map((s) => {
                  const SecIcon = s.icon;
                  return (
                    <div key={s.key}>
                      <div className="cx-pal-label">
                        {s.color && <i style={{ background: s.color }} />}
                        {SecIcon && <SecIcon size={11} />}
                        {s.label}
                      </div>
                      {s.items.map((c) => {
                        n += 1;
                        const idx = n;
                        const Icon = c.icon;
                        const cat = getCategory(c.category);
                        return (
                          <button
                            key={`${s.key}-${c.id}`}
                            type="button"
                            className={`cx-pal-item${idx === active ? ' is-active' : ''}${c.id === currentId ? ' is-current' : ''}`}
                            data-active={idx === active}
                            style={{ '--cat': cat?.color }}
                            onMouseMove={() => active !== idx && setActive(idx)}
                            onClick={() => go(c)}
                          >
                            <span className="cx-pal-ico"><Icon size={15} /></span>
                            <span className="cx-pal-text">
                              <b>{c.title}</b>
                              <small>{c.desc}</small>
                            </span>
                            {query.trim() && <span className="cx-pal-cat">{cat?.label}</span>}
                            {idx === active && <CornerDownLeft size={13} className="cx-pal-enter" />}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              <div className="cx-pal-foot">
                <span><span className="cx-kbd">↑</span> <span className="cx-kbd">↓</span> navigate</span>
                <span><span className="cx-kbd">↵</span> open</span>
                <span><span className="cx-kbd">Esc</span> close</span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
