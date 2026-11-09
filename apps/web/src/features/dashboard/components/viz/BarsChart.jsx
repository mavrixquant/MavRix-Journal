import { useMemo, useState } from 'react';
import { useElementSize } from './useElementSize';
import { makeFmt, fmtCompact } from './format';
import { clamp, niceTicks } from './utils';

const M = { l: 50, r: 10, t: 14, b: 24 };

/** Vertical bars around a zero line. items: [{ label, value, sub, title }] */
export default function BarsChart({ items, isMoney }) {
  const [ref, { width, height }] = useElementSize();
  const [hover, setHover] = useState(null);
  const fmt = makeFmt(isMoney);

  const geo = useMemo(() => {
    if (!items?.length || width < 80 || height < 60) return null;
    let lo = Math.min(...items.map((d) => d.value), 0);
    let hi = Math.max(...items.map((d) => d.value), 0);
    const span = hi - lo || 1;
    if (lo < 0) lo -= span * 0.1;
    if (hi > 0) hi += span * 0.1;
    const innerW = width - M.l - M.r;
    const innerH = height - M.t - M.b;
    const slot = innerW / items.length;
    const barW = clamp(slot * 0.62, 4, 46);
    const y = (v) => M.t + innerH - ((v - lo) / (hi - lo)) * innerH;
    const ticks = niceTicks(lo, hi, innerH > 150 ? 4 : 3).filter((t) => t >= lo && t <= hi);
    const labelEvery = Math.ceil(items.length / Math.max(2, Math.floor(innerW / 46)));
    return { slot, barW, y, ticks, innerW, innerH, labelEvery, zero: y(0) };
  }, [items, width, height]);

  const hi = hover != null ? items[hover] : null;

  return (
    <div ref={ref} className="vz-wrap">
      {geo && (
        <>
          <svg className="vz-svg" width={width} height={height} onPointerLeave={() => setHover(null)}>
            {geo.ticks.map((t) => (
              <g key={t}>
                <line className="vz-grid" x1={M.l} x2={M.l + geo.innerW} y1={geo.y(t)} y2={geo.y(t)} />
                <text className="vz-tick" x={M.l - 9} y={geo.y(t)} textAnchor="end" dominantBaseline="middle">
                  {fmtCompact(t, isMoney)}
                </text>
              </g>
            ))}
            <line className="vz-zero" x1={M.l} x2={M.l + geo.innerW} y1={geo.zero} y2={geo.zero} />
            {items.map((d, i) => {
              const cx = M.l + geo.slot * (i + 0.5);
              const top = geo.y(Math.max(d.value, 0));
              const bottom = geo.y(Math.min(d.value, 0));
              const h = Math.max(2, bottom - top);
              const showVal = geo.barW >= 26 && geo.innerH > 110;
              return (
                <g key={d.label + i} onPointerEnter={() => setHover(i)}>
                  <rect x={cx - geo.slot / 2} y={M.t} width={geo.slot} height={geo.innerH} fill="transparent" />
                  <rect
                    x={cx - geo.barW / 2}
                    y={top}
                    width={geo.barW}
                    height={h}
                    rx={Math.min(5, geo.barW / 3)}
                    fill={d.value >= 0 ? 'var(--d-win)' : 'var(--d-loss)'}
                    opacity={hover == null || hover === i ? 1 : 0.4}
                    className="vz-bar"
                  />
                  {showVal && (
                    <text
                      className="vz-val"
                      x={cx}
                      y={d.value >= 0 ? top - 5 : bottom + 12}
                      textAnchor="middle"
                    >
                      {fmtCompact(d.value, isMoney)}
                    </text>
                  )}
                  {i % geo.labelEvery === 0 && (
                    <text className="vz-tick" x={cx} y={height - 6} textAnchor="middle">{d.label}</text>
                  )}
                </g>
              );
            })}
          </svg>
          {hi && (
            <div
              className="vz-tt"
              style={{ left: clamp(M.l + geo.slot * (hover + 0.5) + 12, 8, Math.max(8, width - 170)), top: 6 }}
            >
              <div className="vz-tt-title">{hi.title || hi.label}</div>
              <div className="vz-tt-row"><span>Net</span><b className={hi.value >= 0 ? 'pos' : 'neg'}>{fmt(hi.value)}</b></div>
              {hi.sub && <div className="vz-tt-sub">{hi.sub}</div>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
