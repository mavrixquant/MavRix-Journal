import { useEffect, useMemo, useRef, useState } from 'react';
import { money, fmtDate, pct } from '../lib/format';

const WIN = 'var(--sx-win)';
const LOSS = 'var(--sx-loss)';

/* ── Sparkline ─────────────────────────────────────────── */
export function Sparkline({ values, color, height = 44, className = '' }) {
  const W = 200;
  const path = useMemo(() => {
    if (!values || values.length < 2) return null;
    const pts = [0, ...values];
    const min = Math.min(...pts), max = Math.max(...pts);
    const span = max - min || 1;
    const xy = pts.map((v, i) => [(i / (pts.length - 1)) * W, height - 3 - ((v - min) / span) * (height - 6)]);
    const line = xy.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    const zeroY = height - 3 - ((0 - min) / span) * (height - 6);
    return { line, area: `${line} L${W},${height} L0,${height} Z`, zeroY };
  }, [values, height]);

  if (!path) return <div className={`sx-spark-empty ${className}`} style={{ height }} />;
  const id = `sg-${Math.abs((color || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0))}-${values.length}`;
  return (
    <svg className={`sx-spark ${className}`} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" style={{ height }} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".32" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1="0" x2={W} y1={path.zeroY} y2={path.zeroY} className="sx-spark-zero" />
      <path d={path.area} fill={`url(#${id})`} />
      <path d={path.line} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ── Responsive width hook ─────────────────────────────── */
function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, Math.floor(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/* ── Equity / drawdown chart with crosshair ────────────── */
export function EquityChart({ equity, drawdown, mode = 'equity', color = '#F59E0B', height = 300 }) {
  const [ref, W] = useWidth();
  const [hover, setHover] = useState(null);
  const isDD = mode === 'drawdown';
  const pad = { l: 56, r: 14, t: 14, b: 26 };

  const model = useMemo(() => {
    const src = isDD ? drawdown : equity;
    if (!src || src.length < 1) return null;
    const vals = src.map((p) => (isDD ? p.dd : p.cum));
    const series = isDD ? vals : [0, ...vals];
    let min = Math.min(...series), max = Math.max(...series);
    if (min === max) { min -= 1; max += 1; }
    const padY = (max - min) * 0.08;
    min -= padY; max += padY;
    const iw = W - pad.l - pad.r, ih = height - pad.t - pad.b;
    const count = src.length;
    const x = (i) => pad.l + (count === 1 ? iw / 2 : (i / (count - 1)) * iw);
    const y = (v) => pad.t + (1 - (v - min) / (max - min)) * ih;
    const pts = vals.map((v, i) => [x(i), y(v)]);
    const line = pts.map(([px, py], i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
    const base = y(0);
    const area = `${line} L${pts[pts.length - 1][0]},${base} L${pts[0][0]},${base} Z`;
    const ticks = Array.from({ length: 5 }, (_, i) => min + ((max - min) * i) / 4);
    return { src, vals, pts, line, area, base, y, ticks, iw, ih };
  }, [equity, drawdown, isDD, W, height]);

  if (!model) return <div className="sx-chart-empty">No trades in this range</div>;

  const last = model.vals[model.vals.length - 1];
  const stroke = isDD ? LOSS : last >= 0 ? color : LOSS;
  const gid = `eq-${isDD ? 'dd' : 'eq'}`;

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const ratio = Math.min(1, Math.max(0, (px - pad.l) / model.iw));
    setHover(Math.round(ratio * (model.src.length - 1)));
  };
  const h = hover != null ? { p: model.src[hover], pt: model.pts[hover] } : null;

  return (
    <div ref={ref} className="sx-chart" style={{ height }}>
      <svg width={W} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label={isDD ? 'Drawdown chart' : 'Equity curve'}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity=".28" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        {model.ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={model.y(t)} y2={model.y(t)} className="sx-grid" />
            <text x={pad.l - 8} y={model.y(t) + 3} textAnchor="end" className="sx-axis">{money(t, { compact: true })}</text>
          </g>
        ))}
        <line x1={pad.l} x2={W - pad.r} y1={model.base} y2={model.base} className="sx-zero" />
        <path d={model.area} fill={`url(#${gid})`} />
        <path d={model.line} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <text x={pad.l} y={height - 8} className="sx-axis">{fmtDate(model.src[0].date, { month: 'short', day: 'numeric' })}</text>
        <text x={W - pad.r} y={height - 8} textAnchor="end" className="sx-axis">{fmtDate(model.src[model.src.length - 1].date, { month: 'short', day: 'numeric' })}</text>
        {h && (
          <g>
            <line x1={h.pt[0]} x2={h.pt[0]} y1={pad.t} y2={height - pad.b} className="sx-cross" />
            <circle cx={h.pt[0]} cy={h.pt[1]} r="4" fill={stroke} stroke="#0C1017" strokeWidth="2" />
          </g>
        )}
      </svg>
      {h && (
        <div className="sx-tip" style={{ left: Math.min(W - 150, Math.max(8, h.pt[0] + 12)), top: 8 }}>
          <b>{isDD ? money(h.p.dd) : money(h.p.cum, { sign: true })}</b>
          <span>Trade #{h.p.i} · {fmtDate(h.p.date, { month: 'short', day: 'numeric' })}</span>
          {!isDD && <span className={h.p.pnl >= 0 ? 'pos' : 'neg'}>{money(h.p.pnl, { sign: true })}</span>}
        </div>
      )}
    </div>
  );
}

/* ── Horizontal bar list (session / weekday / symbol …) ── */
export function BarList({ rows, empty = 'No data' }) {
  if (!rows || rows.length === 0) return <div className="sx-chart-empty sm">{empty}</div>;
  const max = Math.max(1e-9, ...rows.map((r) => Math.abs(r.net)));
  return (
    <div className="sx-bars">
      {rows.map((r) => (
        <div key={r.key} className="sx-bar-row" title={`${r.n} trades · ${pct(r.winRate, 0)} win · avg ${money(r.avg, { sign: true })}`}>
          <span className="sx-bar-key">{r.key}</span>
          <span className="sx-bar-track">
            <i className={r.net >= 0 ? 'w' : 'l'} style={{ width: `${Math.max(3, (Math.abs(r.net) / max) * 100)}%` }} />
          </span>
          <span className={`sx-bar-val ${r.net >= 0 ? 'pos' : 'neg'}`}>{money(r.net, { sign: true, compact: true })}</span>
          <span className="sx-bar-n">{r.n}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Vertical bars (monthly P&L) ───────────────────────── */
export function MonthlyBars({ rows, height = 150 }) {
  if (!rows || rows.length === 0) return <div className="sx-chart-empty sm">No data</div>;
  const max = Math.max(1e-9, ...rows.map((r) => Math.abs(r.net)));
  const half = (height - 22) / 2;
  const data = rows.slice(-18);
  return (
    <div className="sx-vbars" style={{ height }}>
      {data.map((r) => {
        const hgt = Math.max(2, (Math.abs(r.net) / max) * half);
        const label = new Date(`${r.month}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short' });
        return (
          <div key={r.month} className="sx-vbar" title={`${r.month}: ${money(r.net, { sign: true })} · ${r.n} trades · ${pct(r.winRate, 0)} win`}>
            <div className="sx-vbar-plot" style={{ height: half * 2 }}>
              <i className={r.net >= 0 ? 'w' : 'l'} style={r.net >= 0 ? { bottom: half, height: hgt } : { top: half, height: hgt }} />
            </div>
            <span>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Daily P&L heatmap (last 26 weeks) ─────────────────── */
export function DailyHeatmap({ days }) {
  const model = useMemo(() => {
    const map = new Map((days || []).map((d) => [d.date, d]));
    const end = new Date();
    end.setHours(0, 0, 0, 0);
    const start = new Date(end);
    start.setDate(start.getDate() - 26 * 7 + 1);
    start.setDate(start.getDate() - start.getDay()); // align to Sunday
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const weeks = [];
    const cur = new Date(start);
    while (cur <= end) {
      const col = [];
      for (let i = 0; i < 7; i++) {
        col.push(cur <= end ? { date: iso(cur), ...(map.get(iso(cur)) || {}) } : null);
        cur.setDate(cur.getDate() + 1);
      }
      weeks.push(col);
    }
    const max = Math.max(1e-9, ...(days || []).map((d) => Math.abs(d.net)));
    return { weeks, max };
  }, [days]);

  return (
    <div className="sx-heat" role="img" aria-label="Daily P&L heatmap">
      {model.weeks.map((col, wi) => (
        <div key={wi} className="sx-heat-col">
          {col.map((c, di) => {
            if (!c) return <span key={di} className="sx-heat-cell is-void" />;
            if (c.net == null) return <span key={di} className="sx-heat-cell" title={c.date} />;
            const a = 0.25 + 0.75 * Math.min(1, Math.abs(c.net) / model.max);
            return (
              <span
                key={di}
                className="sx-heat-cell"
                style={{ background: c.net >= 0 ? WIN : LOSS, opacity: a }}
                title={`${fmtDate(c.date)}: ${money(c.net, { sign: true })} · ${c.n} trade${c.n === 1 ? '' : 's'}`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

/* ── P&L distribution ──────────────────────────────────── */
export function Histogram({ bins, height = 120 }) {
  if (!bins || bins.length === 0) return <div className="sx-chart-empty sm">Not enough trades</div>;
  const max = Math.max(...bins.map((b) => b.count), 1);
  return (
    <div className="sx-hist" style={{ height }}>
      {bins.map((b, i) => (
        <div key={i} className="sx-hist-col" title={`${money(b.from)} to ${money(b.to)}: ${b.count} trades`}>
          <i className={b.positive ? 'w' : 'l'} style={{ height: `${Math.max(b.count ? 6 : 0, (b.count / max) * 100)}%` }} />
        </div>
      ))}
    </div>
  );
}
