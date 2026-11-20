// Pure indicator maths + registry. Bars are { time, open, high, low, close, volume }.
//
// Every indicator has editable INPUTS (period, source, ...) and per-line STYLE
// (colour, opacity, width, line style, visibility). Overrides live in a tiny
// persisted store (`indicatorStore`); the registry entries read it through
// getters, so anything that already renders `ind.label`, `ind.lines[].color`
// or calls `ind.calc(bars)` automatically reflects the user's settings.
import { composeColor, parseColor } from '../utils/colorUtil';

const num = (v) => Number(v);

/* --------------------------------- sources --------------------------------- */
export const SOURCES = [
  { v: 'close', l: 'Close' },
  { v: 'open', l: 'Open' },
  { v: 'high', l: 'High' },
  { v: 'low', l: 'Low' },
  { v: 'hl2', l: 'HL2 (high + low) / 2' },
  { v: 'hlc3', l: 'HLC3 (typical price)' },
  { v: 'ohlc4', l: 'OHLC4' },
];

export function pickSource(b, src = 'close') {
  switch (src) {
    case 'open': return num(b.open);
    case 'high': return num(b.high);
    case 'low': return num(b.low);
    case 'hl2': return (num(b.high) + num(b.low)) / 2;
    case 'hlc3': return (num(b.high) + num(b.low) + num(b.close)) / 3;
    case 'ohlc4': return (num(b.open) + num(b.high) + num(b.low) + num(b.close)) / 4;
    default: return num(b.close);
  }
}

/* ---------------------------------- maths ---------------------------------- */
export function sma(bars, n, src = 'close') {
  const out = [];
  let sum = 0;
  const v = bars.map((b) => pickSource(b, src));
  v.forEach((x, i) => {
    sum += x;
    if (i >= n) sum -= v[i - n];
    if (i >= n - 1) out.push({ time: bars[i].time, value: sum / n });
  });
  return out;
}

// EMA seeded with an SMA of the first n values (matches most platforms).
function emaValues(values, n) {
  const k = 2 / (n + 1);
  const out = new Array(values.length).fill(null);
  let prev = null;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v == null) continue;
    if (prev == null) {
      sum += v;
      count += 1;
      if (count === n) { prev = sum / n; out[i] = prev; }
    } else {
      prev = v * k + prev * (1 - k);
      out[i] = prev;
    }
  }
  return out;
}

export function ema(bars, n, src = 'close') {
  const vals = emaValues(bars.map((b) => pickSource(b, src)), n);
  const out = [];
  vals.forEach((v, i) => { if (v != null) out.push({ time: bars[i].time, value: v }); });
  return out;
}

export function vwap(bars, src = 'hlc3') {
  const out = [];
  let day = null, pv = 0, vol = 0;
  for (const b of bars) {
    const t = typeof b.time === 'number' ? b.time : Date.parse(`${b.time}T00:00:00Z`) / 1000;
    const d = Math.floor(t / 86400);
    if (d !== day) { day = d; pv = 0; vol = 0; }
    const v = num(b.volume) || 0;
    pv += pickSource(b, src) * v;
    vol += v;
    if (vol > 0) out.push({ time: b.time, value: pv / vol });
  }
  return out;
}

export function bollinger(bars, n = 20, k = 2, src = 'close') {
  const u = [], m = [], l = [];
  const vals = bars.map((b) => pickSource(b, src));
  for (let i = n - 1; i < bars.length; i++) {
    let s = 0;
    for (let j = i - n + 1; j <= i; j++) s += vals[j];
    const mean = s / n;
    let v = 0;
    for (let j = i - n + 1; j <= i; j++) v += (vals[j] - mean) ** 2;
    const sd = Math.sqrt(v / n);
    const time = bars[i].time;
    u.push({ time, value: mean + k * sd });
    m.push({ time, value: mean });
    l.push({ time, value: mean - k * sd });
  }
  return { u, m, l };
}

// Wilder's RSI
export function rsi(bars, n = 14, src = 'close') {
  const out = [];
  let g = 0, l = 0;
  const vals = bars.map((b) => pickSource(b, src));
  for (let i = 1; i < bars.length; i++) {
    const d = vals[i] - vals[i - 1];
    const up = Math.max(d, 0), dn = Math.max(-d, 0);
    if (i <= n) {
      g += up; l += dn;
      if (i === n) {
        g /= n; l /= n;
        out.push({ time: bars[i].time, value: l === 0 ? 100 : 100 - 100 / (1 + g / l) });
      }
    } else {
      g = (g * (n - 1) + up) / n;
      l = (l * (n - 1) + dn) / n;
      out.push({ time: bars[i].time, value: l === 0 ? 100 : 100 - 100 / (1 + g / l) });
    }
  }
  return out;
}

