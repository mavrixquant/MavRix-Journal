// apps/web/src/features/charts/components/ChartToolbar.jsx
//
// Interval selector + live status + fullscreen toggle for the market chart.

import { Maximize2, Minimize2 } from 'lucide-react';

const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'];

export default function ChartToolbar({
  interval,
  onIntervalChange,
  isFullscreen,
  onToggleFullscreen,
  isLoading,
  lastUpdated,
}) {
  return (
    <div className="ct-root">
      <div className="ct-intervals" role="tablist">
        {INTERVALS.map((tf) => (
          <button
            key={tf}
            type="button"
            role="tab"
            aria-selected={tf === interval}
            className={`ct-tf${tf === interval ? ' is-active' : ''}`}
            onClick={() => onIntervalChange(tf)}
          >
            {tf.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="ct-status">
        {isLoading ? (
          <>
            <span className="ct-pulse" />
            <span>Loading…</span>
          </>
        ) : lastUpdated ? (
          <span>
            Updated{' '}
            {new Date(lastUpdated).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
        ) : null}
      </div>

      <button
        type="button"
        className="ct-fs"
        onClick={onToggleFullscreen}
        aria-pressed={isFullscreen}
        title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
      >
        {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        <span>{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
      </button>
    </div>
  );
}