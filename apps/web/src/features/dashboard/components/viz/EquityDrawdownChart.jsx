import { useId, useMemo, useState } from 'react';
import { useElementSize } from './useElementSize';
import { makeFmt, fmtCompact, shortDate } from './format';
import { clamp, niceTicks, pathFrom, sampleIndices } from './utils';

const M = { l: 58, r: 16, t: 12, b: 24 };

/** Equity curve with a drawdown strip underneath. Pure SVG, fully responsive. */
export default function EquityDrawdownChart({ equity, isMoney, range = 'all' }) {
  const uid = useId().replace(/:/g, '');
  const [ref, { width, height }] = useElementSize();
  const [hover, setHover] = useState(null);
  const fmt = makeFmt(isMoney);

  const model = useMemo(() => {
    const all = equity || [];
    if (!all.length) return null;

    let pts;
    if (range === 'all') {
      pts = [{ x: all[0].x, y: 0, n: 0 }, ...all.map((p, i) => ({ x: p.x, y: p.y, n: i + 1 }))];
    } else {
      const offset = Math.max(0, all.length - range);
      pts = all.slice(offset).map((p, i) => ({ x: p.x, y: p.y, n: offset + i + 1 }));
    }

    let peak = -Infinity;
    let lo = Infinity;
    let hi = -Infinity;
    let ddMin = 0;
    const dd = pts.map((p) => {
      peak = Math.max(peak, p.y);
      lo = Math.min(lo, p.y);
      hi = Math.max(hi, p.y);
      const d = p.y - peak;
      ddMin = Math.min(ddMin, d);
      return d;
    });
    const span = hi - lo || 1;
    return { pts, dd, lo: lo - span * 0.08, hi: hi + span * 0.08, ddMin: ddMin > -1e-9 ? -span * 0.1 : ddMin };
  }, [equity, range]);

  const geo = useMemo(() => {
    if (!model || width < 80 || height < 80) return null;
    const { pts, dd, lo, hi, ddMin } = model;
    const N = pts.length;
    const innerW = Math.max(10, width - M.l - M.r);
    const innerH = Math.max(10, height - M.t - M.b);
    const showDD = innerH >= 170;
    const gap = 14;
    const ddH = showDD ? Math.round(innerH * 0.24) : 0;
    const eqH = innerH - (showDD ? ddH + gap : 0);

    const x = (i) => M.l + (N === 1 ? innerW / 2 : (i / (N - 1)) * innerW);
    const yEq = (v) => M.t + eqH - ((v - lo) / (hi - lo)) * eqH;
    const ddTop = M.t + eqH + gap;
    const yDD = (v) => ddTop + (v / ddMin) * ddH;

    const idx = sampleIndices(N, innerW * 1.2);
    const eqLine = pathFrom(idx.map((i) => [x(i), yEq(pts[i].y)]));
    const base = M.t + eqH;
    const eqArea = `${eqLine}L${x(idx[idx.length - 1]).toFixed(1)},${base}L${x(idx[0]).toFixed(1)},${base}Z`;
    const ddLine = showDD ? pathFrom(idx.map((i) => [x(i), yDD(dd[i])])) : '';
    const ddArea = showDD ? `${ddLine}L${x(idx[idx.length - 1]).toFixed(1)},${ddTop}L${x(idx[0]).toFixed(1)},${ddTop}Z` : '';

    const yTicks = niceTicks(lo, hi, eqH > 200 ? 5 : 3).filter((t) => t >= lo && t <= hi);
    const xLabelCount = innerW > 520 ? 5 : innerW > 300 ? 4 : 3;
    const xLabels = Array.from({ length: xLabelCount }, (_, k) => Math.round((k * (N - 1)) / (xLabelCount - 1)));

    return { N, innerW, innerH, showDD, eqH, ddH, ddTop, x, yEq, yDD, eqLine, eqArea, ddLine, ddArea, yTicks, xLabels, base };
  }, [model, width, height]);

  const onMove = (e) => {
    if (!geo) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - rect.left - M.l) / geo.innerW) * (geo.N - 1));
    setHover(clamp(i, 0, geo.N - 1));
  };

  const hp = hover != null && model ? model.pts[hover] : null;
  const last = model ? model.pts[model.pts.length - 1] : null;

  return (
    <div ref={ref} className="vz-wrap">
      {!model && <div className="pc-empty"><b>No equity data yet</b></div>}
      {model && geo && (
        <>
          <svg
            className="vz-svg"
            width={width}
            height={height}
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          >
            <defs>
              <linearGradient id={`eq${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--accent)" stopOpacity=".34" />
                <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
              <linearGradient id={`dd${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--d-loss)" stopOpacity=".04" />
                <stop offset="1" stopColor="var(--d-loss)" stopOpacity=".34" />
              </linearGradient>
            </defs>

            {geo.yTicks.map((t) => (
              <g key={t}>
                <line className="vz-grid" x1={M.l} x2={M.l + geo.innerW} y1={geo.yEq(t)} y2={geo.yEq(t)} />
                <text className="vz-tick" x={M.l - 10} y={geo.yEq(t)} textAnchor="end" dominantBaseline="middle">
                  {fmtCompact(t, isMoney)}
                </text>
              </g>
            ))}

            {model.lo < 0 && model.hi > 0 && (
              <line className="vz-zero" x1={M.l} x2={M.l + geo.innerW} y1={geo.yEq(0)} y2={geo.yEq(0)} />
            )}

            <path d={geo.eqArea} fill={`url(#eq${uid})`} />
            <path d={geo.eqLine} className="vz-line" />

            {geo.showDD && (
              <g>
                <text className="vz-tick" x={M.l - 10} y={geo.ddTop} textAnchor="end" dominantBaseline="middle">0</text>
                <text className="vz-tick" x={M.l - 10} y={geo.ddTop + geo.ddH} textAnchor="end" dominantBaseline="middle">
                  {fmtCompact(model.ddMin, isMoney)}
                </text>
                <line className="vz-grid" x1={M.l} x2={M.l + geo.innerW} y1={geo.ddTop} y2={geo.ddTop} />
                <path d={geo.ddArea} fill={`url(#dd${uid})`} />
                <path d={geo.ddLine} className="vz-line is-loss" />
              </g>
            )}

            {geo.xLabels.map((i, k) => (
              <text
                key={`${i}-${k}`}
                className="vz-tick"
                x={geo.x(i)}
                y={height - 6}
                textAnchor={k === 0 ? 'start' : k === geo.xLabels.length - 1 ? 'end' : 'middle'}
              >
                {shortDate(model.pts[i].x)}
              </text>
            ))}

            {/* live end-point */}
            {last && hover == null && (
              <g>
                <circle cx={geo.x(geo.N - 1)} cy={geo.yEq(last.y)} r="9" fill="var(--accent)" opacity=".18" className="vz-pulse" />
                <circle cx={geo.x(geo.N - 1)} cy={geo.yEq(last.y)} r="3.5" fill="var(--accent)" />
              </g>
            )}

            {hp && (
              <g pointerEvents="none">
                <line className="vz-cursor" x1={geo.x(hover)} x2={geo.x(hover)} y1={M.t} y2={M.t + geo.innerH} />
                <circle cx={geo.x(hover)} cy={geo.yEq(hp.y)} r="4.5" fill="var(--accent)" stroke="#0A0D14" strokeWidth="2" />
                {geo.showDD && (
                  <circle cx={geo.x(hover)} cy={geo.yDD(model.dd[hover])} r="3.5" fill="var(--d-loss)" stroke="#0A0D14" strokeWidth="2" />
                )}
              </g>
            )}
          </svg>

          {hp && (
            <div
              className="vz-tt"
              style={{ left: clamp(geo.x(hover) + 14, 8, Math.max(8, width - 176)), top: 10 }}
            >
              <div className="vz-tt-title">{hp.n === 0 ? 'Start' : `Trade #${hp.n}`}</div>
              <div className="vz-tt-sub">{shortDate(hp.x)}</div>
              <div className="vz-tt-row"><span>Equity</span><b>{fmt(hp.y)}</b></div>
              <div className="vz-tt-row"><span>Drawdown</span><b className="neg">{fmt(model.dd[hover])}</b></div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
