import { fmtDateTime } from '../../lib/time';

const fmtPrice = (n, d = 2) => (n == null || Number.isNaN(Number(n)) ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: Math.max(d, 4) }));

export default function ReplayStatus({ symbol, baseInterval, barCount, idx, tz, loading, loaded, filling, currentBar, open, pending = 0, ohlc, viewInterval, precision = 2 }) {
  const chg = ohlc ? Number(ohlc.close) - Number(ohlc.open) : 0;
  const pct = ohlc && Number(ohlc.open) ? (chg / Number(ohlc.open)) * 100 : 0;
  const cls = chg >= 0 ? 'is-up' : 'is-down';
  return (
    <div className="rp-status">
      <span><b>{symbol}</b> · {(viewInterval || baseInterval).toUpperCase()} base</span>
      {ohlc && (
        <>
          {['open', 'high', 'low', 'close'].map((k) => (
            <span key={k} className="rp-st-ohlc"><em>{k[0].toUpperCase()}</em><b>{fmtPrice(ohlc[k], precision)}</b></span>
          ))}
          <span className={cls}>{chg >= 0 ? '+' : ''}{fmtPrice(chg, precision)} ({pct >= 0 ? '+' : ''}{pct.toFixed(2)}%)</span>
        </>
      )}
      <span>{loading ? `Loading… ${loaded.toLocaleString()} bars` : `${(idx + 1).toLocaleString()} / ${barCount.toLocaleString()} bars`}</span>
      {filling && <span className="is-warn">Market data still filling — more bars may appear</span>}
      <span className="rp-grow" />
      {pending > 0 && <span className="is-open">{pending} pending order{pending === 1 ? '' : 's'}</span>}
      {open > 0 && <span className="is-open">{open} open position{open === 1 ? '' : 's'}</span>}
      <span>{currentBar ? fmtDateTime(currentBar.utc * 1000, tz) : '—'}</span>
      <span>{tz}</span>
    </div>
  );
}