export function macd(bars, fast = 12, slow = 26, signal = 9, src = 'close', up = 'rgba(53,196,161,.55)', down = 'rgba(255,92,92,.55)') {
  const closes = bars.map((b) => pickSource(b, src));
  const ef = emaValues(closes, fast);
  const es = emaValues(closes, slow);
  const line = closes.map((_, i) => (ef[i] != null && es[i] != null ? ef[i] - es[i] : null));
  const sig = emaValues(line, signal);
  const m = [], s = [], h = [];
  bars.forEach((b, i) => {
    if (line[i] == null) return;
    m.push({ time: b.time, value: line[i] });
    if (sig[i] != null) {
      s.push({ time: b.time, value: sig[i] });
      const hv = line[i] - sig[i];
      h.push({ time: b.time, value: hv, color: hv >= 0 ? up : down });
    }
  });
  return { m, s, h };
}

export function atr(bars, n = 14) {
  const out = [];
  let prev = null;
  let sum = 0;
  for (let i = 1; i < bars.length; i++) {
    const h = num(bars[i].high), l = num(bars[i].low), pc = num(bars[i - 1].close);
    const tr = Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc));
    if (i <= n) {
      sum += tr;
      if (i === n) { prev = sum / n; out.push({ time: bars[i].time, value: prev }); }
    } else {
      prev = (prev * (n - 1) + tr) / n;
      out.push({ time: bars[i].time, value: prev });
    }
  }
  return out;
}

export function heikinAshi(bars) {
  let pO = null, pC = null;
  return bars.map((b) => {
    const o = num(b.open), h = num(b.high), l = num(b.low), c0 = num(b.close);
    const c = (o + h + l + c0) / 4;
    const ho = pO == null ? (o + c0) / 2 : (pO + pC) / 2;
    pO = ho; pC = c;
    return { time: b.time, open: ho, high: Math.max(h, ho, c), low: Math.min(l, ho, c), close: c };
  });
}

/* ------------------------------ settings store ------------------------------ */
// { [indicatorId]: { params: {…}, lines: { [lineKey]: { color, opacity, width, style, visible, colorDown? } }, hidden } }
const STORE_KEY = 'mavrix:chart:indicator-settings:v1';
let overrides = (() => {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
})();
let version = 0;
const listeners = new Set();

function emit() {
  version += 1;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(overrides)); } catch { /* private mode / quota */ }
  listeners.forEach((fn) => fn());
}

export const indicatorStore = {
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  getVersion: () => version,
  get: (id) => overrides[id] || {},
  /** Replace one indicator's overrides (pass null to reset it to the defaults). */
  set(id, next) {
    if (next == null || (!Object.keys(next.params || {}).length && !Object.keys(next.lines || {}).length && !next.hidden)) delete overrides[id];
    else overrides[id] = next;
    emit();
  },
  patch(id, fn) { this.set(id, fn(overrides[id] || {})); },
  snapshot: (id) => JSON.parse(JSON.stringify(overrides[id] || {})),
  isModified: (id) => !!overrides[id],
};

/* --------------------------------- registry --------------------------------- */
const SRC_PARAM = { key: 'source', label: 'Source', type: 'select', options: SOURCES.map((s) => ({ value: s.v, label: s.l })) };
const LEN = (def = 14, min = 1, max = 500) => ({ key: 'period', label: 'Length', type: 'int', min, max, def });

function make(def) {
  const entry = {
    id: def.id,
    group: def.group,
    overlay: def.overlay,
    primary: def.primary,
    intradayOnly: def.intradayOnly,
    height: def.height,
    range: def.range,
    paramSpecs: def.paramSpecs,
    defaultParams: def.defaults,
    defaultLines: def.lines,
    get params() {
      return { ...def.defaults, ...(overrides[def.id]?.params || {}) };
    },
    get hidden() { return !!overrides[def.id]?.hidden; },
    get label() { return def.title(this.params); },
    get defaultLabel() { return def.title(def.defaults); },
    get lines() {
      const ov = overrides[def.id]?.lines || {};
      return def.lines.map((ln) => {
        const o = ov[ln.k] || {};
        const dflt = parseColor(ln.color);
        const color = composeColor(o.color ?? dflt.hex, o.opacity ?? dflt.alpha);
        const style = o.style ?? (ln.dash ? 'dashed' : 'solid');
        const out = {
          ...ln,
          color,
          width: o.width ?? ln.width,
          lineStyle: style,
          dash: style !== 'solid',
          visible: o.visible !== false,
        };
        if (ln.type === 'hist') out.colorDown = composeColor(o.colorDown ?? '#ff5c5c', o.opacity ?? 0.55);
        return out;
      });
    },
    get levels() { return def.levels ? def.levels(this.params) : undefined; },
    calc(bars) {
      const p = this.params;
      const ln = this.lines.find((l) => l.type === 'hist');
      return def.calc(bars, p, ln ? { up: ln.color, down: ln.colorDown } : undefined);
    },
  };
  return entry;
}

