import { useMemo, useState } from 'react';
import { useElementSize } from './useElementSize';
import { makeFmt, fmtCompact } from './format';
import { clamp } from './utils';

const M = { l: 34, r: 10, t: 10, b: 24 };

export function buildBins(values) {
  if (!values.length) return [];
  const rounded = values.map((v) => Math.round(v * 100) / 100);
  const uniq = [...new Set(rounded)].sort((a, b) => a - b);

  // few distinct outcomes (typical for R-multiples): one bar per outcome
  if (uniq.length <= 14) {
    return uniq.map((u) => ({ lo: u, hi: u, mid: u, count: rounded.filter((v) => v === u).length, exact: true }));
  }

  const min = uniq[0];
  const max = uniq[uniq.length - 1];
  const count = clamp(Math.round(Math.sqrt(values.length) * 1.3), 8, 24);
  const step = (max - min) / count || 1;
  const bins = Array.from({ length: count }, (_, i) => ({
    lo: min + i * step,
    hi: min + (i + 1) * step,
    mid: min + (i + 0.5) * step,
    count: 0,
  }));
  values.forEach((v) => {
    bins[clamp(Math.floor((v - min) / step), 0, count - 1)].count += 1;
  });
  return bins;
}

export default function Histogram({ values, isMoney }) {
  const [ref, { width, height }] = useElementSize();
  const [hover, setHover] = useState(null);
  const fmt = makeFmt(isMoney);

  const bins = useMemo(() => buildBins(values || []), [values]);
  const geo = useMemo(() => {
    if (!bins.length || width < 80 || height < 60) return null;
    const maxC = Math.max(...bins.map((b) => b.count), 1);
    const innerW = width - M.l - M.r;
    const innerH = height - M.t - M.b;
    const slot = innerW / bins.length;
    const barW = clamp(slot * 0.78, 3, 40);
    const y = (c) => M.t + innerH - (c / maxC) * innerH;
    const labelEvery = Math.ceil(bins.length / Math.max(2, Math.floor(innerW / 54)));
    return { maxC, innerW, innerH, slot, barW, y, labelEvery };
  }, [bins, width, height]);

  const total = values?.length || 0;
  const hb = hover != null ? bins[hover] : null;

  return (
    <div ref={ref} className="vz-wrap">
      {geo && (
        <>
          <svg className="vz-svg" width={width} height={height} onPointerLeave={() => setHover(null)}>
            {[0, 0.5, 1].map((f) => {
              const c = Math.round(geo.maxC * f);
              return (
                <g key={f}>
                  <line className="vz-grid" x1={M.l} x2={M.l + geo.innerW} y1={geo.y(c)} y2={geo.y(c)} />
                  <text className="vz-tick" x={M.l - 8} y={geo.y(c)} textAnchor="end" dominantBaseline="middle">{c}</text>
                </g>
              );
            })}
            {bins.map((b, i) => {
              const cx = M.l + geo.slot * (i + 0.5);
              const h = Math.max(b.count ? 2 : 0, M.t + geo.innerH - geo.y(b.count));
              const tone = b.mid > 0 ? 'var(--d-win)' : b.mid < 0 ? 'var(--d-loss)' : 'var(--be, #6C7686)';
              return (
                <g key={i} onPointerEnter={() => setHover(i)}>
                  <rect x={cx - geo.slot / 2} y={M.t} width={geo.slot} height={geo.innerH} fill="transparent" />
                  <rect
                    x={cx - geo.barW / 2}
                    y={M.t + geo.innerH - h}
                    width={geo.barW}
                    height={h}
                    rx={Math.min(4, geo.barW / 3)}
                    fill={tone}
                    opacity={hover == null || hover === i ? 0.95 : 0.4}
                    className="vz-bar"
                  />
                  {i % geo.labelEvery === 0 && (
                    <text className="vz-tick" x={cx} y={height - 6} textAnchor="middle">
                      {fmtCompact(b.mid, isMoney)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          {hb && (
            <div
              className="vz-tt"
              style={{ left: clamp(M.l + geo.slot * (hover + 0.5) + 12, 8, Math.max(8, width - 168)), top: 6 }}
            >
              <div className="vz-tt-title">{hb.exact ? fmt(hb.mid) : `${fmt(hb.lo)} → ${fmt(hb.hi)}`}</div>
              <div className="vz-tt-row"><span>Trades</span><b>{hb.count}</b></div>
              <div className="vz-tt-sub">{total ? ((hb.count / total) * 100).toFixed(1) : 0}% of all trades</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
