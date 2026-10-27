import {
  ArrowDown,
  ArrowUp,
  Clock,
  Maximize2,
  Minimize2,
  RefreshCw,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { useMarketQuote } from '@/shared/api/marketData';
import { SymbolIcon } from '@/shared/symbols';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/shared/ui/popover';
import RangeCalendar from './RangeCalendar';

const INTERVALS = [
  { id: '1m',  label: '1M' },
  { id: '5m',  label: '5M' },
  { id: '15m', label: '15M' },
  { id: '1h',  label: '1H' },
  { id: '4h',  label: '4H' },
  { id: '1d',  label: '1D' },
];

function fmtPrice(n, decimals = 2) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: 4 });
}

function formatChartTime(lastBarTime, interval, tz) {
  if (lastBarTime == null) return null;
  const safeTz = tz || undefined;
  if (interval === '1d') {
    const d = new Date(`${lastBarTime}T00:00:00`);
    if (Number.isNaN(d.getTime())) return String(lastBarTime);
    return d.toLocaleDateString('en-US', { timeZone: safeTz, month: 'short', day: 'numeric', year: 'numeric' });
  }
  const d = new Date(Number(lastBarTime) * 1000);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-US', { timeZone: safeTz, month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

const CSS = `
  .qh2-root {
    position: relative; display: flex; flex-wrap: wrap; align-items: center; gap: 14px 20px;
    padding: 14px 20px; border-radius: 16px;
    background: linear-gradient(180deg, rgba(20,25,35,.72), rgba(12,16,23,.55));
    border: 1px solid rgba(255,255,255,.085); backdrop-filter: blur(14px) saturate(140%);
    color: #E7E9EE; font-family: Inter, sans-serif; flex-shrink: 0;
  }
  .qh2-left { display: flex; align-items: center; gap: 11px; flex-shrink: 0; min-width: 0; }
  .qh2-symbol-block { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .qh2-symbol-row { display: flex; align-items: baseline; gap: 8px; min-width: 0; }
  .qh2-code { font-family: 'IBM Plex Mono', monospace; font-size: 15px; font-weight: 800; color: #FFFFFF; letter-spacing: .02em; line-height: 1; white-space: nowrap; }
  .qh2-label { font-size: 11px; color: #8892A3; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px; }
  .qh2-meta { display: flex; align-items: center; gap: 6px; font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #545E6E; }
  .qh2-badge { display: inline-flex; align-items: center; padding: 1px 6px; border-radius: 99px; background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); text-transform: uppercase; font-weight: 700; font-size: 9px; }

  .qh2-price-block { display: flex; align-items: baseline; gap: 8px; padding-left: 18px; border-left: 1px solid rgba(255,255,255,.06); flex-shrink: 0; }
  .qh2-price { font-family: 'IBM Plex Mono', monospace; font-size: 15px; font-weight: 800; color: #E7E9EE; }
  .qh2-price.is-up { color: #35C4A1; }
  .qh2-price.is-down { color: #FF5C5C; }
  .qh2-change { display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; border-radius: 99px; font-family: 'IBM Plex Mono', monospace; font-size: 10px; font-weight: 700; }
  .qh2-change.is-up { color: #35C4A1; background: rgba(53,196,161,.08); border: 1px solid rgba(53,196,161,.24); }
  .qh2-change.is-down { color: #FF5C5C; background: rgba(255,92,92,.08); border: 1px solid rgba(255,92,92,.24); }
  .qh2-change.is-empty { color: #545E6E; background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.06); }

  .qh2-tf { display: inline-flex; align-items: center; gap: 2px; padding: 3px; border-radius: 8px; background: rgba(0,0,0,.32); border: 1px solid rgba(255,255,255,.06); flex-shrink: 0; }
  .qh2-tf-btn { min-width: 34px; padding: 5px 9px; border-radius: 5px; border: none; background: transparent; color: #8892A3; font-family: 'IBM Plex Mono', monospace; font-size: 10px; font-weight: 700; cursor: pointer; }
  .qh2-tf-btn:hover:not(.is-active) { color: #E7E9EE; background: rgba(255,255,255,.045); }
  .qh2-tf-btn.is-active { background: linear-gradient(135deg, var(--accent), var(--accent-2)); color: #0D1117; box-shadow: 0 4px 10px -6px var(--accent); }

  .qh2-right-group { margin-left: auto; display: flex; align-items: center; gap: 10px; flex-shrink: 0; flex-wrap: wrap; }
  .qh2-time { display: inline-flex; align-items: center; gap: 6px; padding: 6px 11px; border-radius: 7px; background: rgba(0,0,0,.28); border: 1px solid rgba(255,255,255,.06); font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #8892A3; white-space: nowrap; }
  .qh2-time-tag { padding: 1px 5px; border-radius: 3px; background: color-mix(in srgb, var(--accent) 10%, transparent); border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent); color: var(--accent); font-size: 8.5px; font-weight: 700; }

  .qh2-actions { display: inline-flex; gap: 6px; align-items: center; padding-left: 8px; border-left: 1px solid rgba(255,255,255,.06); }
  .qh2-action-btn { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 8px; border: 1px solid rgba(255,255,255,.10); background: rgba(255,255,255,.03); color: #8892A3; cursor: pointer; transition: all .2s; }
  .qh2-action-btn:hover { color: var(--accent); border-color: var(--accent-soft2); background: color-mix(in srgb, var(--accent) 8%, transparent); }
  .qh2-spin { animation: qh2SpinBtn .8s linear infinite; }
  @keyframes qh2SpinBtn { to { transform: rotate(360deg); } }

  .qh2-range-btn { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,.1); background: rgba(255,255,255,.03); color: #8892A3; font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 600; cursor: pointer; transition: all .2s; }
  .qh2-range-btn:hover { color: var(--accent); border-color: var(--accent-soft2); background: color-mix(in srgb, var(--accent) 6%, transparent); }
  .qh2-range-pop { padding: 14px !important; background: #11151F !important; border: 1px solid #212836 !important; border-radius: 14px !important; box-shadow: 0 24px 60px -20px rgba(0,0,0,.95) !important; z-index: 3000 !important; }
`;

export default function QuoteHeader({
  symbol, displayName, interval, onIntervalChange, displayTz, lastBarTime,
  onRefresh, isRefreshing, onToggleFullscreen, isFullscreen,
  from, to, onRangeChange,
}) {
  const { data, isLoading } = useMarketQuote(symbol, { enabled: !!symbol });

  if (isLoading && !data) {
    return (
      <>
        <style>{CSS}</style>
        <div className="qh2-root" style={{ opacity: 0.7 }}>
          <div className="qh2-left">
            <SymbolIcon symbol={symbol} size={26} />
            <div className="qh2-symbol-block">
              <div className="qh2-symbol-row">
                <span className="qh2-code">{symbol}</span>
                <span className="qh2-label">Fetching quote…</span>
              </div>
            </div>
          </div>
          
          <div className="qh2-price-block">
            <span className="qh2-price" style={{ color: 'var(--ink-3)' }}>—</span>
            <span className="qh2-change is-empty">—</span>
          </div>

          {onIntervalChange && (
            <div className="qh2-tf">
              {INTERVALS.map((tf) => (
                <button 
                  key={tf.id} 
                  className={`qh2-tf-btn${tf.id === interval ? ' is-active' : ''}`} 
                  onClick={() => onIntervalChange(tf.id)}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          )}

          <div className="qh2-right-group" style={{ marginLeft: 'auto' }} />
        </div>
      </>
    );
  }

  const price = data?.price ?? null;
  const change = data?.change ?? null;
  const changePct = data?.changePct ?? null;
  const up = (change ?? 0) >= 0;
  const dirClass = up ? 'is-up' : 'is-down';
  const Arrow = up ? ArrowUp : ArrowDown;
  const pctLabel = changePct != null ? `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%` : '—';
  const chartTime = formatChartTime(lastBarTime, interval, displayTz);

  const fromLabel = from ? new Date(from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Default';
  const toLabel = to ? new Date(to).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Now';

  return (
    <>
      <style>{CSS}</style>
      <div className="qh2-root">
        <div className="qh2-left">
          <SymbolIcon symbol={symbol} size={26} />
          <div className="qh2-symbol-block">
            <div className="qh2-symbol-row">
              <span className="qh2-code">{symbol}</span>
              {displayName && <span className="qh2-label">{displayName}</span>}
            </div>
            {(data?.exchange || data?.marketState) && (
              <div className="qh2-meta">
                {data.exchange && <span>{data.exchange}</span>}
                {data.marketState && <span className="qh2-badge">{data.marketState}</span>}
              </div>
            )}
          </div>
        </div>

        <div className="qh2-price-block">
          <span className={`qh2-price ${dirClass}`}>{fmtPrice(price)}</span>
          <span className={`qh2-change ${change != null ? dirClass : 'is-empty'}`}>
            {change != null ? <><Arrow size={9} strokeWidth={3} />{fmtPrice(Math.abs(change))}<span style={{ opacity: .5 }}>·</span>{pctLabel}</> : '—'}
          </span>
        </div>

        {onIntervalChange && (
          <div className="qh2-tf">
            {INTERVALS.map((tf) => (
              <button key={tf.id} className={`qh2-tf-btn${tf.id === interval ? ' is-active' : ''}`} onClick={() => onIntervalChange(tf.id)}>
                {tf.label}
              </button>
            ))}
          </div>
        )}

        <div className="qh2-right-group">
          {chartTime && (
            <div className="qh2-time" title="Time of last candle">
              <Clock size={10} /><span>{chartTime}</span>
              {interval !== '1d' && <span className="qh2-time-tag">DELAYED</span>}
            </div>
          )}

          <Popover>
            <PopoverTrigger asChild>
              <button className="qh2-range-btn">
                <CalendarIcon size={11} />
                {fromLabel} – {toLabel}
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" sideOffset={8} className="qh2-range-pop">
              <RangeCalendar 
                initialFrom={from} 
                initialTo={to} 
                onApply={(f, t) => onRangeChange(f, t)} 
                onClose={() => document.body.click()} 
              />
            </PopoverContent>
          </Popover>

          <div className="qh2-actions">
            {onRefresh && (
              <button className="qh2-action-btn" onClick={onRefresh} disabled={isRefreshing}>
                <RefreshCw size={13} className={isRefreshing ? 'qh2-spin' : ''} />
              </button>
            )}
            {onToggleFullscreen && (
              <button className="qh2-action-btn" onClick={onToggleFullscreen}>
                {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}