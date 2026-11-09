import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Crosshair, Search, Star, Trash2, X, Minimize2, Maximize2, Briefcase } from 'lucide-react';

import { useMarketQuotes } from '@/shared/api/marketData';
import { SymbolIcon } from '@/shared/symbols';
import EmptyState from '@/shared/components/EmptyState';
import { TOOL_BY_ID } from '../lib/drawings';
import { INDICATORS } from '../lib/indicators';

const COLLAPSED_KEY = 'mavrix:chart:watchlist:collapsed';
const FAV_KEY = 'mavrix:chart:favorites';

function loadSet(key) {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch { return new Set(); }
}
function saveSet(key, set) {
  try {
    if (!set || set.size === 0) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify([...set]));
  } catch { /* ignore */ }
}

const fmtPrice = (n) => (n == null || Number.isNaN(Number(n)) ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const fmtMoney = (n) => `${n >= 0 ? '+' : '-'}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate = (iso) => {
  const [y, m, d] = String(iso || '').split('-').map(Number);
  if (!Number.isFinite(y)) return String(iso || '');
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/* -------------------------------- Watchlist -------------------------------- */
function Watchlist({ catalog, activeSymbol, onSymbol }) {
  const covered = useMemo(() => catalog.filter((s) => s.hasData !== false), [catalog]);
  const symbols = useMemo(() => covered.map((s) => s.code), [covered]);
  const { data } = useMarketQuotes(symbols, { enabled: symbols.length > 0 });

  const [collapsed, setCollapsed] = useState(() => loadSet(COLLAPSED_KEY));
  const [favs, setFavs] = useState(() => loadSet(FAV_KEY));
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { saveSet(COLLAPSED_KEY, collapsed); }, [collapsed]);
  useEffect(() => { saveSet(FAV_KEY, favs); }, [favs]);

  const quoteMap = useMemo(() => {
    const m = new Map();
    (data?.quotes || []).forEach((q) => m.set(q.symbol, q));
    return m;
  }, [data]);

  const grouped = useMemo(() => {
    const m = new Map();
    const favList = covered.filter((s) => favs.has(s.code));
    if (favList.length) m.set('Favorites', favList);
    for (const s of covered) {
      if (!m.has(s.category)) m.set(s.category, []);
      m.get(s.category).push(s);
    }
    return [...m.entries()];
  }, [covered, favs]);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => (q ? covered.filter((s) => [s.code, s.label, s.category, s.exchange].some((v) => (v || '').toLowerCase().includes(q))) : []), [covered, q]);
  const allCollapsed = grouped.length > 0 && grouped.every(([c]) => collapsed.has(c));

  const toggleGroup = useCallback((c) => setCollapsed((prev) => { const n = new Set(prev); if (n.has(c)) n.delete(c); else n.add(c); return n; }), []);
  const toggleAll = useCallback(() => setCollapsed(allCollapsed ? new Set() : new Set(grouped.map(([c]) => c))), [allCollapsed, grouped]);
  const toggleFav = useCallback((code) => setFavs((prev) => { const n = new Set(prev); if (n.has(code)) n.delete(code); else n.add(code); return n; }), []);

  const row = (s, showCat = false) => {
    const qt = quoteMap.get(s.code);
    const chg = qt?.changePct;
    const up = chg != null && chg >= 0;
    const down = chg != null && chg < 0;
    return (
      <div key={s.code} className={`mk-row${s.code === activeSymbol ? ' is-active' : ''}`}>
        <button type="button" className="mk-row-main" onClick={() => { onSymbol(s.code); setQuery(''); }}>
          <SymbolIcon symbol={s.code} size={18} />
          <span className="mk-row-names">
            <span className="mk-row-code">{s.code}{showCat && <em>{s.category}</em>}</span>
            <span className="mk-row-label">{s.label}</span>
          </span>
          <span className="mk-row-quote">
            <span className="mk-row-px">{fmtPrice(qt?.price)}</span>
            <span className={`mk-row-chg ${up ? 'is-up' : down ? 'is-down' : ''}`}>{chg != null ? `${up ? '+' : ''}${chg.toFixed(2)}%` : '—'}</span>
          </span>
        </button>
        <button type="button" className={`mk-star${favs.has(s.code) ? ' is-on' : ''}`} onClick={() => toggleFav(s.code)} aria-label={favs.has(s.code) ? `Remove ${s.code} from favorites` : `Add ${s.code} to favorites`} aria-pressed={favs.has(s.code)}>
          <Star size={12} fill={favs.has(s.code) ? 'currentColor' : 'none'} />
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="mk-search">
        <Search size={12} />
        <input
          ref={inputRef} className="mk-wl-search" type="text" placeholder="Search symbols…" value={query}
          onChange={(e) => setQuery(e.target.value)} spellCheck={false} autoComplete="off"
          onKeyDown={(e) => { if (e.key === 'Escape') { if (query) setQuery(''); else e.currentTarget.blur(); } }}
        />
        {query ? (
          <button type="button" className="mk-search-x" onClick={() => { setQuery(''); inputRef.current?.focus(); }} aria-label="Clear search"><X size={11} /></button>
        ) : (
          <button type="button" className="mk-search-x" onClick={toggleAll} aria-label={allCollapsed ? 'Expand all groups' : 'Collapse all groups'} title={allCollapsed ? 'Expand all' : 'Collapse all'}>
            {allCollapsed ? <Maximize2 size={11} /> : <Minimize2 size={11} />}
          </button>
        )}
      </div>

      <div className="mk-scroll">
        {q ? (
          results.length === 0 ? (
            <div className="mk-pad"><EmptyState size="sm" variant="bare" icon={Search} title="No symbols match" description={`Try NQ, EUR, or BTC. Nothing matched “${query}”.`} /></div>
          ) : (
            <>
              <div className="mk-group-title">{results.length} {results.length === 1 ? 'result' : 'results'}</div>
              {results.map((s) => row(s, true))}
            </>
          )
        ) : (
          grouped.map(([category, items]) => {
            const isC = collapsed.has(category);
            return (
              <div key={category} className={`mk-group${isC ? ' is-collapsed' : ''}`}>
                <button type="button" className="mk-group-head" onClick={() => toggleGroup(category)} aria-expanded={!isC}>
                  <ChevronDown size={11} className="mk-group-chev" />
                  <span>{category}</span>
                  <em>{items.length}</em>
                </button>
                {!isC && items.map((s) => row(s))}
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

/* ---------------------------------- Trades ---------------------------------- */
function TradesTab({ symbol, rows, activeId, onFocus, showTrades, onToggleTrades, showLabels, onToggleLabels, journalTotal }) {
  return (
    <>
      <div className="mk-switches">
        <label className="mk-switch-row"><span>Show on chart</span><input type="checkbox" checked={showTrades} onChange={(e) => onToggleTrades(e.target.checked)} /><i className="mk-switch" /></label>
        <label className={`mk-switch-row${showTrades ? '' : ' is-disabled'}`}><span>Show P&amp;L labels</span><input type="checkbox" checked={showLabels} disabled={!showTrades} onChange={(e) => onToggleLabels(e.target.checked)} /><i className="mk-switch" /></label>
      </div>
      {rows.length === 0 ? (
        <div className="mk-pad">
          <EmptyState
            size="sm" variant="bare" icon={Crosshair} title={`No ${symbol} trades in view`}
            description={journalTotal > 0 ? 'Your journal has trades on other symbols or outside the loaded dates. Scroll back or change the range.' : 'Log a Live or Demo trade with this symbol and it shows up here.'}
          />
        </div>
      ) : (
        <div className="mk-scroll">
          {rows.map((t) => (
            <button key={t.id} type="button" className={`mk-trade${t.id === activeId ? ' is-active' : ''}`} onClick={() => onFocus(t)} title={`Focus chart on ${t.date} ${t.time}`}>
              <span className="mk-trade-top"><b>{fmtDate(t.date)}</b><em className={t.long ? 'is-long' : 'is-short'}>{t.long ? 'Long' : 'Short'}</em></span>
              <span className="mk-trade-bot"><span>{t.time}</span><b className={t.net > 0 ? 'is-up' : t.net < 0 ? 'is-down' : ''}>{fmtMoney(t.net)}</b></span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/* --------------------------------- Objects ---------------------------------- */
function ObjectsTab({ drawings, selectedId, onSelect, onRemove, onClear, precision, enabledIndicators, onToggleIndicator }) {
  const inds = INDICATORS.filter((i) => enabledIndicators.includes(i.id));
  return (
    <div className="mk-scroll">
      <div className="mk-group-title">Drawings <em>{drawings.length}</em>{drawings.length > 0 && <button type="button" onClick={onClear}>Clear all</button>}</div>
      {drawings.length === 0 && <div className="mk-note">Use the tools on the left (H, L, Y, B, G, P) to draw. Drag a drawing to move it, or drag its handles to resize. Drawings are saved per symbol.</div>}
      {[...drawings].reverse().map((d) => (
        <div key={d.id} className={`mk-obj${d.id === selectedId ? ' is-active' : ''}`}>
          <button type="button" className="mk-obj-main" onClick={() => onSelect(d.id)}>
            <i className="mk-dot" style={{ background: d.color }} />
            <span>{TOOL_BY_ID[d.type]?.label || d.type}</span>
            <em>{Number(d.pts[0]?.p).toLocaleString('en-US', { minimumFractionDigits: precision, maximumFractionDigits: precision })}</em>
          </button>
          <button type="button" className="mk-obj-x" onClick={() => onRemove(d.id)} aria-label="Delete drawing"><Trash2 size={12} /></button>
        </div>
      ))}

      <div className="mk-group-title">Indicators <em>{inds.length}</em></div>
      {inds.length === 0 && <div className="mk-note">No indicators on this chart. Press I to add some.</div>}
      {inds.map((i) => (
        <div key={i.id} className="mk-obj">
          <span className="mk-obj-main static"><i className="mk-dot" style={{ background: i.lines.find((l) => l.k === i.primary)?.color || i.lines[0].color }} /><span>{i.label}</span><em>{i.overlay ? 'overlay' : 'pane'}</em></span>
          <button type="button" className="mk-obj-x" onClick={() => onToggleIndicator(i.id)} aria-label={`Remove ${i.label}`}><X size={12} /></button>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------- Panel ----------------------------------- */
export default function SidePanel({
  tab, onTab, onClose,
  catalog, activeSymbol, onSymbol,
  tradeRows, tradeCount, journalTotal, activeTradeId, onFocusTrade, showTrades, onToggleTrades, showLabels, onToggleLabels,
  drawings, selectedId, onSelect, onRemoveDrawing, onClearDrawings, precision,
  enabledIndicators, onToggleIndicator,
}) {
  const tabs = [
    { id: 'watch', label: 'Watchlist', n: catalog.filter((s) => s.hasData !== false).length },
    { id: 'trades', label: 'Trades', n: tradeCount, icon: Briefcase },
    { id: 'objects', label: 'Objects', n: drawings.length + enabledIndicators.length },
  ];
  return (
    <aside className="mk-panel" aria-label="Chart side panel">
      <div className="mk-tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-active' : ''} onClick={() => onTab(t.id)}>
            {t.label}<em>{t.n}</em>
          </button>
        ))}
        <button type="button" className="mk-panel-x" onClick={onClose} aria-label="Close panel"><X size={13} /></button>
      </div>
      {tab === 'watch' && <Watchlist catalog={catalog} activeSymbol={activeSymbol} onSymbol={onSymbol} />}
      {tab === 'trades' && (
        <TradesTab
          symbol={activeSymbol} rows={tradeRows} activeId={activeTradeId} onFocus={onFocusTrade}
          showTrades={showTrades} onToggleTrades={onToggleTrades} showLabels={showLabels} onToggleLabels={onToggleLabels} journalTotal={journalTotal}
        />
      )}
      {tab === 'objects' && (
        <ObjectsTab
          drawings={drawings} selectedId={selectedId} onSelect={onSelect} onRemove={onRemoveDrawing} onClear={onClearDrawings}
          precision={precision} enabledIndicators={enabledIndicators} onToggleIndicator={onToggleIndicator}
        />
      )}
    </aside>
  );
}
