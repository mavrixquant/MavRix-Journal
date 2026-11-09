import { useId, useMemo, useState } from 'react';
import { useElementSize } from './useElementSize';
import { makeFmt, fmtCompact } from './format';
import { clamp, niceTicks, pathFrom, sampleIndices } from './utils';

const M = { l: 52, r: 14, t: 10, b: 22 };

/** Single series line + area with a zero baseline and hover readout. */
export default function LineChart({ values, labels, isMoney }) {
  const uid = useId().replace(/:/g, '');
  const [ref, { width, height }] = useElementSize();
  const [hover, setHover] = useState(null);
  const fmt = makeFmt(isMoney);

  const geo = useMemo(() => {
    if (!values?.length || width < 80 || height < 60) return null;
    const N = values.length;
    let lo = Math.min(...values, 0);
    let hi = Math.max(...values, 0);
    const span = hi - lo || 1;
    lo -= span * 0.1;
    hi += span * 0.1;
    const innerW = width - M.l - M.r;
    const innerH = height - M.t - M.b;
    const x = (i) => M.l + (N === 1 ? innerW / 2 : (i / (N - 1)) * innerW);
    const y = (v) => M.t + innerH - ((v - lo) / (hi - lo)) * innerH;
    const idx = sampleIndices(N, innerW * 1.2);
    const line = pathFrom(idx.map((i) => [x(i), y(values[i])]));
    const zero = y(0);
    const area = `${line}L${x(idx[idx.length - 1]).toFixed(1)},${zero.toFixed(1)}L${x(idx[0]).toFixed(1)},${zero.toFixed(1)}Z`;
    const ticks = niceTicks(lo, hi, innerH > 150 ? 4 : 3).filter((t) => t >= lo && t <= hi);
    return { N, innerW, innerH, x, y, line, area, zero, ticks };
  }, [values, width, height]);

  const onMove = (e) => {
    if (!geo) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setHover(clamp(Math.round(((e.clientX - rect.left - M.l) / geo.innerW) * (geo.N - 1)), 0, geo.N - 1));
  };

  const lastV = values?.length ? values[values.length - 1] : 0;

  return (
    <div ref={ref} className="vz-wrap">
      {geo && (
        <>
          <svg className="vz-svg" width={width} height={height} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
            <defs>
              <linearGradient id={`lc${uid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--accent)" stopOpacity=".28" />
                <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {geo.ticks.map((t) => (
              <g key={t}>
                <line className="vz-grid" x1={M.l} x2={M.l + geo.innerW} y1={geo.y(t)} y2={geo.y(t)} />
                <text className="vz-tick" x={M.l - 9} y={geo.y(t)} textAnchor="end" dominantBaseline="middle">
                  {fmtCompact(t, isMoney)}
                </text>
              </g>
            ))}
            <line className="vz-zero" x1={M.l} x2={M.l + geo.innerW} y1={geo.zero} y2={geo.zero} />
            <path d={geo.area} fill={`url(#lc${uid})`} />
            <path d={geo.line} className="vz-line" />
            <circle cx={geo.x(geo.N - 1)} cy={geo.y(lastV)} r="3.5" fill={lastV >= 0 ? 'var(--d-win)' : 'var(--d-loss)'} />
            {hover != null && (
              <g pointerEvents="none">
                <line className="vz-cursor" x1={geo.x(hover)} x2={geo.x(hover)} y1={M.t} y2={M.t + geo.innerH} />
                <circle cx={geo.x(hover)} cy={geo.y(values[hover])} r="4.5" fill="var(--accent)" stroke="#0A0D14" strokeWidth="2" />
              </g>
            )}
            <text className="vz-tick" x={M.l} y={height - 6} textAnchor="start">{labels?.[0]}</text>
            <text className="vz-tick" x={M.l + geo.innerW} y={height - 6} textAnchor="end">{labels?.[labels.length - 1]}</text>
          </svg>
          {hover != null && (
            <div className="vz-tt" style={{ left: clamp(geo.x(hover) + 14, 8, Math.max(8, width - 150)), top: 8 }}>
              <div className="vz-tt-title">{labels?.[hover]}</div>
              <div className="vz-tt-row"><span>Value</span><b className={values[hover] >= 0 ? 'pos' : 'neg'}>{fmt(values[hover])}</b></div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
