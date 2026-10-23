import {
  ArrowDown,
  ArrowUp,
  Clock,
  Maximize2,
  Minimize2,
  RefreshCw,
} from 'lucide-react';
import { useMarketQuote } from '@/shared/api/marketData';
import { SymbolIcon } from '@/shared/symbols';

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
  return Number(n).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: 4,
  });
}

// Chart-relative time: mirrors the last candle's time so that when the
// data feed is delayed, the display is delayed too (never shows fake "now").
function formatChartTime(lastBarTime, interval, tz) {
  if (lastBarTime == null) return null;

  const safeTz = tz || undefined; // undefined => browser TZ (fallback)

  if (interval === '1d') {
    const d = new Date(`$${lastBarTime}T00:00:00`);
    if (Number.isNaN(d.getTime())) return String(lastBarTime);
    try {
      return d.toLocaleDateString('en-US', {
        timeZone: safeTz,
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return d.toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      });
    }
  }

  const d = new Date(Number(lastBarTime) * 1000);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return d.toLocaleString('en-US', {
      timeZone: safeTz,
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return d.toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: false,
    });
  }
}
const CSS = `
  .qh2-root {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 14px 20px;
    padding: 14px 20px;
    border-radius: 16px;
    background:
      radial-gradient(600px 200px at 0% 0%,
        color-mix(in srgb, var(--accent) 5%, transparent), transparent 65%),
      linear-gradient(180deg, rgba(20,25,35,.72), rgba(12,16,23,.55));
    border: 1px solid rgba(255,255,255,.085);
    backdrop-filter: blur(14px) saturate(140%);
    -webkit-backdrop-filter: blur(14px) saturate(140%);
    box-shadow:
      0 20px 50px -30px rgba(0,0,0,.9),
      inset 0 1px 0 rgba(255,255,255,.03);
    color: #E7E9EE;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    flex-shrink: 0;
  }
  .qh2-root::before {
    content: '';
    position: absolute;
    left: 14px; right: 14px; top: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 40%, transparent), transparent);
    pointer-events: none;
  }

  /* ---------- 1. SYMBOL INFO ---------- */
  .qh2-left {
    display: flex;
    align-items: center;
    gap: 11px;
    flex-shrink: 0;
    min-width: 0;
  }
  .qh2-symbol-block {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }
  .qh2-symbol-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
  }
  .qh2-code {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 15px;
    font-weight: 800;
    color: #FFFFFF;
    letter-spacing: .02em;
    line-height: 1;
    white-space: nowrap;
  }
  .qh2-label {
    font-size: 11px;
    color: #8892A3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 140px;
  }
  .qh2-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    letter-spacing: .02em;
    color: #545E6E;
  }
  .qh2-badge {
    display: inline-flex;
    align-items: center;
    padding: 1px 6px;
    border-radius: 99px;
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.08);
    text-transform: uppercase;
    font-weight: 700;
    font-size: 9px;
    letter-spacing: .08em;
  }

  /* ---------- 2. PRICE + CHANGE ---------- */
  .qh2-price-block {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding-left: 18px;
    border-left: 1px solid rgba(255,255,255,.06);
    flex-shrink: 0;
    min-width: 0;
  }
  .qh2-price {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 15px;
    font-weight: 800;
    letter-spacing: -.01em;
    line-height: 1;
    color: #E7E9EE;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .qh2-price.is-up   { color: #35C4A1; }
  .qh2-price.is-down { color: #FF5C5C; }

  .qh2-change {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    padding: 2px 8px;
    border-radius: 99px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .02em;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .qh2-change.is-up {
    color: #35C4A1;
    background: rgba(53,196,161,.08);
    border: 1px solid rgba(53,196,161,.24);
  }
  .qh2-change.is-down {
    color: #FF5C5C;
    background: rgba(255,92,92,.08);
    border: 1px solid rgba(255,92,92,.24);
  }
  .qh2-change.is-empty {
    color: #545E6E;
    background: rgba(255,255,255,.03);
    border: 1px solid rgba(255,255,255,.06);
  }

  /* ---------- 3. TF SELECTOR ---------- */
  .qh2-tf {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 3px;
    border-radius: 8px;
    background: rgba(0,0,0,.32);
    border: 1px solid rgba(255,255,255,.06);
    flex-shrink: 0;
  }
  .qh2-tf-btn {
    min-width: 34px;
    padding: 5px 9px;
    border-radius: 5px;
    border: none;
    background: transparent;
    color: #8892A3;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .04em;
    cursor: pointer;
    transition: color .15s ease, background-color .15s ease, box-shadow .15s ease;
    white-space: nowrap;
  }
  .qh2-tf-btn:hover:not(.is-active) {
    color: #E7E9EE;
    background: rgba(255,255,255,.045);
  }
  .qh2-tf-btn.is-active {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    box-shadow:
      0 4px 10px -6px color-mix(in srgb, var(--accent) 60%, transparent),
      inset 0 1px 0 rgba(255,255,255,.4);
  }
  .qh2-tf-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent);
  }

  /* ---------- 4. RIGHT GROUP: time + actions ---------- */
  .qh2-right-group {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .qh2-time {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 11px;
    border-radius: 7px;
    background: rgba(0,0,0,.28);
    border: 1px solid rgba(255,255,255,.06);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .02em;
    color: #8892A3;
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    flex-shrink: 0;
  }
  .qh2-time svg {
    color: #545E6E;
    flex-shrink: 0;
  }
  .qh2-time-tag {
    padding: 1px 5px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--accent) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent);
    color: var(--accent);
    font-size: 8.5px;
    font-weight: 700;
    letter-spacing: .08em;
    text-transform: uppercase;
    line-height: 1.3;
  }

  /* ---------- ACTION BUTTONS (refresh + fullscreen) ---------- */
  .qh2-actions {
    display: inline-flex;
    gap: 6px;
    align-items: center;
    padding-left: 8px;
    margin-left: 4px;
    border-left: 1px solid rgba(255,255,255,.06);
    flex-shrink: 0;
  }
  .qh2-action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,.10);
    background: rgba(255,255,255,.03);
    color: #8892A3;
    cursor: pointer;
    transition: all .2s cubic-bezier(.2,.8,.25,1);
    flex-shrink: 0;
  }
  .qh2-action-btn:hover:not(:disabled) {
    color: var(--accent);
    border-color: var(--accent-soft2);
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    transform: translateY(-1px);
  }
  .qh2-action-btn:disabled {
    opacity: .45;
    cursor: not-allowed;
    transform: none;
  }
  .qh2-action-btn:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 22%, transparent);
  }
  .qh2-spin { animation: qh2SpinBtn .8s linear infinite; }
  @keyframes qh2SpinBtn { to { transform: rotate(360deg); } }

  /* ---------- Loading / Empty ---------- */
  .qh2-loading {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    border-radius: 16px;
    background: linear-gradient(180deg, rgba(20,25,35,.72), rgba(12,16,23,.55));
    border: 1px solid rgba(255,255,255,.085);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    color: #8892A3;
  }
  .qh2-loading-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,.08);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: qh2SpinLoad .8s linear infinite;
    flex-shrink: 0;
  }
  @keyframes qh2SpinLoad { to { transform: rotate(360deg); } }

  /* ---------- Responsive ---------- */
  @media (max-width: 1280px) {
    .qh2-root { gap: 12px 16px; padding: 12px 16px; }
    .qh2-price-block { padding-left: 14px; }
  }
  @media (max-width: 768px) {
    .qh2-root { flex-direction: column; align-items: stretch; gap: 12px; }
    .qh2-price-block { padding-left: 0; border-left: none; border-top: 1px solid rgba(255,255,255,.06); padding-top: 10px; }
    .qh2-right-group { margin-left: 0; justify-content: flex-start; }
    .qh2-tf { align-self: flex-start; }
    .qh2-actions { border-left: none; padding-left: 0; margin-left: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .qh2-tf-btn, .qh2-action-btn { transition: none !important; }
    .qh2-loading-spinner, .qh2-spin { animation-duration: 2s; }
  }
`;

