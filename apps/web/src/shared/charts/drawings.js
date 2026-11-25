import { dashPattern } from '../utils/colorUtil';

// Drawing tools + canvas primitives for lightweight-charts v5.
//
// Drawings are stored as { id, type, color, pts: [{ t, p }] } where `t` is a
// UTC unix-second timestamp (display offset removed, so drawings survive a
// timezone change) and `p` is a price. Times beyond the last bar are allowed:
// they are mapped through a fractional bar index, so drawings extend into the
// empty space on the right just like on TradingView.

export const TOOLS = [
  { id: 'cursor', label: 'Cursor', key: 'Esc', pts: 0 },
  { id: 'hline', label: 'Horizontal line', key: 'H', pts: 1 },
  { id: 'trend', label: 'Trend line', key: 'L', pts: 2 },
  { id: 'ray', label: 'Ray', key: 'Y', pts: 2 },
  { id: 'rect', label: 'Rectangle', key: 'B', pts: 2 },
  { id: 'fib', label: 'Fib retracement', key: 'G', pts: 2 },
  { id: 'rr', label: 'Risk / reward', key: 'P', pts: 2 },
  { id: 'measure', label: 'Measure', key: 'M', pts: 2 },
];

// Click-to-place position tools (not shown in the rail; hosts such as the
// backtester arm them from their own Long / Short buttons). One click sets the
// entry; stop and target get sensible default distances and are then dragged.
export const POSITION_TOOLS = {
  rrLong: { id: 'rrLong', label: 'Long position', key: '', pts: 1, side: 'long' },
  rrShort: { id: 'rrShort', label: 'Short position', key: '', pts: 1, side: 'short' },
};

export const TOOL_BY_ID = {
  ...Object.fromEntries(TOOLS.map((t) => [t.id, t])),
  ...POSITION_TOOLS,
};

export const TOOL_HINTS = {
  hline: 'Click a price level.',
  trend: 'Click the start, then the end.',
  ray: 'Click the start, then a second point.',
  rect: 'Click one corner, then the opposite corner.',
  fib: 'Click the swing start, then the swing end.',
  rr: 'Click the entry, then the stop. Drag the target to adjust.',
  rrLong: 'Click the entry price. Drag the stop and target to adjust.',
  rrShort: 'Click the entry price. Drag the stop and target to adjust.',
  measure: 'Click a start point, move, then click to finish.',
};

export const DRAW_COLORS = ['#F5B544', '#5EA8FF', '#B58CFF', '#35C4A1', '#FF5C5C', '#E7E9EE'];

export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

// Levels offered in the settings dialog (the first seven are on by default).
export const FIB_PRESET = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1, 1.272, 1.618, 2, 2.618, 3.618, 4.236];

// Enabled fib levels of a drawing: [{ v, color? }] — falls back to the classic seven.
export function fibLevelsOf(d) {
  const custom = d?.style?.fibLevels;
  if (Array.isArray(custom) && custom.length) return custom.filter((l) => l.on !== false);
  return FIB_LEVELS.map((v) => ({ v }));
}

export const INTERVAL_SECONDS = { '1m': 60, '5m': 300, '15m': 900, '1h': 3600, '4h': 14400, '1d': 86400 };

export const tNum = (t) => (typeof t === 'number' ? t : Date.parse(`${t}T00:00:00Z`) / 1000);

export const newId = () => Math.random().toString(36).slice(2, 10);

