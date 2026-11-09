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

export const TOOL_BY_ID = Object.fromEntries(TOOLS.map((t) => [t.id, t]));

export const TOOL_HINTS = {
  hline: 'Click a price level.',
  trend: 'Click the start, then the end.',
  ray: 'Click the start, then a second point.',
  rect: 'Click one corner, then the opposite corner.',
  fib: 'Click the swing start, then the swing end.',
  rr: 'Click the entry, then the stop. Target is drawn at 2R.',
  measure: 'Click a start point, move, then click to finish.',
};

export const DRAW_COLORS = ['#F5B544', '#5EA8FF', '#B58CFF', '#35C4A1', '#FF5C5C', '#E7E9EE'];

export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

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

function rrParts(a, b) {
  // a = entry, b = stop. Target mirrors the stop at 2R.
  const risk = a.p - b.p;
  const target = a.p + risk * 2;
  return { long: risk > 0, risk: Math.abs(risk), target };
}

/* --------------------------------- drawing --------------------------------- */
function drawOne(ctx, d, env, { selected = false, ghost = false } = {}) {
  const g = resolve(d, env);
  if (!g) return;
  const { px, W } = g;
  const { H, prec, Y } = env;
  const color = d.color || '#F5B544';
  const a = px[0];
  const b = px[1] || null;
  ctx.save();
  ctx.lineWidth = selected ? 2 : 1.5;
  ctx.strokeStyle = ghost ? withAlpha(color, 0.7) : color;
  ctx.fillStyle = color;
  ctx.setLineDash([]);

  const handle = (q) => {
    ctx.fillStyle = '#0A0D13';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(q.x, q.y, 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  };

  if (d.type === 'hline') {
    ctx.beginPath(); ctx.moveTo(0, a.y); ctx.lineTo(W, a.y); ctx.stroke();
    pill(ctx, fmtP(a.p, prec), W - 6, a.y, { bg: color, align: 'right' });
    if (selected) handle({ x: W * 0.5, y: a.y });
  } else if (d.type === 'trend' && b) {
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    if (selected || ghost) { handle(a); handle(b); }
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
    ctx.fillStyle = withAlpha(color, 0.1);
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    if (selected) { handle(a); handle(b); }
  } else if (d.type === 'fib' && b) {
    const left = Math.min(a.x, b.x);
    const hi = a.p, lo = b.p;
    let prevY = null;
    FIB_LEVELS.forEach((lvl, i) => {
      const price = b.p - (b.p - a.p) * lvl;
      const y = Y(price);
      if (y == null) return;
      if (prevY != null) {
        ctx.fillStyle = withAlpha(color, i % 2 ? 0.05 : 0.09);
        ctx.fillRect(left, Math.min(prevY, y), Math.max(W - left, 0), Math.abs(y - prevY));
      }
      prevY = y;
      ctx.strokeStyle = withAlpha(color, lvl === 0 || lvl === 1 ? 0.95 : 0.6);
      ctx.lineWidth = 1;
      ctx.setLineDash(lvl === 0 || lvl === 1 ? [] : [5, 4]);
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(W, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = "600 10px 'IBM Plex Mono', monospace";
      ctx.fillStyle = withAlpha(color, 0.95);
      ctx.textBaseline = 'bottom';
      ctx.textAlign = 'left';
      ctx.fillText(`${lvl} (${fmtP(price, prec)})`, left + 6, y - 3);
    });
    void hi; void lo;
    ctx.strokeStyle = withAlpha(color, 0.5);
    ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.setLineDash([]);
    if (selected) { handle(a); handle(b); }
  } else if (d.type === 'rr' && b) {
    const { long, risk, target } = rrParts(a, b);
    const yT = Y(target);
    if (yT == null) { ctx.restore(); return; }
    const left = Math.min(a.x, b.x);
    const right = Math.max(Math.max(a.x, b.x), left + 70);
    const w = right - left;
    ctx.fillStyle = 'rgba(53,196,161,.16)';
    ctx.fillRect(left, Math.min(a.y, yT), w, Math.abs(yT - a.y));
    ctx.fillStyle = 'rgba(255,92,92,.16)';
    ctx.fillRect(left, Math.min(a.y, b.y), w, Math.abs(b.y - a.y));
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#35C4A1'; ctx.beginPath(); ctx.moveTo(left, yT); ctx.lineTo(right, yT); ctx.stroke();
    ctx.strokeStyle = '#FF5C5C'; ctx.beginPath(); ctx.moveTo(left, b.y); ctx.lineTo(right, b.y); ctx.stroke();
    ctx.strokeStyle = '#E7E9EE'; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(left, a.y); ctx.lineTo(right, a.y); ctx.stroke(); ctx.setLineDash([]);
    pill(ctx, `${long ? 'Long' : 'Short'} · R:R 1:2 · risk ${fmtP(risk, prec)}`, left + 6, a.y - 12, { bg: 'rgba(12,16,23,.92)', fg: '#E7E9EE' });
    pill(ctx, `TP ${fmtP(target, prec)}`, right - 4, yT + (long ? 12 : -12), { bg: '#35C4A1', align: 'right' });
    pill(ctx, `SL ${fmtP(b.p, prec)}`, right - 4, b.y + (long ? -12 : 12), { bg: '#FF5C5C', align: 'right' });
    if (selected) { handle({ x: left, y: a.y }); handle({ x: left, y: b.y }); }
  } else if (d.type === 'measure' && b) {
    const up = b.p >= a.p;
    const c = up ? '#35C4A1' : '#FF5C5C';
    const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
    ctx.fillStyle = withAlpha(c, 0.12);
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = withAlpha(c, 0.7);
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(x, y, w, h);
    ctx.setLineDash([]);
    ctx.strokeStyle = c;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    const dp = b.p - a.p;
    const pct = a.p ? (dp / a.p) * 100 : 0;
    const bars = Math.abs(Math.round(env.toIdx(b.t) - env.toIdx(a.t)));
    const secs = Math.abs(b.t - a.t);
    const text = `${dp >= 0 ? '+' : ''}${fmtP(dp, prec)} (${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%) · ${bars} bars · ${fmtDur(secs)}`;
    pill(ctx, text, x + w / 2, Math.max(16, y - 14), { bg: c, align: 'center' });
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
      return FIB_LEVELS.some((l) => {
        const y = env.Y(b.p - (b.p - a.p) * l);
        return y != null && Math.abs(py - y) <= T;
      });
    }
    case 'rr': {
      if (!b) return false;
      const { target } = rrParts(a, b);
      const yT = env.Y(target);
      const left = Math.min(a.x, b.x);
      const right = Math.max(Math.max(a.x, b.x), left + 70);
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
    const left = Math.min(a.x, b.x);
    return [{ x: left, y: a.y, i: 0 }, { x: left, y: b.y, i: 1 }];
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
    this._view = { zOrder: () => 'top', renderer: () => ({ draw: (t) => this._draw(t) }) };
  }
  attached({ chart, series, requestUpdate }) { this._chart = chart; this._series = series; this._req = requestUpdate; }
  detached() { this._chart = null; this._series = null; this._req = null; }
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
      const env = this._env(mediaSize.width, mediaSize.height);
      for (const d of st.drawings || []) drawOne(ctx, d, env, { selected: d.id === st.selectedId });
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

// Journal trade boxes (entry / stop / target) + optional labels.
// getState() => { index, trades, show, labels }
export class TradesPrimitive {
  constructor(getState) {
    this._get = getState;
    this._chart = null;
    this._series = null;
    this._req = null;
    this._view = { zOrder: () => 'bottom', renderer: () => ({ draw: (t) => this._draw(t) }) };
  }
  attached({ chart, series, requestUpdate }) { this._chart = chart; this._series = series; this._req = requestUpdate; }
  detached() { this._chart = null; this._series = null; this._req = null; }
  updateAllViews() {}
  paneViews() { return [this._view]; }
  redraw() { this._req?.(); }

  _draw(target) {
    if (!this._chart || !this._series) return;
    const st = this._get();
    if (!st?.show || !st.trades?.length) return;
    const ts = this._chart.timeScale();
    const s = this._series;
    target.useMediaCoordinateSpace(({ context: ctx }) => {
      for (const t of st.trades) {
        if (t.entryTimeSec == null || t.exitTimeSec == null) continue;
        const x1 = ts.timeToCoordinate(t.entryTimeSec);
        const x2 = ts.timeToCoordinate(t.exitTimeSec);
        if (x1 === null || x2 === null) continue;
        const yE = t.entryPrice ? s.priceToCoordinate(t.entryPrice) : null;
        const yS = t.stopLoss ? s.priceToCoordinate(t.stopLoss) : null;
        const yT = t.takeProfit ? s.priceToCoordinate(t.takeProfit) : null;
        const left = Math.min(x1, x2);
        const w = Math.max(Math.abs(x2 - x1), 2);
        const box = (y, fill, stroke) => {
          const top = Math.min(yE, y), h = Math.abs(yE - y);
          ctx.fillStyle = fill; ctx.fillRect(left, top, w, h);
          ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.strokeRect(left, top, w, h);
        };
        const line = (y, color, width, dash) => {
          ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash || []);
          ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + w, y); ctx.stroke(); ctx.setLineDash([]);
        };
        if (yE !== null && yT !== null) box(yT, 'rgba(53,196,161,.14)', 'rgba(53,196,161,.4)');
        if (yE !== null && yS !== null) box(yS, 'rgba(255,92,92,.14)', 'rgba(255,92,92,.4)');
        if (yT !== null) line(yT, '#35C4A1', 2);
        if (yS !== null) line(yS, '#FF5C5C', 2);
        if (yE !== null) line(yE, '#F5B544', 1, [4, 4]);
        if (st.labels && yE !== null && t.label) {
          pill(ctx, t.label, left + 4, yE - 12, { bg: t.win === false ? '#FF5C5C' : t.win ? '#35C4A1' : '#F5B544' });
        }
      }
    });
  }
}
