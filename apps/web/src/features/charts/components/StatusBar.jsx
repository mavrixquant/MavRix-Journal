import { Clock, Loader2 } from 'lucide-react';

const fmtN = (n, d = 2) => Number(n).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: Math.max(d, 4) });

export default function StatusBar({ barCount, rangeStats, precision = 2, tz, lastCandle, isLive, loadingOlder, filling }) {
  return (
    <div className="mk-status">
      <span className="mk-st">Bars <b>{barCount.toLocaleString()}</b></span>
      {rangeStats && (
        <>
          <span className="mk-st mk-st-opt">High <b>{fmtN(rangeStats.hi, precision)}</b></span>
          <span className="mk-st mk-st-opt">Low <b>{fmtN(rangeStats.lo, precision)}</b></span>
          <span className="mk-st">Range <b className={rangeStats.pct >= 0 ? 'is-up' : 'is-down'}>{rangeStats.pct >= 0 ? '+' : ''}{rangeStats.pct.toFixed(2)}%</b></span>
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