/* ----------------------- time <-> fractional bar index ---------------------- */
export function buildIndex(bars, interval) {
  const times = bars.map((b) => tNum(b.time));
  const n = times.length;
  let step = INTERVAL_SECONDS[interval] || 60;
  if (n > 2) {
    const diffs = [];
    for (let i = Math.max(1, n - 60); i < n; i++) diffs.push(times[i] - times[i - 1]);
    diffs.sort((a, b) => a - b);
    const med = diffs[Math.floor(diffs.length / 2)];
    if (med > 0) step = med;
  }
  const lower = (sec) => {
    let lo = 0, hi = n - 1, ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (times[mid] <= sec) { ans = mid; lo = mid + 1; } else hi = mid - 1;
    }
    return ans;
  };
  return {
    length: n,
    step,
    toIdx(sec) {
      if (!n) return 0;
      if (sec >= times[n - 1]) return n - 1 + (sec - times[n - 1]) / step;
      if (sec <= times[0]) return (sec - times[0]) / step;
      const i = lower(sec);
      const span = times[i + 1] - times[i];
      return i + (span > 0 ? (sec - times[i]) / span : 0);
    },
    toSec(idx) {
      if (!n) return 0;
      if (idx >= n - 1) return times[n - 1] + (idx - (n - 1)) * step;
      if (idx <= 0) return times[0] + idx * step;
      const i = Math.floor(idx);
      return times[i] + (times[i + 1] - times[i]) * (idx - i);
    },
  };
}

/* --------------------------------- helpers --------------------------------- */
const fmtP = (n, prec = 2) => Number(n).toLocaleString('en-US', { minimumFractionDigits: prec, maximumFractionDigits: prec });

export function fmtDur(sec) {
  if (!sec) return '0m';
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
  return [d && `${d}d`, h && `${h}h`, (m || (!d && !h)) && `${m}m`].filter(Boolean).join(' ');
}

