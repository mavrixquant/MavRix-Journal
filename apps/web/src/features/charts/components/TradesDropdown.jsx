import { useEffect, useRef, useState } from 'react';
import { ChevronDown, TrendingUp } from 'lucide-react';

import Portal from '@/shared/components/Portal';

const CSS = `
  .td-root {
    position: absolute;
    top: 12px;
    right: 82px;
    z-index: 30;
    display: inline-flex;
    align-items: center;
  }

  .td-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 6px 12px 6px 10px;
    border-radius: 8px;
    background: rgba(12, 16, 23, 0.78);
    border: 1px solid rgba(255,255,255,.10);
    color: #8892A3;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: .02em;
    cursor: pointer;
    outline: none;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    transition: color .18s ease, border-color .18s ease,
                background-color .18s ease;
    white-space: nowrap;
  }
  .td-btn:hover {
    color: var(--accent);
    border-color: var(--accent-soft2);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
  }
  .td-btn.is-open {
    color: var(--accent);
    border-color: var(--accent-soft2);
    background: color-mix(in srgb, var(--accent) 10%, transparent);
  }
  .td-btn:focus-visible {
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
  }
  .td-btn svg { flex-shrink: 0; }

  .td-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    padding: 0 6px;
    border-radius: 9px;
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    border: 1px solid var(--accent-soft2);
    color: var(--accent);
    font-size: 10px;
    font-weight: 700;
    line-height: 1;
  }

  .td-chevron {
    transition: transform .2s cubic-bezier(.2,.8,.25,1);
  }
  .td-chevron.is-open { transform: rotate(180deg); }

  .td-panel {
    position: fixed;
    z-index: 2500;
    width: 300px;
    max-height: 420px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,.10);
    background: linear-gradient(180deg, #12161F 0%, #0C1017 100%);
    box-shadow:
      0 24px 60px -20px rgba(0,0,0,.95),
      0 0 0 1px color-mix(in srgb, var(--accent) 8%, transparent);
    color: #E7E9EE;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    animation: tdPop .18s cubic-bezier(.2,.8,.25,1);
    transform-origin: top right;
  }
  @keyframes tdPop {
    from { opacity: 0; transform: translateY(-6px) scale(.97); }
    to   { opacity: 1; transform: none; }
  }

  .td-head {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 14px;
    border-bottom: 1px solid rgba(255,255,255,.06);
    background: rgba(0,0,0,.15);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: #545E6E;
  }
  .td-head strong {
    color: var(--accent);
    font-weight: 700;
  }

  .td-toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    text-transform: none;
    letter-spacing: 0;
    font-weight: 500;
    font-size: 11px;
    color: #E7E9EE;
    cursor: pointer;
    padding-top: 6px;
    border-top: 1px dashed rgba(255,255,255,.06);
  }

  .td-switch {
    position: relative;
    width: 28px;
    height: 16px;
    border-radius: 99px;
    background: rgba(255,255,255,.1);
    transition: background-color .2s;
  }
  .td-switch::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #E7E9EE;
    transition: transform .2s;
  }
  .td-toggle-row input {
    display: none;
  }
  .td-toggle-row input:checked + .td-switch {
    background: var(--accent);
  }
  .td-toggle-row input:checked + .td-switch::after {
    transform: translateX(12px);
    background: #0D1117;
  }

  .td-list {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .td-list::-webkit-scrollbar { width: 6px; }
  .td-list::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08);
    border-radius: 99px;
  }

  .td-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    padding: 9px 10px;
    border-radius: 8px;
    border: 1px solid transparent;
    background: transparent;
    text-align: left;
    cursor: pointer;
    color: #E7E9EE;
    font-family: inherit;
    transition: all .16s cubic-bezier(.2,.8,.25,1);
  }
  .td-item:hover {
    background: rgba(255,255,255,.04);
    border-color: rgba(255,255,255,.06);
  }
  .td-item.is-active {
    background: color-mix(in srgb, var(--accent) 10%, transparent);
    border-color: var(--accent-soft2);
  }
  .td-item.is-active .td-item-date {
    color: var(--accent);
  }

  .td-item-row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
  }

  .td-item-date {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 700;
    letter-spacing: .01em;
    color: #E7E9EE;
    transition: color .16s ease;
  }
  .td-item-time {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    color: #8892A3;
  }
  .td-item-dir {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
    padding: 2px 7px;
    border-radius: 3px;
  }
  .td-item-dir.is-long {
    color: #35C4A1;
    background: rgba(53,196,161,.10);
    border: 1px solid rgba(53,196,161,.30);
  }
  .td-item-dir.is-short {
    color: #FF5C5C;
    background: rgba(255,92,92,.10);
    border: 1px solid rgba(255,92,92,.30);
  }

  .td-item-pnl {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .td-item-pnl.pos { color: #35C4A1; }
  .td-item-pnl.neg { color: #FF5C5C; }

  .td-empty {
    padding: 30px 16px;
    text-align: center;
    color: #545E6E;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    line-height: 1.6;
  }

  @media (prefers-reduced-motion: reduce) {
    .td-btn, .td-chevron, .td-item, .td-switch, .td-switch::after { transition: none !important; }
    .td-panel { animation: none !important; }
  }
`;

