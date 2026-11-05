import { useMemo, useState } from 'react';
import { fmtCompact, fmtPct } from '@/features/dashboard/components/viz/format';
import { groupRows } from '../lib/analysis';
import { Empty, Seg, fmtPF } from './Card';

const METRICS = [
  { value: 'total', label: 'Net' },
  { value: 'expectancy', label: 'Expectancy' },
  { value: 'winRate', label: 'Win %' },
  { value: 'profitFactor', label: 'Profit factor' },
];

/** Break the filtered trades down by any dimension, ranked by any metric. */
export function EdgeExplorer({ outcomes, dims, fmt }) {
  const [dimId, setDimId] = useState('session');
  const [metric, setMetric] = useState('total');

  const dim = dims.find((d) => d.id === dimId) || dims[0];
  const minN = Math.max(5, Math.ceil(outcomes.length * 0.05));

  const rows = useMemo(
    () => groupRows(outcomes, dim.get, { order: dim.order, natural: dim.natural }),
    [outcomes, dim]
  );

  const finite = (v) => (v === Infinity ? 0 : v);
  const maxAbs = Math.max(1e-9, ...rows.map((r) => Math.abs(finite(r[metric]))));

  const valueText = (r) => {
    if (metric === 'winRate') return fmtPct(r.winRate);
    if (metric === 'profitFactor') return fmtPF(r.profitFactor);
    return fmt(r[metric]);
  };
  const tone = (r) => {
    if (metric === 'winRate') return 'acc';
    if (metric === 'profitFactor') return r.profitFactor >= 1 ? 'pos' : 'neg';
    return r[metric] >= 0 ? 'pos' : 'neg';
  };

  return (
    <div className="ax-explorer">
      <div className="ax-explorer-bar">
        <div className="ax-dims" role="group" aria-label="Break down by">
          {dims.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`ax-dim ${d.id === dim.id ? 'on' : ''}`}
              aria-pressed={d.id === dim.id}
              onClick={() => setDimId(d.id)}
            >
              {d.label}
            </button>
          ))}
        </div>
        <Seg value={metric} options={METRICS} onChange={setMetric} label="Rank by" />
      </div>

      {rows.length === 0 ? (
        <Empty title="Nothing to break down">
          None of the filtered trades have a value for {dim.label}.
        </Empty>
      ) : (
        <div className="ax-xtable" role="table">
          <div className="ax-xrow ax-xhead" role="row">
            <span>{dim.label}</span>
            <span>{METRICS.find((m) => m.value === metric)?.label}</span>
            <span className="ax-r">Trades</span>
            <span className="ax-r ax-xhide">Win %</span>
            <span className="ax-r ax-xhide">PF</span>
            <span className="ax-r ax-xhide">Expectancy</span>
          </div>
          {rows.map((r) => {
            const w = (Math.abs(finite(r[metric])) / maxAbs) * 100;
            const low = r.n < minN;
            return (
              <div
                key={r.key}
                className={`ax-xrow ${low ? 'is-low' : ''}`}
                role="row"
                title={low ? `Only ${r.n} trades, treat with caution` : undefined}
              >
                <span className="ax-xname">{r.key}</span>
                <span className="ax-xbar">
                  <i className="ax-xtrack">
                    <b className={tone(r)} style={{ width: `${Math.max(2, w)}%` }} />
                  </i>
                  <em className={tone(r)}>{valueText(r)}</em>
                </span>
                <span className="ax-r">{r.n}</span>
                <span className="ax-r ax-xhide">{fmtPct(r.winRate, 0)}</span>
                <span className="ax-r ax-xhide">{fmtPF(r.profitFactor)}</span>
                <span className="ax-r ax-xhide">{fmt(r.expectancy)}</span>
              </div>
            );
          })}
          <p className="ax-foot">
            Faded rows have fewer than {minN} trades. Small samples can look like an edge by chance.
          </p>
        </div>
      )}
    </div>
  );
}

/** Day of week x entry hour, coloured by net result. */
export function HourHeatmap({ heatmap, isMoney, fmt }) {
  const [hover, setHover] = useState(null);
  if (!heatmap) return <Empty title="No timing data" />;
  const { hours, days, summary, maxAbs } = heatmap;

  const colour = (total) => {
    const a = 0.16 + 0.7 * (Math.abs(total) / maxAbs);
    return total >= 0 ? `rgba(53,196,161,${a})` : `rgba(255,92,92,${a})`;
  };

  const hv = hover ? summary.get(`${hover.day}|${hover.hour}`) : null;

  return (
    <div className="ax-heat">
      <div
        className="ax-heat-grid"
        style={{ gridTemplateColumns: `44px repeat(${hours.length}, minmax(0, 1fr))` }}
      >
        <span />
        {hours.map((h) => (
          <span key={h} className="ax-heat-col">{String(h).padStart(2, '0')}</span>
        ))}
        {days.map((d) => (
          <HeatRow
            key={d}
            day={d}
            hours={hours}
            summary={summary}
            colour={colour}
            fmt={fmt}
            setHover={setHover}
          />
        ))}
      </div>
      <div className="ax-heat-foot">
        {hv ? (
          <span>
            <b>{hover.day} {String(hover.hour).padStart(2, '0')}:00</b>
            {' '}{hv.n} {hv.n === 1 ? 'trade' : 'trades'}, net {fmt(hv.total)}, {fmtPct(hv.winRate, 0)} win
          </span>
        ) : (
          <span>
            Hover a cell for detail. Color strength shows net result
            ({isMoney ? 'dollars' : 'R'}); blank cells have no trades.
          </span>
        )}
      </div>
    </div>
  );
}

function HeatRow({ day, hours, summary, colour, fmt, setHover }) {
  return (
    <>
      <span className="ax-heat-row">{day}</span>
      {hours.map((h) => {
        const s = summary.get(`${day}|${h}`);
        return s ? (
          <span
            key={h}
            className="ax-heat-cell has"
            style={{ background: colour(s.total) }}
            title={`${day} ${String(h).padStart(2, '0')}:00 - ${s.n} trades, net ${fmt(s.total)}`}
            onPointerEnter={() => setHover({ day, hour: h })}
            onPointerLeave={() => setHover(null)}
          />
        ) : (
          <span key={h} className="ax-heat-cell" />
        );
      })}
    </>
  );
}

/** Distribution of per-trade results. */
export function Histogram({ bins, isMoney }) {
  if (!bins.length) return <Empty title="No trades" />;
  const max = Math.max(...bins.map((b) => b.count), 1);
  const every = bins.length > 8 ? 2 : 1;
  const label = (b) => (b.lo === b.hi ? fmtCompact(b.lo, isMoney) : fmtCompact(b.mid, isMoney));
  return (
    <div className="ax-hist">
      <div className="ax-hist-bars">
        {bins.map((b, i) => (
          <div
            key={i}
            className="ax-hist-col"
            title={`${b.count} ${b.count === 1 ? 'trade' : 'trades'} around ${label(b)}`}
          >
            <span className="ax-hist-n">{b.count}</span>
            <i
              className={b.mid >= 0 ? 'w' : 'l'}
              style={{ height: `${Math.max(3, (b.count / max) * 100)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="ax-hist-axis">
        {bins.map((b, i) => (
          <span key={i}>{i % every === 0 ? label(b) : ''}</span>
        ))}
      </div>
    </div>
  );
}
