import { fmtDateTime } from '../../lib/time';

export default function ReplayStatus({ symbol, baseInterval, barCount, idx, tz, loading, loaded, filling, currentBar, open }) {
  return (
    <div className="rp-status">
      <span><b>{symbol}</b> · {baseInterval.toUpperCase()} base</span>
      <span>{loading ? `Loading… ${loaded.toLocaleString()} bars` : `${(idx + 1).toLocaleString()} / ${barCount.toLocaleString()} bars`}</span>
      {filling && <span className="is-warn">Market data still filling — more bars may appear</span>}
      <span className="rp-grow" />
      {open > 0 && <span className="is-open">{open} open position{open === 1 ? '' : 's'}</span>}
      <span>{currentBar ? fmtDateTime(currentBar.utc * 1000, tz) : '—'}</span>
      <span>{tz}</span>
    </div>
  );
}
