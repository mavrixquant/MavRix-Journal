// apps/web/src/features/charts/components/WatchlistSidebar.jsx
//
// Left sidebar: every catalog symbol with live price + change %.
// Click a row to switch the chart symbol.

import { useMemo } from 'react';
import { useMarketQuotes } from '@/shared/api/marketData';

function fmtPrice(n) {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function WatchlistSidebar({ catalog = [], activeSymbol, onChange }) {
  const symbols = useMemo(() => catalog.map((s) => s.code), [catalog]);

  const { data } = useMarketQuotes(symbols, { enabled: symbols.length > 0 });

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

  return (
    <aside className="wl-root">
      <div className="wl-head">
        <span className="wl-title">Watchlist</span>
        <span className="wl-count">{catalog.length}</span>
      </div>

      <div className="wl-list">
        {grouped.map(([category, items]) => (
          <div key={category} className="wl-group">
            <div className="wl-group-head">{category}</div>
            {items.map((s) => {
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
                  onClick={() => onChange(s.code)}
                >
                  <div className="wl-row-main">
                    <span className="wl-code">{s.code}</span>
                    <span className="wl-label">{s.label}</span>
                  </div>
                  <div className="wl-row-right">
                    <span className="wl-price">{fmtPrice(q?.price)}</span>
                    <span className={`wl-change ${isUp ? 'is-up' : isDown ? 'is-down' : ''}`}>
                      {change != null
                        ? `${isUp ? '+' : ''}${change.toFixed(2)}%`
                        : '—'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </aside>
  );
}