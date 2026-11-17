import { useEffect, useMemo, useRef, useState } from 'react';
import { fmtMoney, fmtSigned } from '../../lib/format';
import { fmtDate } from '../../lib/time';

/** Measures an element with a ResizeObserver. */
export function useSize(ref) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setSize((p) => (Math.abs(p.w - width) < 1 && Math.abs(p.h - height) < 1 ? p : { w: Math.floor(width), h: Math.floor(height) }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

const PAD = { l: 52, r: 12, t: 10, b: 22 };

function niceTicks(min, max, count = 4) {
  if (min === max) { min -= 1; max += 1; }
  const step = (max - min) / count;
  return Array.from({ length: count + 1 }, (_, i) => min + step * i);
}

const compact = (v) => {
  const a = Math.abs(v);
  if (a >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(a >= 1e4 ? 0 : 1)}k`;
  return v.toFixed(a >= 100 ? 0 : 1);
};

function Empty({ text }) {
  return <div className="pc-empty"><b>No data yet</b><span>{text}</span></div>;
}

/* ------------------------------- equity ------------------------------- */
export function EquityChart({ points, start, currency, tz }) {
  const ref = useRef(null);
  const { w, h } = useSize(ref);
  const [hover, setHover] = useState(null);

  const geo = useMemo(() => {
    if (!points || points.length < 2 || w < 80 || h < 60) return null;
    const ys = points.map((p) => p.balance).concat(start);
    let min = Math.min(...ys);
    let max = Math.max(...ys);
    const pad = (max - min) * 0.08 || Math.abs(max) * 0.01 || 1;
    min -= pad; max += pad;
    const iw = w - PAD.l - PAD.r;
    const ih = h - PAD.t - PAD.b;
    const x = (i) => PAD.l + (i / (points.length - 1)) * iw;
    const y = (v) => PAD.t + (1 - (v - min) / (max - min)) * ih;
    const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.balance).toFixed(1)}`).join('');
    return { x, y, d, ticks: niceTicks(min, max), iw, ih, base: y(start) };
  }, [points, start, w, h]);

  if (!points || points.length < 2) return <Empty text="Close a trade to start the equity curve." />;

  const onMove = (e) => {
    if (!geo) return;
    const r = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - r.left - PAD.l) / geo.iw;
    setHover(Math.max(0, Math.min(points.length - 1, Math.round(rel * (points.length - 1)))));
  };
  const hp = hover != null ? points[hover] : null;

  return (
    <div className="vz-wrap" ref={ref}>
      {geo && (
        <svg className="vz-svg" width={w} height={h} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label="Equity curve">
          <defs>
            <linearGradient id="btEqFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity=".28" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {geo.ticks.map((t) => (
            <g key={t}>
              <line className="vz-grid" x1={PAD.l} x2={w - PAD.r} y1={geo.y(t)} y2={geo.y(t)} />
              <text className="vz-tick" x={PAD.l - 8} y={geo.y(t) + 3} textAnchor="end">{compact(t)}</text>
            </g>
          ))}
          <line className="vz-zero" x1={PAD.l} x2={w - PAD.r} y1={geo.base} y2={geo.base} />
          <path d={`${geo.d}L${geo.x(points.length - 1)},${h - PAD.b}L${PAD.l},${h - PAD.b}Z`} fill="url(#btEqFill)" />
          <path className="vz-line" d={geo.d} />
          <text className="vz-tick" x={PAD.l} y={h - 6}>Trade 0</text>
          <text className="vz-tick" x={w - PAD.r} y={h - 6} textAnchor="end">Trade {points.length - 1}</text>
          {hp && (
            <>
              <line className="vz-cursor" x1={geo.x(hover)} x2={geo.x(hover)} y1={PAD.t} y2={h - PAD.b} />
              <circle cx={geo.x(hover)} cy={geo.y(hp.balance)} r="4" fill="var(--accent)" stroke="#0A0D14" strokeWidth="2" />
            </>
          )}
        </svg>
      )}
      {hp && geo && (
        <div className="vz-tt" style={{ left: Math.min(geo.x(hover) + 12, w - 150), top: 8 }}>
          <div className="vz-tt-title">{fmtMoney(hp.balance, currency)}</div>
          <div className="vz-tt-sub">{hover === 0 ? 'Start' : `Trade ${hover} · ${fmtDate(hp.t, tz)}`}</div>
          {hover > 0 && (
            <div className="vz-tt-row"><span>Result</span><b className={hp.pnl >= 0 ? 'pos' : 'neg'}>{fmtSigned(hp.pnl, currency)}</b></div>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------ drawdown ------------------------------ */
export function DrawdownChart({ points, currency, tz }) {
  const ref = useRef(null);
  const { w, h } = useSize(ref);
  const [hover, setHover] = useState(null);

  const geo = useMemo(() => {
    if (!points || points.length < 2 || w < 80 || h < 50) return null;
    const min = Math.min(...points.map((p) => p.dd), -1);
    const iw = w - PAD.l - PAD.r;
    const ih = h - PAD.t - PAD.b;
    const x = (i) => PAD.l + (i / (points.length - 1)) * iw;
    const y = (v) => PAD.t + (v / min) * ih; // 0 at top, min at bottom
    const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.dd).toFixed(1)}`).join('');
    return { x, y, d, min, iw };
  }, [points, w, h]);

  if (!points || points.length < 2) return <Empty text="Drawdown appears after your first closed trades." />;
  const hp = hover != null ? points[hover] : null;

  return (
    <div className="vz-wrap" ref={ref}>
      {geo && (
        <svg className="vz-svg" width={w} height={h}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const rel = (e.clientX - r.left - PAD.l) / geo.iw;
            setHover(Math.max(0, Math.min(points.length - 1, Math.round(rel * (points.length - 1)))));
          }}
          onMouseLeave={() => setHover(null)} role="img" aria-label="Drawdown">
          <line className="vz-zero" x1={PAD.l} x2={w - PAD.r} y1={geo.y(0)} y2={geo.y(0)} />
          <text className="vz-tick" x={PAD.l - 8} y={geo.y(0) + 3} textAnchor="end">0</text>
          <text className="vz-tick" x={PAD.l - 8} y={geo.y(geo.min) + 3} textAnchor="end">{compact(geo.min)}</text>
          <path d={`${geo.d}L${geo.x(points.length - 1)},${geo.y(0)}L${PAD.l},${geo.y(0)}Z`} fill="rgba(255,92,92,.16)" />
          <path className="vz-line is-loss" d={geo.d} />
          {hp && <line className="vz-cursor" x1={geo.x(hover)} x2={geo.x(hover)} y1={PAD.t} y2={h - PAD.b} />}
        </svg>
      )}
      {hp && geo && (
        <div className="vz-tt" style={{ left: Math.min(geo.x(hover) + 12, w - 150), top: 8 }}>
          <div className="vz-tt-title neg">{fmtSigned(hp.dd, currency)}</div>
          <div className="vz-tt-sub">{hp.ddPct.toFixed(2)}% from peak · {fmtDate(hp.t, tz)}</div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ histogram ------------------------------ */
export function HistogramChart({ bins, currency }) {
  const ref = useRef(null);
  const { w, h } = useSize(ref);
  const [hover, setHover] = useState(null);

  const geo = useMemo(() => {
    if (!bins || bins.length === 0 || w < 80 || h < 50) return null;
    const max = Math.max(...bins.map((b) => b.count), 1);
    const iw = w - PAD.l + 36 - PAD.r;
    const ih = h - PAD.t - PAD.b;
    const left = 14;
    const bw = (w - left - PAD.r) / bins.length;
    const lo = bins[0].from;
    const hi = bins[bins.length - 1].to;
    const zeroX = lo < 0 && hi > 0 ? left + ((0 - lo) / (hi - lo)) * (w - left - PAD.r) : null;
    return { max, ih, bw, left, zeroX, iw };
  }, [bins, w, h]);

  if (!bins || bins.length === 0) return <Empty text="Results distribution appears after closed trades." />;
  const hb = hover != null ? bins[hover] : null;

  return (
    <div className="vz-wrap" ref={ref}>
      {geo && (
        <svg className="vz-svg" width={w} height={h} role="img" aria-label="Trade result distribution">
          {bins.map((b, i) => {
            const mid = (b.from + b.to) / 2;
            const bh = (b.count / geo.max) * geo.ih;
            return (
              <rect
                key={i} className="vz-bar"
                x={geo.left + i * geo.bw + 1.5} y={PAD.t + geo.ih - bh}
                width={Math.max(2, geo.bw - 3)} height={Math.max(bh, b.count ? 2 : 0)} rx="3"
                fill={mid >= 0 ? 'var(--d-win)' : 'var(--d-loss)'}
                opacity={hover == null || hover === i ? 1 : 0.45}
                onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
              />
            );
          })}
          {geo.zeroX != null && <line className="vz-zero" x1={geo.zeroX} x2={geo.zeroX} y1={PAD.t} y2={h - PAD.b} />}
          <line className="vz-grid" x1={geo.left} x2={w - PAD.r} y1={PAD.t + geo.ih} y2={PAD.t + geo.ih} />
          <text className="vz-tick" x={geo.left} y={h - 6}>{compact(bins[0].from)}</text>
          <text className="vz-tick" x={w - PAD.r} y={h - 6} textAnchor="end">{compact(bins[bins.length - 1].to)}</text>
        </svg>
      )}
      {hb && geo && (
        <div className="vz-tt" style={{ left: Math.min(geo.left + hover * geo.bw, w - 160), top: 6 }}>
          <div className="vz-tt-title">{hb.count} trade{hb.count === 1 ? '' : 's'}</div>
          <div className="vz-tt-sub">{fmtSigned(hb.from, currency, { digits: 0 })} to {fmtSigned(hb.to, currency, { digits: 0 })}</div>
        </div>
      )}
    </div>
  );
}
