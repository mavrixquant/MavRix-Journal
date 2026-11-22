import { Clock, Loader2 } from 'lucide-react';

const fmtPrice = (n, d = 2) => (n == null || Number.isNaN(Number(n)) ? '—' : Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: Math.max(d, 4) }));
const fmtVol = (n) => (n == null || !Number(n) ? null : Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(Number(n)));

export default function StatusBar({ precision = 2, tz, lastCandle, isLive, loadingOlder, filling, ohlc, symbol, interval, chartType }) {
  const chg = ohlc ? Number(ohlc.close) - Number(ohlc.open) : 0;
  const pct = ohlc && Number(ohlc.open) ? (chg / Number(ohlc.open)) * 100 : 0;
  const cls = chg >= 0 ? 'is-up' : 'is-down';
  const vol = ohlc ? fmtVol(ohlc.volume) : null;
  return (
    <div className="mk-status">
      {ohlc && symbol && (
        <>
          <span className="mk-st mk-st-sym">{symbol}</span>
          {interval && <span className="mk-st mk-st-tf">{interval.toUpperCase()}{chartType === 'ha' ? ' · HA' : ''}</span>}
          {['open', 'high', 'low', 'close'].map((k) => (
            <span key={k} className="mk-st mk-st-ohlc"><em>{k[0].toUpperCase()}</em><b>{fmtPrice(ohlc[k], precision)}</b></span>
          ))}
          <span className={`mk-st ${cls}`}>{chg >= 0 ? '+' : ''}{fmtPrice(chg, precision)} ({pct >= 0 ? '+' : ''}{pct.toFixed(2)}%)</span>
          {vol && <span className="mk-st mk-st-ohlc"><em>Vol</em><b>{vol}</b></span>}
        </>
      )}
      {(loadingOlder || filling) && <span className="mk-st"><Loader2 size={11} className="mk-spin" />{loadingOlder ? 'Loading older history' : 'Syncing'}</span>}
      <span className="mk-grow" />
      {lastCandle && <span className="mk-st mk-st-opt" title="Time of the last candle"><Clock size={11} />Last candle <b>{lastCandle}</b></span>}
      <span className="mk-st mk-st-opt">{tz}</span>
      <span className="mk-st"><i className={`mk-live${isLive ? '' : ' is-hist'}`} />{isLive ? 'Live · refreshes every 60s' : 'Historical range'}</span>
    </div>
  );
}
