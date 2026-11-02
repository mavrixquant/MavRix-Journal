import { ArrowDown, ArrowUp, Clock, Maximize2, Minimize2, RefreshCw, Calendar as CalendarIcon, Menu } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useMarketQuote } from '@/shared/api/marketData';
import { SymbolIcon } from '@/shared/symbols';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import RangeCalendar from './RangeCalendar';

const INTERVALS = [
  { id: '1m', label: '1m' }, { id: '5m', label: '5m' }, { id: '15m', label: '15m' },
  { id: '1h', label: '1h' }, { id: '4h', label: '4h' }, { id: '1d', label: '1D' },
];

const fmt = (n, d = 2) => (n == null || Number.isNaN(Number(n)) ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: 4 }));
const compact = (n) => (n == null || Number.isNaN(Number(n)) ? null : Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(n)));

function formatChartTime(t, interval, tz) {
  if (t == null) return null;
  const z = tz || undefined;
  if (interval === '1d') {
    const d = new Date(`${t}T00:00:00`);
    return Number.isNaN(d.getTime()) ? String(t) : d.toLocaleDateString('en-US', { timeZone: z, month: 'short', day: 'numeric', year: 'numeric' });
  }
  const d = new Date(Number(t) * 1000);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString('en-US', { timeZone: z, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

const CSS = `
  .qh { flex-shrink: 0; border-radius: 16px; background: linear-gradient(180deg, rgba(20,25,35,.72), rgba(12,16,23,.55)); border: 1px solid rgba(255,255,255,.085); backdrop-filter: blur(14px) saturate(140%); color: #E7E9EE; font-family: Inter, sans-serif; }
  .qh-quote { display: grid; grid-template-columns: auto auto minmax(180px, 280px) minmax(0,1fr); align-items: center; gap: 12px 28px; padding: 14px 18px; }
  .qh-id { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .qh-menu { display: none; width: 34px; height: 34px; align-items: center; justify-content: center; border-radius: 8px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.03); color: #8892A3; cursor: pointer; }
  .qh-names { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .qh-code { font: 800 18px/1 'IBM Plex Mono', monospace; color: #fff; letter-spacing: .01em; }
  .qh-sub { display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: #8892A3; min-width: 0; }
  .qh-sub span:first-child { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 160px; }
  .qh-badge { display: inline-flex; align-items: center; gap: 5px; padding: 1px 8px; border-radius: 99px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); font: 600 10px 'IBM Plex Mono', monospace; color: #8892A3; }
  .qh-badge i { width: 5px; height: 5px; border-radius: 50%; background: #545E6E; }
  .qh-badge.is-open { color: #35C4A1; border-color: rgba(53,196,161,.28); }
  .qh-badge.is-open i { background: #35C4A1; }

  .qh-price { display: flex; flex-direction: column; gap: 6px; padding-left: 26px; border-left: 1px solid rgba(255,255,255,.07); }
  .qh-px { font: 800 34px/1 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; letter-spacing: -.02em; border-radius: 6px; transition: background-color .7s ease; }
  .qh-px.flash-up { background: rgba(53,196,161,.18); transition: none; }
  .qh-px.flash-down { background: rgba(255,92,92,.18); transition: none; }
  .qh-chg { display: inline-flex; align-items: center; gap: 5px; font: 700 12.5px 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
  .qh-chg-pill { display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: 6px; background: rgba(255,255,255,.04); }
  .qh-chg.is-up .qh-chg-pill { background: rgba(53,196,161,.12); }
  .qh-chg.is-down .qh-chg-pill { background: rgba(255,92,92,.12); }
  .is-up { color: #35C4A1; } .is-down { color: #FF5C5C; } .is-empty { color: #545E6E; }

  .qh-gauge { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .qh-gauge-lbl { display: flex; justify-content: space-between; font: 600 10.5px 'IBM Plex Mono', monospace; color: #545E6E; }
  .qh-gauge-lbl b { color: #8892A3; font-weight: 600; font-variant-numeric: tabular-nums; }
  .qh-track { position: relative; height: 4px; border-radius: 99px; background: linear-gradient(90deg, rgba(255,92,92,.45), rgba(255,255,255,.1) 50%, rgba(53,196,161,.45)); }
  .qh-track i { position: absolute; top: 50%; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%; background: #E7E9EE; border: 2px solid #0A0D13; box-shadow: 0 0 0 1px rgba(255,255,255,.35); transition: left .5s cubic-bezier(.2,.8,.25,1); }

  .qh-stats { display: flex; align-items: center; justify-content: flex-end; gap: 22px; min-width: 0; overflow: hidden; }
  .qh-stat { display: flex; flex-direction: column; gap: 3px; flex-shrink: 0; }
  .qh-stat em { font: normal 600 10.5px 'IBM Plex Mono', monospace; color: #545E6E; }
  .qh-stat b { font: 600 12.5px 'IBM Plex Mono', monospace; color: #C9CFDA; font-variant-numeric: tabular-nums; }

  .qh-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 12px; padding: 8px 12px; border-top: 1px solid rgba(255,255,255,.06); }
  .qh-seg { display: inline-flex; gap: 2px; padding: 3px; border-radius: 9px; background: rgba(0,0,0,.32); border: 1px solid rgba(255,255,255,.06); }
  .qh-seg button { min-width: 34px; padding: 5px 9px; border: none; border-radius: 6px; background: transparent; color: #8892A3; font: 700 11px 'IBM Plex Mono', monospace; cursor: pointer; transition: color .15s, background-color .15s; }
  .qh-seg button:hover:not(.is-active) { color: #E7E9EE; background: rgba(255,255,255,.05); }
  .qh-seg button.is-active { background: linear-gradient(135deg, var(--accent), var(--accent-2)); color: #0D1117; box-shadow: 0 4px 10px -6px var(--accent); }
  .qh-seg.soft button.is-active { background: color-mix(in srgb, var(--accent) 14%, transparent); color: var(--accent); box-shadow: none; }
  .qh-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 32px; padding: 0 11px; border-radius: 8px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.03); color: #8892A3; font: 600 11px 'IBM Plex Mono', monospace; cursor: pointer; transition: all .15s; white-space: nowrap; }
  .qh-btn.sq { width: 32px; padding: 0; }
  .qh-btn.is-on { color: var(--accent); border-color: color-mix(in srgb, var(--accent) 38%, transparent); background: color-mix(in srgb, var(--accent) 9%, transparent); }
  .qh-btn:hover:not(:disabled) { color: var(--accent); border-color: var(--accent-soft2); background: color-mix(in srgb, var(--accent) 8%, transparent); }
  .qh-btn:disabled { opacity: .6; cursor: progress; }
  .qh-btn:focus-visible, .qh-seg button:focus-visible, .qh-menu:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  .qh-spin { animation: qhSpin .8s linear infinite; }
  @keyframes qhSpin { to { transform: rotate(360deg); } }
  .qh-grow { flex: 1; min-width: 0; }
  .qh-time { display: inline-flex; align-items: center; gap: 6px; font: 500 11px 'IBM Plex Mono', monospace; color: #545E6E; }

  .qh-range-pop { width: 430px !important; max-width: calc(100vw - 32px) !important; padding: 14px !important; background: #11151F !important; border: 1px solid #212836 !important; border-radius: 14px !important; box-shadow: 0 24px 60px -20px rgba(0,0,0,.95) !important; z-index: 3000 !important; }

  @media (max-width: 1500px) { .qh-stats .opt { display: none; } }
  @media (max-width: 1280px) { .qh-quote { grid-template-columns: auto auto minmax(0,1fr); } .qh-stats { display: none; } }
  @media (max-width: 1100px) { .qh-menu { display: inline-flex; } }
  @media (max-width: 860px) { .qh-quote { grid-template-columns: 1fr; padding: 12px 14px; } .qh-price { padding-left: 0; border-left: 0; } .qh-time { display: none; } }
  @media (max-width: 640px) { .qh-bar { padding: 8px; } .qh-seg { max-width: 100%; overflow-x: auto; } .qh-range-pop { width: calc(100vw - 16px) !important; max-width: 340px !important; } }
  @media (prefers-reduced-motion: reduce) { .qh-spin { animation: none; } .qh-px, .qh-track i { transition: none; } }
`;

export default function QuoteHeader({
  symbol, displayName, hasData = true, interval, onIntervalChange, displayTz, lastBarTime,
  onRefresh, isRefreshing, onToggleFullscreen, isFullscreen, onOpenWatchlist,
  from, to, onRangeChange, presets = [], activePreset = null, onPreset,
}) {
  const { data, isLoading } = useMarketQuote(symbol, { enabled: !!symbol && hasData });
  const [rangeOpen, setRangeOpen] = useState(false);

  const price = data?.price != null ? Number(data.price) : null;
  const change = data?.change != null ? Number(data.change) : null;
  const pct = data?.changePct != null ? Number(data.changePct) : null;
  const loading = isLoading && !data;
  const dir = change == null ? 'is-empty' : change >= 0 ? 'is-up' : 'is-down';
  const Arrow = (change ?? 0) >= 0 ? ArrowUp : ArrowDown;
  const chartTime = formatChartTime(lastBarTime, interval, displayTz);
  const short = (v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

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

  const stats = [
    { k: 'Open', v: fmt(data?.open), show: data?.open != null },
    { k: 'Prev close', v: fmt(data?.previousClose), show: data?.previousClose != null, opt: true },
    { k: 'Volume', v: compact(data?.volume), show: compact(data?.volume) != null, opt: true },
  ].filter((s) => s.show);

  const stateOpen = /open|regular/i.test(String(data?.marketState || ''));
  const rangeLabel = from && to ? `${short(from)} – ${short(to)}` : 'Pick dates';

  return (
    <>
      <style>{CSS}</style>
      <div className="qh">
        <div className="qh-quote">
          <div className="qh-id">
            <button type="button" className="qh-menu" onClick={onOpenWatchlist} aria-label="Open watchlist"><Menu size={15} /></button>
            <SymbolIcon symbol={symbol} size={34} />
            <div className="qh-names">
              <span className="qh-code">{symbol}</span>
              <div className="qh-sub">
                {displayName && <span>{displayName}</span>}
                {data?.exchange && <span>{data.exchange}</span>}
                {data?.marketState && <span className={`qh-badge${stateOpen ? ' is-open' : ''}`}><i />{String(data.marketState).toLowerCase()}</span>}
              </div>
            </div>
          </div>

          <div className="qh-price" aria-live="polite">
            <span className={`qh-px ${loading || change == null ? '' : dir}${flash ? ` flash-${flash}` : ''}`}>{loading ? '—' : fmt(price)}</span>
            <span className={`qh-chg ${dir}`}>
              {change != null ? (
                <span className="qh-chg-pill">
                  <Arrow size={11} strokeWidth={3} />{fmt(Math.abs(change))} ({pct != null ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` : '—'})
                </span>
              ) : loading ? 'Fetching quote…' : '—'}
            </span>
          </div>

          <div className="qh-gauge">
            {hasGauge ? (
              <>
                <div className="qh-gauge-lbl"><span>Day low <b>{fmt(lo)}</b></span><span>Day high <b>{fmt(hi)}</b></span></div>
                <div className="qh-track" role="img" aria-label={`Price is ${Math.round(gaugePos)}% of the way from day low to day high`}><i style={{ left: `${gaugePos}%` }} /></div>
              </>
            ) : null}
          </div>

          <div className="qh-stats">
            {stats.map((s) => (
              <div key={s.k} className={`qh-stat${s.opt ? ' opt' : ''}`}><em>{s.k}</em><b>{s.v}</b></div>
            ))}
          </div>
        </div>

        <div className="qh-bar">
          <div className="qh-seg" role="group" aria-label="Timeframe">
            {INTERVALS.map((tf) => (
              <button key={tf.id} type="button" className={tf.id === interval ? 'is-active' : ''} aria-pressed={tf.id === interval} onClick={() => onIntervalChange?.(tf.id)}>{tf.label}</button>
            ))}
          </div>

          {presets.length > 0 && (
            <div className="qh-seg soft" role="group" aria-label="Date range">
              {presets.map((p) => (
                <button key={p.id} type="button" className={activePreset === p.id ? 'is-active' : ''} aria-pressed={activePreset === p.id} onClick={() => onPreset?.(p)}>{p.label}</button>
              ))}
            </div>
          )}

          <Popover open={rangeOpen} onOpenChange={setRangeOpen}>
            <PopoverTrigger asChild>
              <button type="button" className={`qh-btn${activePreset === 'custom' ? ' is-on' : ''}`}><CalendarIcon size={12} />{rangeLabel}</button>
            </PopoverTrigger>
            <PopoverContent align="start" sideOffset={8} className="qh-range-pop">
              <RangeCalendar
                initialFrom={from}
                initialTo={to}
                onApply={(f, t) => {
                  // Full-day boundaries so single-day picks aren't dropped by `time <= to`.
                  const a = new Date(f); a.setHours(0, 0, 0, 0);
                  const b = new Date(t); b.setHours(23, 59, 59, 999);
                  onRangeChange(a, b);
                  setRangeOpen(false);
                }}
                onClear={() => { onRangeChange(null, null); setRangeOpen(false); }}
              />
            </PopoverContent>
          </Popover>

          <span className="qh-grow" />

          {chartTime && <span className="qh-time" title="Time of the last candle"><Clock size={11} />Last candle {chartTime}</span>}
          {onRefresh && (
            <button type="button" className="qh-btn sq" onClick={onRefresh} disabled={isRefreshing} aria-label="Refresh (R)" title="Refresh (R)">
              <RefreshCw size={13} className={isRefreshing ? 'qh-spin' : ''} />
            </button>
          )}
          {onToggleFullscreen && (
            <button type="button" className="qh-btn sq" onClick={onToggleFullscreen} aria-label={isFullscreen ? 'Exit fullscreen (F)' : 'Fullscreen (F)'} title="Fullscreen (F)">
              {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          )}
        </div>
      </div>
    </>
  );
}