export default function QuoteHeader({
  symbol,
  displayName,
  interval,
  onIntervalChange,
  displayTz,
  lastBarTime,
  onRefresh,
  isRefreshing = false,
  onToggleFullscreen,
  isFullscreen = false,
}) {
  const { data, isLoading } = useMarketQuote(symbol, { enabled: !!symbol });

  if (isLoading && !data) {
    return (
      <>
        <style>{CSS}</style>
        <div className="qh2-loading">
          <span className="qh2-loading-spinner" />
          <span>Loading quote for {symbol}…</span>
        </div>
      </>
    );
  }

  if (!data) {
    return (
      <>
        <style>{CSS}</style>
        <div className="qh2-loading">
          <span>No quote data available for {symbol}.</span>
        </div>
      </>
    );
  }

  const price = data.price ?? null;
  const change = data.change ?? null;
  const changePct = data.changePct ?? null;
  const up = (change ?? 0) >= 0;
  const dirClass = up ? 'is-up' : 'is-down';
  const Arrow = up ? ArrowUp : ArrowDown;
  const pctLabel =
    changePct != null
      ? `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`
      : '—';

  const chartTime = formatChartTime(lastBarTime, interval, displayTz);
  const isDelayed = interval !== '1d';

  return (
    <>
      <style>{CSS}</style>
      <div className="qh2-root">

        {/* 1. SYMBOL INFO */}
        <div className="qh2-left">
          <SymbolIcon symbol={symbol} size={26} />
          <div className="qh2-symbol-block">
            <div className="qh2-symbol-row">
              <span className="qh2-code">{symbol}</span>
              {displayName && <span className="qh2-label">{displayName}</span>}
            </div>
            {(data.exchange || data.marketState) && (
              <div className="qh2-meta">
                {data.exchange && <span>{data.exchange}</span>}
                {data.marketState && (
                  <span className="qh2-badge">{data.marketState}</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 2. PRICE + CHANGE */}
        <div className="qh2-price-block">
          <span className={`qh2-price ${dirClass}`}>{fmtPrice(price)}</span>
          <span className={`qh2-change ${change != null ? dirClass : 'is-empty'}`}>
            {change != null ? (
              <>
                <Arrow size={9} strokeWidth={3} />
                {fmtPrice(Math.abs(change))}
                <span style={{ opacity: .5 }}>·</span>
                {pctLabel}
              </>
            ) : (
              '—'
            )}
          </span>
        </div>

        {/* 3. TF SELECTOR */}
        {onIntervalChange && (
          <div className="qh2-tf" role="tablist" aria-label="Timeframe">
            {INTERVALS.map((tf) => (
              <button
                key={tf.id}
                type="button"
                role="tab"
                aria-selected={tf.id === interval}
                className={`qh2-tf-btn${tf.id === interval ? ' is-active' : ''}`}
                onClick={() => onIntervalChange(tf.id)}
              >
                {tf.label}
              </button>
            ))}
          </div>
        )}

        {/* 4. RIGHT GROUP: time + actions */}
        <div className="qh2-right-group">
          {chartTime && (
            <div
              className="qh2-time"
              title="Time of the last candle in the chart — reflects data delay"
            >
              <Clock size={10} />
              <span>As of {chartTime}</span>
              {isDelayed && <span className="qh2-time-tag">Delayed</span>}
            </div>
          )}

          <div className="qh2-actions">
            {onRefresh && (
              <button
                type="button"
                className="qh2-action-btn"
                onClick={onRefresh}
                disabled={isRefreshing}
                title="Refresh chart"
                aria-label="Refresh chart"
              >
                <RefreshCw
                  size={13}
                  className={isRefreshing ? 'qh2-spin' : ''}
                />
              </button>
            )}
            {onToggleFullscreen && (
              <button
                type="button"
                className="qh2-action-btn"
                onClick={onToggleFullscreen}
                aria-pressed={isFullscreen}
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
              </button>
            )}
          </div>
        </div>

      </div>
    </>
  );
}
