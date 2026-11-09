import { ArrowDown, ArrowUp, ChevronDown, Menu } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useMarketQuote } from '@/shared/api/marketData';
import { SymbolIcon } from '@/shared/symbols';

const fmt = (n, d = 2) => (n == null || Number.isNaN(Number(n)) ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: Math.max(d, 4) }));
const compact = (n) => (n == null || Number.isNaN(Number(n)) ? null : Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(n)));

export default function QuoteHeader({ symbol, symInfo, precision = 2, onOpenSymbols, onOpenDrawer }) {
  const hasData = !!symInfo?.hasData;
  const { data, isLoading } = useMarketQuote(symbol, { enabled: !!symbol && hasData });

  const price = data?.price != null ? Number(data.price) : null;
  const change = data?.change != null ? Number(data.change) : null;
  const pct = data?.changePct != null ? Number(data.changePct) : null;
  const loading = isLoading && !data;
  const dir = change == null ? 'is-empty' : change >= 0 ? 'is-up' : 'is-down';
  const Arrow = (change ?? 0) >= 0 ? ArrowUp : ArrowDown;

  // Briefly tint the price when a refresh changes it.
  const prevPx = useRef(null);
  const [flash, setFlash] = useState('');
  useEffect(() => { prevPx.current = null; setFlash(''); }, [symbol]);
  useEffect(() => {
    if (!Number.isFinite(price)) return undefined;
    const prev = prevPx.current;
    prevPx.current = price;
    if (prev == null || prev === price) return undefined;
    setFlash(price > prev ? 'up' : 'down');
    const t = setTimeout(() => setFlash(''), 700);
    return () => clearTimeout(t);
  }, [price]);

  const lo = data?.low ?? data?.dayLow;
  const hi = data?.high ?? data?.dayHigh;
  const hasGauge = lo != null && hi != null && Number(hi) > Number(lo) && price != null;
  const gaugePos = hasGauge ? Math.min(100, Math.max(0, ((price - Number(lo)) / (Number(hi) - Number(lo))) * 100)) : 0;
  const stateOpen = /open|regular/i.test(String(data?.marketState || ''));

  const stats = [
    { k: 'Open', v: fmt(data?.open, precision), show: data?.open != null },
    { k: 'Prev close', v: fmt(data?.previousClose, precision), show: data?.previousClose != null },
    { k: 'Volume', v: compact(data?.volume), show: compact(data?.volume) != null },
  ].filter((s) => s.show);

  return (
    <div className="mk-quote">
      <button type="button" className="mk-menu" onClick={onOpenDrawer} aria-label="Open panel"><Menu size={15} /></button>

      <button type="button" className="mk-sym" onClick={onOpenSymbols} aria-haspopup="dialog" title="Change symbol (/)">
        <SymbolIcon symbol={symbol} size={30} />
        <span className="mk-sym-names">
          <span className="mk-sym-code">{symbol}<ChevronDown size={13} /></span>
          <span className="mk-sym-sub">
            {symInfo?.label && <span className="mk-sym-label">{symInfo.label}</span>}
            {(data?.exchange || symInfo?.exchange) && <span>{data?.exchange || symInfo?.exchange}</span>}
          </span>
        </span>
      </button>

      <div className="mk-price" aria-live="polite">
        <span className={`mk-px ${loading || change == null ? '' : dir}${flash ? ` flash-${flash}` : ''}`}>{loading ? '—' : fmt(price, precision)}</span>
        <span className={`mk-chg ${dir}`}>
          {change != null ? (
            <span className="mk-chg-pill">
              <Arrow size={11} strokeWidth={3} />{fmt(Math.abs(change), precision)} ({pct != null ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` : '—'})
            </span>
          ) : loading ? 'Fetching quote…' : '—'}
        </span>
      </div>

      {data?.marketState && (
        <span className={`mk-badge${stateOpen ? ' is-open' : ''}`}><i />{String(data.marketState).toLowerCase()}</span>
      )}

      <div className="mk-gauge">
        {hasGauge && (
          <>
            <div className="mk-gauge-lbl"><span>Low <b>{fmt(lo, precision)}</b></span><span>High <b>{fmt(hi, precision)}</b></span></div>
            <div className="mk-track" role="img" aria-label={`Price is ${Math.round(gaugePos)}% of the way from day low to day high`}><i style={{ left: `${gaugePos}%` }} /></div>
          </>
        )}
      </div>

      <div className="mk-stats">
        {stats.map((s) => (<div key={s.k} className="mk-stat"><em>{s.k}</em><b>{s.v}</b></div>))}
      </div>
    </div>
  );
}