const MA = (id, label, fn, period, color) => make({
  id, group: 'Moving averages', overlay: true, primary: 'v',
  paramSpecs: [LEN(period, 1, 500), SRC_PARAM],
  defaults: { period, source: 'close' },
  title: (p) => `${label} ${p.period}`,
  lines: [{ k: 'v', name: label, color }],
  calc: (b, p) => ({ v: fn(b, p.period, p.source) }),
});

export const INDICATORS = [
  MA('ema9', 'EMA', ema, 9, '#FFD166'),
  MA('ema20', 'EMA', ema, 20, '#F5B544'),
  MA('ema50', 'EMA', ema, 50, '#5EA8FF'),
  MA('ema200', 'EMA', ema, 200, '#FF8AD8'),
  MA('sma50', 'SMA', sma, 50, '#7DD3FC'),
  MA('sma200', 'SMA', sma, 200, '#B58CFF'),
  make({
    id: 'vwap', group: 'Overlays', overlay: true, primary: 'v', intradayOnly: true,
    paramSpecs: [{ ...SRC_PARAM, def: 'hlc3' }],
    defaults: { source: 'hlc3' },
    title: () => 'VWAP (daily)',
    lines: [{ k: 'v', name: 'VWAP', color: '#FF8AD8', width: 2 }],
    calc: (b, p) => ({ v: vwap(b, p.source) }),
  }),
  make({
    id: 'bb', group: 'Overlays', overlay: true, primary: 'm',
    paramSpecs: [LEN(20, 2, 500), { key: 'mult', label: 'Std. deviation', type: 'float', min: 0.1, max: 10, step: 0.1, def: 2 }, SRC_PARAM],
    defaults: { period: 20, mult: 2, source: 'close' },
    title: (p) => `Bollinger ${p.period}, ${p.mult}`,
    lines: [
      { k: 'u', name: 'Upper band', color: 'rgba(94,168,255,.75)', width: 1 },
      { k: 'm', name: 'Basis', color: 'rgba(94,168,255,.45)', width: 1, dash: true },
      { k: 'l', name: 'Lower band', color: 'rgba(94,168,255,.75)', width: 1 },
    ],
    calc: (b, p) => bollinger(b, p.period, p.mult, p.source),
  }),
  make({
    id: 'rsi', group: 'Oscillators', overlay: false, primary: 'v', height: 120, range: [0, 100],
    paramSpecs: [
      LEN(14, 2, 200), SRC_PARAM,
      { key: 'lower', label: 'Oversold level', type: 'float', min: 1, max: 99, step: 1, def: 30 },
      { key: 'upper', label: 'Overbought level', type: 'float', min: 1, max: 99, step: 1, def: 70 },
    ],
    defaults: { period: 14, source: 'close', lower: 30, upper: 70 },
    title: (p) => `RSI ${p.period}`,
    levels: (p) => [p.lower, p.upper],
    lines: [{ k: 'v', name: 'RSI', color: '#B58CFF', width: 1.5 }],
    calc: (b, p) => ({ v: rsi(b, p.period, p.source) }),
  }),
  make({
    id: 'macd', group: 'Oscillators', overlay: false, primary: 'm', height: 130,
    paramSpecs: [
      { key: 'fast', label: 'Fast length', type: 'int', min: 1, max: 200, def: 12 },
      { key: 'slow', label: 'Slow length', type: 'int', min: 2, max: 400, def: 26 },
      { key: 'signal', label: 'Signal length', type: 'int', min: 1, max: 200, def: 9 },
      SRC_PARAM,
    ],
    defaults: { fast: 12, slow: 26, signal: 9, source: 'close' },
    title: (p) => `MACD ${p.fast}, ${p.slow}, ${p.signal}`,
    lines: [
      { k: 'h', name: 'Histogram', color: 'rgba(53,196,161,.55)', type: 'hist' },
      { k: 'm', name: 'MACD line', color: '#5EA8FF', width: 1.5 },
      { k: 's', name: 'Signal line', color: '#F5B544', width: 1.5 },
    ],
    calc: (b, p, hist) => macd(b, p.fast, Math.max(p.slow, p.fast + 1), p.signal, p.source, hist?.up, hist?.down),
  }),
  make({
    id: 'atr', group: 'Volatility', overlay: false, primary: 'v', height: 100,
    paramSpecs: [LEN(14, 1, 200)],
    defaults: { period: 14 },
    title: (p) => `ATR ${p.period}`,
    lines: [{ k: 'v', name: 'ATR', color: '#7DD3FC', width: 1.5 }],
    calc: (b, p) => ({ v: atr(b, p.period) }),
  }),
];

export const INDICATOR_GROUPS = [...new Set(INDICATORS.map((i) => i.group))];
export const INDICATOR_BY_ID = Object.fromEntries(INDICATORS.map((i) => [i.id, i]));