function formatDate(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = String(isoDate).split('-').map(Number);
  if (!Number.isFinite(y)) return String(isoDate);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  });
}

export default function TradesDropdown({
  trades = [],
  symbol,
  focusedTradeId,
  onSelect,
  showPositions,
  onTogglePositions,
}) {
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });

  const rootRef = useRef(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const update = () => {
      if (!buttonRef.current) return;
      const rect = buttonRef.current.getBoundingClientRect();
      setPanelPos({
        top: rect.bottom + 8,
        right: Math.max(8, window.innerWidth - rect.right),
      });
    };

    update();

    const onDown = (e) => {
      if (rootRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };

    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);

    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  const sorted = [...trades].sort((a, b) => {
    const da = `${b.date || ''}T${b.entryTime || ''}`;
    const db = `${a.date || ''}T${a.entryTime || ''}`;
    return da.localeCompare(db);
  });

  const handleSelect = (trade) => {
    onSelect?.(trade);
    setOpen(false);
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="td-root" ref={rootRef}>
        <button
          ref={buttonRef}
          type="button"
          className={`td-btn${open ? ' is-open' : ''}`}
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={open}
          title={`Show trades on ${symbol || ''}`}
        >
          <TrendingUp size={12} />
          <span>Show Trades</span>
          <span className="td-count">{sorted.length}</span>
          <ChevronDown
            size={12}
            className={`td-chevron${open ? ' is-open' : ''}`}
          />
        </button>
      </div>

      {open && (
        <Portal>
          <div
            ref={panelRef}
            className="td-panel"
            style={{ top: panelPos.top, right: panelPos.right }}
            role="listbox"
            aria-label="Trades on this symbol"
          >
            <div className="td-head">
              <div>
                {symbol || '—'} · <strong>{sorted.length}</strong>{' '}
                {sorted.length === 1 ? 'trade' : 'trades'}
              </div>
              
              <label className="td-toggle-row">
                <span>Show Position Box</span>
                <input
                  type="checkbox"
                  checked={showPositions}
                  onChange={(e) => onTogglePositions(e.target.checked)}
                />
                <span className="td-switch" />
              </label>
            </div>

            {sorted.length === 0 ? (
              <div className="td-empty">
                No journal trades on <b style={{ color: 'var(--accent)' }}>{symbol}</b> yet.
                <br />
                Log a Live / Demo trade with this symbol and it will show up here.
              </div>
            ) : (
              <div className="td-list">
                {sorted.map((t) => {
                  const isLong =
                    String(t.direction || '').toLowerCase() === 'long';
                  const net =
                    (Number(t.pnl) || 0) - (Number(t.commission) || 0);
                  const pnlCls = net >= 0 ? 'pos' : 'neg';
                  const isActive = t.id === focusedTradeId;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      className={`td-item${isActive ? ' is-active' : ''}`}
                      onClick={() => handleSelect(t)}
                    >
                      <div className="td-item-row">
                        <span className="td-item-date">
                          {formatDate(t.date)}
                        </span>
                        <span
                          className={`td-item-dir ${isLong ? 'is-long' : 'is-short'}`}
                        >
                          {isLong ? 'Long' : 'Short'}
                        </span>
                      </div>
                      <div className="td-item-row">
                        <span className="td-item-time">{t.entryTime}</span>
                        <span className={`td-item-pnl ${pnlCls}`}>
                          {net >= 0 ? '+' : ''}
                          {net.toFixed(2)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </Portal>
      )}
    </>
  );
}