function withAlpha(color, a) {
  if (color.startsWith('#') && color.length === 7) {
    const r = parseInt(color.slice(1, 3), 16), g = parseInt(color.slice(3, 5), 16), b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${a})`;
  }
  return color;
}

function distToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function pill(ctx, text, x, y, { fg = '#0D1117', bg = '#F5B544', align = 'left' } = {}) {
  ctx.font = "600 10.5px 'IBM Plex Mono', monospace";
  const w = ctx.measureText(text).width + 12;
  const h = 18;
  const left = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(left, y - h / 2, w, h, 5);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(text, left + 6, y + 0.5);
}

/* ------------------------ geometry for one drawing ------------------------- */
// Resolves a drawing into pixel space. Returns null if it can't be placed.
function resolve(d, env) {
  const { X, Y, W } = env;
  const pts = d.cursor ? [...d.pts, d.cursor] : d.pts;
  if (!pts.length) return null;
  const px = pts.map((q) => ({ x: X(q.t), y: Y(q.p), t: q.t, p: q.p }));
  if (px.some((q) => q.x == null || q.y == null)) return null;
  return { px, W };
}

function rrParts(a, b, c) {
  // a = entry, b = stop, c = target (optional). Legacy 2-point drawings mirror the stop at 2R.
  const risk = a.p - b.p;
  const long = c ? (risk !== 0 ? risk > 0 : c.p > a.p) : risk > 0;
  const target = c ? c.p : a.p + risk * 2;
  const reward = Math.abs(target - a.p);
  const rAbs = Math.abs(risk);
  return { long, risk: rAbs, reward, target, rr: rAbs > 0 ? reward / rAbs : 0 };
}

// Keeps a 3-point position coherent after an anchor drag:
// the target always sits on the profit side of the entry; flipping the stop flips the side.
export function rrNormalize(pts, moved) {
  if (!pts || pts.length < 3) return pts;
  const [e, s, t] = pts;
  const long = e.p !== s.p ? e.p > s.p : t.p > e.p;
  const dir = long ? 1 : -1;
  const min = Math.max(Math.abs(e.p - s.p) * 0.05, 1e-9);
  let tp = t.p;
  if (moved === 2) {
    if ((tp - e.p) * dir < min) tp = e.p + dir * min;
  } else {
    tp = e.p + dir * Math.max(Math.abs(tp - e.p), min);
  }
  return [e, s, { t: t.t, p: tp }];
}


/* --------------------------------- drawing --------------------------------- */
// Every drawing can carry `style` (see the settings dialog):
//   width, dash ('solid'|'dashed'|'dotted'), fillOpacity, label (bool), extendLeft / extendRight,
//   fibLevels [{ v, on, color }], fibPrices, fibPercent, fibTrend,
//   rr: profitColor / lossColor / entryColor / alwaysLabels, measure: upColor / downColor.
function drawOne(ctx, d, env, { selected = false, ghost = false, hovered = false } = {}) {
  const g = resolve(d, env);
  if (!g) return;
  const { px, W } = g;
  const { H, prec, Y } = env;
  const color = d.color || '#F5B544';
  const st = d.style || {};
  const a = px[0];
  const b = px[1] || null;
  const lw = (def) => (st.width != null ? st.width : def) + (selected ? 0.5 : 0);
  const dash = (def = 'solid') => dashPattern(st.dash || def, lw(1.5));
  const fillA = (def) => (st.fillOpacity != null ? st.fillOpacity : def);
  ctx.save();
  ctx.lineWidth = lw(1.5);
  ctx.strokeStyle = ghost ? withAlpha(color, 0.7) : color;
  ctx.fillStyle = color;
  ctx.setLineDash(dash());

  const handle = (q) => {
    ctx.save();
    ctx.setLineDash([]);
    ctx.fillStyle = '#0A0D13';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(q.x, q.y, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  };

  // Label summarising a two-point move (used by trend line + measure).
  const moveText = (p1, p2) => {
    const dp = p2.p - p1.p;
    const pct = p1.p ? (dp / p1.p) * 100 : 0;
    const bars = Math.abs(Math.round(env.toIdx(p2.t) - env.toIdx(p1.t)));
    return `${dp >= 0 ? '+' : ''}${fmtP(dp, prec)} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%) · ${bars} bars · ${fmtDur(Math.abs(p2.t - p1.t))}`;
  };

  if (d.type === 'hline') {
    ctx.beginPath(); ctx.moveTo(0, a.y); ctx.lineTo(W, a.y); ctx.stroke();
    if (st.label !== false) pill(ctx, fmtP(a.p, prec), W - 6, a.y, { bg: color, align: 'right' });
    if (selected) handle({ x: W * 0.5, y: a.y });
  } else if (d.type === 'trend' && b) {
    let x1 = a.x, y1 = a.y, x2 = b.x, y2 = b.y;
    const dx = b.x - a.x, dy = b.y - a.y;
    if ((st.extendLeft || st.extendRight) && Math.abs(dx) > 0.5) {
      const slope = dy / dx;
      const [lx, rx] = a.x <= b.x ? [a, b] : [b, a];
      const yAt = (x) => lx.y + slope * (x - lx.x);
      x1 = st.extendLeft ? -W : lx.x; y1 = yAt(x1);
      x2 = st.extendRight ? W * 3 : rx.x; y2 = yAt(x2);
    }
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    if (selected || ghost) { handle(a); handle(b); }
    if (st.label) pill(ctx, moveText(d.pts[0], d.pts[1] || d.cursor || d.pts[0]), (a.x + b.x) / 2, Math.min(a.y, b.y) - 14, { bg: b.p >= a.p ? '#35C4A1' : '#FF5C5C', align: 'center' });
  } else if (d.type === 'ray' && b) {
    let dx = b.x - a.x;
    const dy = b.y - a.y;
    if (dx === 0 && dy === 0) dx = 1;
    const adx = Math.max(Math.abs(dx), 0.5);
    const ext = (W * 2 + Math.abs(a.x)) / adx;
    const ex = a.x + Math.sign(dx || 1) * adx * ext;
    const ey = a.y + (dy / (dx || 1)) * (ex - a.x);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(ex, ey); ctx.stroke();
    if (selected || ghost) { handle(a); handle(b); }
  } else if (d.type === 'rect' && b) {
    const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
    ctx.fillStyle = withAlpha(color, fillA(0.1));
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    if (selected) { handle(a); handle(b); }
  } else if (d.type === 'fib' && b) {
    const left = Math.min(a.x, b.x);
    const levels = fibLevelsOf(d);
    const ordered = [...levels].sort((p, q) => p.v - q.v);
    let prevY = null;
    ordered.forEach((lvl, i) => {
      const price = b.p - (b.p - a.p) * lvl.v;
      const y = Y(price);
      if (y == null) return;
      const lc = lvl.color || color;
      if (prevY != null) {
        ctx.fillStyle = withAlpha(lc, fillA(i % 2 ? 0.05 : 0.09));
        ctx.fillRect(left, Math.min(prevY, y), Math.max(W - left, 0), Math.abs(y - prevY));
      }
      prevY = y;
      const edge = lvl.v === 0 || lvl.v === 1;
      ctx.strokeStyle = withAlpha(lc, edge ? 0.95 : 0.6);
      ctx.lineWidth = st.width != null ? st.width : 1;
      ctx.setLineDash(st.dash ? dashPattern(st.dash, ctx.lineWidth) : edge ? [] : [5, 4]);
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(W, y); ctx.stroke();
      ctx.setLineDash([]);
      if (st.label !== false) {
        const parts = [`${lvl.v}`];
        if (st.fibPercent) parts[0] = `${(lvl.v * 100).toFixed(1)}%`;
        if (st.fibPrices !== false) parts.push(`(${fmtP(price, prec)})`);
        ctx.font = "600 10px 'IBM Plex Mono', monospace";
        ctx.fillStyle = withAlpha(lc, 0.95);
        ctx.textBaseline = 'bottom';
        ctx.textAlign = 'left';
        ctx.fillText(parts.join(' '), left + 6, y - 3);
      }
    });
    if (st.fibTrend !== false) {
      ctx.strokeStyle = withAlpha(color, 0.5);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 4]);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.setLineDash([]);
    }
    if (selected) { handle(a); handle(b); }
  } else if (d.type === 'rr' && b) {
    const c3 = px[2] || null;
    const { long, risk, reward, target, rr } = rrParts(a, b, c3 ? { p: c3.p } : null);
    const yT = c3 ? c3.y : Y(target);
    if (yT == null) { ctx.restore(); return; }
    const win = st.profitColor || '#35C4A1';
    const loss = st.lossColor || '#FF5C5C';
    const entry = st.entryColor || '#E7E9EE';
    const left = c3 ? a.x : Math.min(a.x, b.x);
    const right = c3 ? Math.max(b.x, left + 70) : Math.max(Math.max(a.x, b.x), left + 70);
    const w = right - left;
    const active = selected || hovered || ghost;
    const fa = fillA(0.14) * (active ? 1.4 : 1);
    ctx.fillStyle = withAlpha(win, Math.min(fa, 0.6));
    ctx.fillRect(left, Math.min(a.y, yT), w, Math.abs(yT - a.y));
    ctx.fillStyle = withAlpha(loss, Math.min(fa, 0.6));
    ctx.fillRect(left, Math.min(a.y, b.y), w, Math.abs(b.y - a.y));
    ctx.setLineDash(dashPattern(st.dash));
    ctx.lineWidth = lw(1.5) + (active ? 0.5 : 0);
    ctx.strokeStyle = win; ctx.beginPath(); ctx.moveTo(left, yT); ctx.lineTo(right, yT); ctx.stroke();
    ctx.strokeStyle = loss; ctx.beginPath(); ctx.moveTo(left, b.y); ctx.lineTo(right, b.y); ctx.stroke();
    ctx.strokeStyle = entry; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(left, a.y); ctx.lineTo(right, a.y); ctx.stroke(); ctx.setLineDash([]);

    // Details (side, R:R, SL / TP distances) only while hovering or selected — or when pinned in settings.
    if (active || st.alwaysLabels) {
      const pct = (v) => (a.p ? `${((v / a.p) * 100).toFixed(2)}%` : '');
      pill(ctx, `${long ? 'Long' : 'Short'} · R:R 1:${rr.toFixed(2)}`, left + 6, a.y - 12, { bg: 'rgba(12,16,23,.94)', fg: '#E7E9EE' });
      pill(ctx, `TP ${fmtP(target, prec)} · +${fmtP(reward, prec)} (${pct(reward)})`, right - 4, yT + (long ? 12 : -12), { bg: win, align: 'right' });
      pill(ctx, `SL ${fmtP(b.p, prec)} · −${fmtP(risk, prec)} (${pct(risk)})`, right - 4, b.y + (long ? -12 : 12), { bg: loss, align: 'right' });
    }
    if (selected) { handle({ x: left, y: a.y }); handle({ x: left, y: b.y }); if (c3) handle({ x: left, y: c3.y }); }
  } else if (d.type === 'measure' && b) {
    const up = b.p >= a.p;
    const c = up ? (st.upColor || '#35C4A1') : (st.downColor || '#FF5C5C');
    const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
    ctx.fillStyle = withAlpha(c, fillA(0.12));
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = withAlpha(c, 0.7);
    ctx.lineWidth = 1;
    ctx.setLineDash(dashPattern(st.dash || 'dashed', 1));
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
    ctx.strokeStyle = c;
    ctx.lineWidth = lw(1.5);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    if (st.label !== false) pill(ctx, moveText(d.pts[0], d.pts[1] || d.cursor || d.pts[0]), x + w / 2, Math.max(16, y - 14), { bg: c, align: 'center' });
  }
  ctx.restore();
  void H;
}

/* ------------------------------ hit-testing -------------------------------- */
function hit(d, px, py, env) {
  const g = resolve(d, env);
  if (!g) return false;
  const { px: q, W } = g;
  const a = q[0], b = q[1];
  const T = 7;
  switch (d.type) {
    case 'hline': return Math.abs(py - a.y) <= T;
    case 'trend': return !!b && distToSeg(px, py, a.x, a.y, b.x, b.y) <= T;
    case 'ray': {
      if (!b) return false;
      const dx = b.x - a.x, dy = b.y - a.y;
      const adx = Math.max(Math.abs(dx), 0.5);
      const k = (W * 2 + Math.abs(a.x)) / adx;
      return distToSeg(px, py, a.x, a.y, a.x + dx * k, a.y + dy * k) <= T;
    }
    case 'rect': {
      if (!b) return false;
      const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
      return px >= x - T && px <= x + w + T && py >= y - T && py <= y + h + T;
    }
    case 'fib': {
      if (!b) return false;
      const left = Math.min(a.x, b.x);
      if (px < left - T) return false;
      return fibLevelsOf(d).some((l) => {
        const y = env.Y(b.p - (b.p - a.p) * l.v);
        return y != null && Math.abs(py - y) <= T;
      });
    }
    case 'rr': {
      if (!b) return false;
      const c3 = q[2] || null;
      const yT = c3 ? c3.y : env.Y(rrParts(a, b).target);
      const left = c3 ? a.x : Math.min(a.x, b.x);
      const right = c3 ? Math.max(b.x, left + 70) : Math.max(Math.max(a.x, b.x), left + 70);
      const top = Math.min(a.y, b.y, yT ?? a.y), bot = Math.max(a.y, b.y, yT ?? a.y);
      return px >= left - T && px <= right + T && py >= top - T && py <= bot + T;
    }
    default: return false;
  }
}

// Draggable anchor handles for a drawing, in pixel space. `i` is the index into d.pts.
function handlePoints(d, env) {
  const g = resolve(d, env);
  if (!g) return [];
  const { px: q, W } = g;
  const a = q[0], b = q[1];
  if (d.type === 'hline') return [{ x: W * 0.5, y: a.y, i: 0 }];
  if (!b) return [];
  if (d.type === 'rr') {
    const c3 = q[2] || null;
    const left = c3 ? a.x : Math.min(a.x, b.x);
    const hs = [{ x: left, y: a.y, i: 0 }, { x: left, y: b.y, i: 1 }];
    if (c3) hs.push({ x: left, y: c3.y, i: 2 });
    return hs;
  }
  return [{ x: a.x, y: a.y, i: 0 }, { x: b.x, y: b.y, i: 1 }];
}

/* -------------------------- series primitives ----------------------------- */
// getState() => { index, offset, drawings, draft, selectedId, precision }
export class DrawingsPrimitive {
  constructor(getState) {
    this._get = getState;
    this._chart = null;
    this._series = null;
    this._req = null;
    this._hoverId = null;
    this._size = null;
    this._onMove = (p) => {
      let id = null;
      if (p?.point && this._size && this._chart) {
        const st = this._get();
        if (st?.index?.length && !st.draft) id = this.hit(p.point.x, p.point.y, this._size);
      }
      if (id !== this._hoverId) { this._hoverId = id; this._req?.(); }
    };
    this._view = { zOrder: () => 'top', renderer: () => ({ draw: (t) => this._draw(t) }) };
  }
  attached({ chart, series, requestUpdate }) {
    this._chart = chart; this._series = series; this._req = requestUpdate;
    chart.subscribeCrosshairMove(this._onMove);
  }
  detached() {
    try { this._chart?.unsubscribeCrosshairMove(this._onMove); } catch { /* chart already gone */ }
    this._chart = null; this._series = null; this._req = null; this._hoverId = null;
  }
  updateAllViews() {}
  paneViews() { return [this._view]; }
  redraw() { this._req?.(); }

  _env(W, H) {
    const st = this._get();
    const ts = this._chart.timeScale();
    const series = this._series;
    const toIdx = (t) => st.index.toIdx(t + st.offset);
    return {
      W, H, prec: st.precision ?? 2, toIdx,
      X: (t) => ts.logicalToCoordinate(toIdx(t)),
      Y: (p) => series.priceToCoordinate(p),
    };
  }

  _draw(target) {
    if (!this._chart || !this._series) return;
    const st = this._get();
    if (!st?.index?.length) return;
    target.useMediaCoordinateSpace(({ context: ctx, mediaSize }) => {
      this._size = { width: mediaSize.width, height: mediaSize.height };
      const env = this._env(mediaSize.width, mediaSize.height);
      for (const d of st.drawings || []) drawOne(ctx, d, env, { selected: d.id === st.selectedId, hovered: d.id === this._hoverId });
      if (st.draft) drawOne(ctx, st.draft, env, { ghost: true });
    });
  }

  // Anchor handle of the SELECTED drawing under (x, y), or null.
  hitHandle(x, y, size, radius = 9) {
    if (!this._chart || !this._series) return null;
    const st = this._get();
    if (!st?.index?.length || !st.selectedId) return null;
    const d = (st.drawings || []).find((v) => v.id === st.selectedId);
    if (!d) return null;
    const env = this._env(size.width, size.height);
    let best = null, bd = radius;
    for (const h of handlePoints(d, env)) {
      const dist = Math.hypot(h.x - x, h.y - y);
      if (dist <= bd) { bd = dist; best = h.i; }
    }
    return best == null ? null : { id: d.id, index: best };
  }

  hit(x, y, size) {
    if (!this._chart || !this._series) return null;
    const st = this._get();
    if (!st?.index?.length) return null;
    const env = this._env(size.width, size.height);
    const list = st.drawings || [];
    for (let i = list.length - 1; i >= 0; i--) if (hit(list[i], x, y, env)) return list[i].id;
    return null;
  }
}

// Trade boxes (entry / stop / target) for journal trades, open positions and
// pending orders. The details (labels with entry, SL and TP) are only drawn while
// the position is hovered or selected — unless `labels` is switched on by the host.
//
// getState() => { index, trades, show, labels }
// trade: { id?, entryTimeSec, exitTimeSec, entryPrice, stopLoss, takeProfit,
//          label?, slLabel?, tpLabel?, win?, pending? }
export class TradesPrimitive {
  constructor(getState) {
    this._get = getState;
    this._chart = null;
    this._series = null;
    this._req = null;
    this._rects = [];
    this._hover = null;
    this._selected = null;
    // Drag state for SL/TP lines on active trades
    this._dragRef = null;
    this._onMove = (p) => {
      const key = p?.point ? this.hit(p.point.x, p.point.y) : null;
      if (key !== this._hover) { this._hover = key; this._req?.(); }
    };
    this._view = { zOrder: () => 'bottom', renderer: () => ({ draw: (t) => this._draw(t) }) };
  }
  attached({ chart, series, requestUpdate }) {
    this._chart = chart; this._series = series; this._req = requestUpdate;
    chart.subscribeCrosshairMove(this._onMove);
  }
  detached() {
    try { this._chart?.unsubscribeCrosshairMove(this._onMove); } catch { /* chart already gone */ }
    this._chart = null; this._series = null; this._req = null; this._rects = [];
  }
  updateAllViews() {}
  paneViews() { return [this._view]; }
  redraw() { this._req?.(); }

  select(key) {
    const next = key ?? null;
    if (next === this._selected) return;
    this._selected = next;
    this._req?.();
  }

  // Key of the trade box under (x, y), or null.
  hit(x, y) {
    for (let i = this._rects.length - 1; i >= 0; i -= 1) {
      const r = this._rects[i];
      if (x >= r.x1 - 4 && x <= r.x2 + 4 && y >= r.y1 - 4 && y <= r.y2 + 4) return r.key;
    }
    return null;
  }

  // Hit-test SL/TP lines on active trades for dragging.
  // Returns { key, line: 'sl' | 'tp', y, price } or null.
  hitSLTP(x, y, radius = 8) {
    if (!this._chart || !this._series) return null;
    const st = this._get();
    if (!st?.show || !st.trades?.length) return null;
    const ts = this._chart.timeScale();
    const s = this._series;
    const W_pane = this._chart.paneSize().width;

    for (const t of st.trades) {
      if (t.entryTimeSec == null) continue;
      const isActive = t.exitTimeSec == null && !t.pending;
      if (!isActive) continue; // only draggable on running trades

      const x1 = ts.timeToCoordinate(t.entryTimeSec * 1000);
      if (x1 === null) continue; // time out of range
      if (x > x1 + 4 && x < W_pane + 4) {
        // Check SL line
        if (t.stopLoss != null) {
          const yS = s.priceToCoordinate(t.stopLoss);
          if (yS !== null && Math.abs(y - yS) <= radius) {
            return { key: t.id, line: 'sl', y: yS, price: t.stopLoss };
          }
        }
        // Check TP line
        if (t.takeProfit != null) {
          const yT = s.priceToCoordinate(t.takeProfit);
          if (yT !== null && Math.abs(y - yT) <= radius) {
            return { key: t.id, line: 'tp', y: yT, price: t.takeProfit };
          }
        }
      }
    }
    return null;
  }

  // Begin dragging an SL/TP line on an active trade.
  // `onDragEnd` will be called with (tradeId, { stopLoss?, takeProfit? }) when drag ends.
  beginDragSLTP(x, y, hit, onDragEnd) {
    this._dragRef = { hit, startX: x, startY: y, onDragEnd };
    this._req?.();
  }

  // Continue drag: update visual position and return the new price for the dragged line.
  dragSLTP(x, y) {
    if (!this._dragRef || !this._chart || !this._series) return null;
    const { hit } = this._dragRef;
    const s = this._series;
    // Convert y to price
    const price = s.coordinateToPrice(y);
    if (price == null) return null;
    // Update the hit's visual price
    hit.price = price;
    this._req?.();
    return { tradeId: hit.key, line: hit.line, price };
  }

  // End drag: commit the change via onDragEnd callback.
  endDragSLTP() {
    if (!this._dragRef) return;
    const { hit, onDragEnd } = this._dragRef;
    onDragEnd(hit.key, { [hit.line]: hit.price });
    this._dragRef = null;
    this._req?.();
  }

  _draw(target) {
    if (!this._chart || !this._series) return;
    const st = this._get();
    if (!st?.show || !st.trades?.length) { this._rects = []; return; }
    const ts = this._chart.timeScale();
    const s = this._series;
    target.useMediaCoordinateSpace(({ context: ctx }) => {
      const rects = [];
      const W_pane = this._chart.paneSize().width;
      // Store active trade SL/TP lines for hit-testing
      this._activeSLTPLines = [];

      st.trades.forEach((t, n) => {
        if (t.entryTimeSec == null) return;
        const key = t.id ?? `i${n}`;
        const x1 = ts.timeToCoordinate(t.entryTimeSec * 1000);
        if (x1 === null) return;
        const isActive = t.exitTimeSec == null && !t.pending;
        let x2, left, w;
        if (isActive) {
          left = x1;
          w = W_pane - x1;
        } else {
          x2 = ts.timeToCoordinate(t.exitTimeSec * 1000);
          if (x2 === null) return;
          left = Math.min(x1, x2);
          w = Math.max(Math.abs(x2 - x1), 2);
        }
        const yE = t.entryPrice ? s.priceToCoordinate(t.entryPrice) : null;
        const yS = t.stopLoss ? s.priceToCoordinate(t.stopLoss) : null;
        const yT = t.takeProfit ? s.priceToCoordinate(t.takeProfit) : null;
        if (yE === null) return;
        const active = key === this._hover || key === this._selected;
        const ys = [yE, yS, yT].filter((v) => v !== null);
        if (!isActive) {
          rects.push({ key, x1: left, x2: left + w, y1: Math.min(...ys), y2: Math.max(...ys) });
        } else {
          // For active trades, track SL/TP line positions for drag hit-testing
          if (yS !== null) {
            this._activeSLTPLines.push({ key, line: 'sl', x1, x2: W_pane, y: yS, price: t.stopLoss });
          }
          if (yT !== null) {
            this._activeSLTPLines.push({ key, line: 'tp', x1, x2: W_pane, y: yT, price: t.takeProfit });
          }
        }

        const a = active ? 1.35 : 1;
        const pend = !!t.pending;
        const fillA = pend ? 0.08 : 0.14;
        const line = (y, color, width, dash) => {
          ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash || []);
          ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + w, y); ctx.stroke(); ctx.setLineDash([]);
        };
        const drawTrade = (y, color, width, label, isSL) => {
          if (isActive) {
            // Active trade: extended horizontal line (no fill)
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(x1, y);
            ctx.lineTo(W_pane, y);
            ctx.stroke();
            // Price label on the line
            pill(ctx, label, W_pane - 4, y, { bg: color, align: 'right' });
          } else {
            // Closed trade or pending order: box/segment
            const top = Math.min(yE, y), h = Math.abs(yE - y);
            ctx.fillStyle = `rgba(${isSL ? '255,92,92' : '53,196,161'},${Math.min(fillA * a, 0.3)})`;
            ctx.fillRect(left, top, w, h);
            ctx.strokeStyle = isSL ? 'rgba(255,92,92,.4)' : 'rgba(53,196,161,.4)';
            ctx.lineWidth = active ? 1.5 : 1;
            ctx.setLineDash(pend ? [4, 3] : []);
            ctx.strokeRect(left, top, w, h);
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(left, y);
            ctx.lineTo(left + w, y);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        };

        if (yT !== null) drawTrade(yT, '#35C4A1', active ? 2.5 : 2, t.tpLabel || `TP ${fmtP(t.takeProfit, st.precision ?? 2)}`, false);
        if (yS !== null) drawTrade(yS, '#FF5C5C', active ? 2.5 : 2, t.slLabel || `SL ${fmtP(t.stopLoss, st.precision ?? 2)}`, true);

        // Entry line for all trades
        if (isActive) {
          ctx.strokeStyle = '#F5B544';
          ctx.lineWidth = active ? 1.5 : 1;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(x1, yE);
          ctx.lineTo(W_pane, yE);
          ctx.stroke();
          ctx.setLineDash([]);
          pill(ctx, t.label || 'Entry', W_pane - 4, yE, { bg: '#F5B544', align: 'right' });
        } else {
          line(yE, '#F5B544', active ? 1.5 : 1, [4, 4]);
          if (t.label) {
            pill(ctx, t.label, left + 4, yE - 12, { bg: t.win === false ? '#FF5C5C' : t.win ? '#35C4A1' : '#F5B544' });
          }
        }
      });
      this._rects = rects;
    });
  }
}
