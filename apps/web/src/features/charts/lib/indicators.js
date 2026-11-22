// Pure indicator maths + registry. Bars are { time, open, high, low, close, volume }.
//
// Every indicator has editable INPUTS (period, source, ...) and per-line STYLE
// (colour, opacity, width, line style, visibility). Overrides live in a tiny
// persisted store (`indicatorStore`); the registry entries read it through
// getters, so anything that already renders `ind.label`, `ind.lines[].color`
// or calls `ind.calc(bars)` automatically reflects the user's settings.
import { composeColor, parseColor } from './colorUtil';

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

export function wma(bars, n, src = 'close') {
  const out = [];
  const v = bars.map((b) => pickSource(b, src));
  const denom = (n * (n + 1)) / 2;
  for (let i = n - 1; i < v.length; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) sum += v[i - n + 1 + j] * (j + 1);
    out.push({ time: bars[i].time, value: sum / denom });
  }
  return out;
}

// Stochastic oscillator: %K smoothed, %D = SMA of %K.
export function stochastic(bars, kLen = 14, smooth = 3, dLen = 3) {
  const raw = [];
  for (let i = kLen - 1; i < bars.length; i++) {
    let hh = -Infinity, ll = Infinity;
    for (let j = i - kLen + 1; j <= i; j++) { hh = Math.max(hh, num(bars[j].high)); ll = Math.min(ll, num(bars[j].low)); }
    raw.push({ time: bars[i].time, value: hh === ll ? 50 : ((num(bars[i].close) - ll) / (hh - ll)) * 100 });
  }
  const smoothSeries = (arr, n) => {
    const out = [];
    for (let i = n - 1; i < arr.length; i++) {
      let sum = 0;
      for (let j = i - n + 1; j <= i; j++) sum += arr[j].value;
      out.push({ time: arr[i].time, value: sum / n });
    }
    return out;
  };
  const k = smoothSeries(raw, Math.max(1, smooth));
  return { k, d: smoothSeries(k, Math.max(1, dLen)) };
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

/* --------------------------------- families --------------------------------- */
// A FAMILY is what you pick in the indicator menu (EMA, RSI, …). Every time you add one you get a
// new INSTANCE with its own inputs and style, so you can have EMA 20, EMA 50 and EMA 200 together.
const SRC_PARAM = { key: 'source', label: 'Source', type: 'select', options: SOURCES.map((s) => ({ value: s.v, label: s.l })) };
const LEN = (def = 14, min = 1, max = 500) => ({ key: 'period', label: 'Length', type: 'int', min, max, def });

// Distinct colours handed to new single-line instances so several of one family are easy to tell apart.
export const INSTANCE_COLORS = ['#F5B544', '#5EA8FF', '#FF8AD8', '#35C4A1', '#B58CFF', '#FFD166', '#7DD3FC', '#FF8F5C', '#A3E635', '#E7E9EE'];
// Lengths suggested for the 1st, 2nd, 3rd… moving average you add.
const MA_LENGTHS = [20, 50, 200, 9, 100, 21, 55, 10, 30, 150];

const MA_FAMILY = (id, name, short, fn, desc) => ({
  id, name, short, desc, group: 'Moving averages', overlay: true, primary: 'v', rotateColor: true,
  suggest: (n) => ({ period: MA_LENGTHS[n % MA_LENGTHS.length] }),
  paramSpecs: [LEN(20, 1, 500), SRC_PARAM],
  defaults: { period: 20, source: 'close' },
  title: (p) => `${short} ${p.period}`,
  lines: [{ k: 'v', name: short, color: '#F5B544' }],
  calc: (b, p) => ({ v: fn(b, p.period, p.source) }),
});

const FAMILY_LIST = [
  MA_FAMILY('ema', 'Exponential Moving Average', 'EMA', ema, 'Reacts faster to recent price than an SMA.'),
  MA_FAMILY('sma', 'Simple Moving Average', 'SMA', sma, 'Plain average of the last N values.'),
  MA_FAMILY('wma', 'Weighted Moving Average', 'WMA', wma, 'Recent values count more, linearly.'),
  {
    id: 'vwap', name: 'VWAP', short: 'VWAP', desc: 'Volume-weighted average price, reset daily.', group: 'Overlays', overlay: true, primary: 'v', intradayOnly: true, rotateColor: true,
    paramSpecs: [{ ...SRC_PARAM, def: 'hlc3' }],
    defaults: { source: 'hlc3' },
    title: () => 'VWAP (daily)',
    lines: [{ k: 'v', name: 'VWAP', color: '#FF8AD8', width: 2 }],
    calc: (b, p) => ({ v: vwap(b, p.source) }),
  },
  {
    id: 'bb', name: 'Bollinger Bands', short: 'BB', desc: 'Moving average with standard-deviation bands.', group: 'Overlays', overlay: true, primary: 'm',
    paramSpecs: [LEN(20, 2, 500), { key: 'mult', label: 'Std. deviation', type: 'float', min: 0.1, max: 10, step: 0.1, def: 2 }, SRC_PARAM],
    defaults: { period: 20, mult: 2, source: 'close' },
    title: (p) => `Bollinger ${p.period}, ${p.mult}`,
    lines: [
      { k: 'u', name: 'Upper band', color: 'rgba(94,168,255,.75)', width: 1 },
      { k: 'm', name: 'Basis', color: 'rgba(94,168,255,.45)', width: 1, dash: true },
      { k: 'l', name: 'Lower band', color: 'rgba(94,168,255,.75)', width: 1 },
    ],
    calc: (b, p) => bollinger(b, p.period, p.mult, p.source),
  },
  {
    id: 'rsi', name: 'Relative Strength Index', short: 'RSI', desc: 'Momentum oscillator, 0–100.', group: 'Oscillators', overlay: false, primary: 'v', height: 120, range: [0, 100], rotateColor: true,
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
  },
  {
    id: 'stoch', name: 'Stochastic Oscillator', short: 'Stoch', desc: '%K / %D momentum oscillator, 0–100.', group: 'Oscillators', overlay: false, primary: 'k', height: 120, range: [0, 100],
    paramSpecs: [
      { key: 'k', label: '%K length', type: 'int', min: 1, max: 200, def: 14 },
      { key: 'smooth', label: '%K smoothing', type: 'int', min: 1, max: 50, def: 3 },
      { key: 'd', label: '%D smoothing', type: 'int', min: 1, max: 50, def: 3 },
      { key: 'lower', label: 'Oversold level', type: 'float', min: 1, max: 99, step: 1, def: 20 },
      { key: 'upper', label: 'Overbought level', type: 'float', min: 1, max: 99, step: 1, def: 80 },
    ],
    defaults: { k: 14, smooth: 3, d: 3, lower: 20, upper: 80 },
    title: (p) => `Stoch ${p.k}, ${p.smooth}, ${p.d}`,
    levels: (p) => [p.lower, p.upper],
    lines: [
      { k: 'k', name: '%K', color: '#5EA8FF', width: 1.5 },
      { k: 'd', name: '%D', color: '#F5B544', width: 1.5 },
    ],
    calc: (b, p) => stochastic(b, p.k, p.smooth, p.d),
  },
  {
    id: 'macd', name: 'MACD', short: 'MACD', desc: 'Trend/momentum from two EMAs, with signal and histogram.', group: 'Oscillators', overlay: false, primary: 'm', height: 130,
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
  },
  {
    id: 'atr', name: 'Average True Range', short: 'ATR', desc: 'Volatility in price units.', group: 'Volatility', overlay: false, primary: 'v', height: 100, rotateColor: true,
    paramSpecs: [LEN(14, 1, 200)],
    defaults: { period: 14 },
    title: (p) => `ATR ${p.period}`,
    lines: [{ k: 'v', name: 'ATR', color: '#7DD3FC', width: 1.5 }],
    calc: (b, p) => ({ v: atr(b, p.period) }),
  },
  // GEX: shows horizontal lines at GEX level prices from the market data JSON.
  {
    id: 'gex', name: 'GEX', short: 'GEX', desc: 'Shows horizontal lines at GEX level prices.', group: 'Overlays', overlay: true, primary: 'gex', rotateColor: false,
    paramSpecs: [],
    defaults: {},
    title: () => 'GEX',
    lines: [
      { k: 'gex', name: 'GEX', color: '#F5B544', width: 2, lineStyle: 'solid' },
      { k: 'support', name: 'Support', color: '#35C4A1', width: 2, lineStyle: 'solid' },
      { k: 'resistance', name: 'Resistance', color: '#FF5C5C', width: 2, lineStyle: 'dashed', dash: true },
      { k: 'oneD', name: '1D', color: '#FFFFFF', width: 1, lineStyle: 'dotted' },
      { k: 'hvl', name: 'HVL', color: '#5EA8FF', width: 2, lineStyle: 'dashed', dash: true },
    ],
    calc: () => ({ gex: [], support: [], resistance: [], oneD: [], hvl: [] }),
  },
];

export const FAMILIES = FAMILY_LIST.map((f) => ({ ...f }));
export const FAMILY_BY_ID = Object.fromEntries(FAMILIES.map((f) => [f.id, f]));
export const FAMILY_GROUPS = [...new Set(FAMILIES.map((f) => f.group))];

// Ids used before indicators became instances (saved chart prefs still list them).
const LEGACY = {
  ema9: { family: 'ema', params: { period: 9 }, color: '#FFD166' },
  ema20: { family: 'ema', params: { period: 20 }, color: '#F5B544' },
  ema50: { family: 'ema', params: { period: 50 }, color: '#5EA8FF' },
  ema200: { family: 'ema', params: { period: 200 }, color: '#FF8AD8' },
  sma50: { family: 'sma', params: { period: 50 }, color: '#7DD3FC' },
  sma200: { family: 'sma', params: { period: 200 }, color: '#B58CFF' },
  vwap: { family: 'vwap' }, bb: { family: 'bb' }, rsi: { family: 'rsi' }, macd: { family: 'macd' }, atr: { family: 'atr' },
};

/* ------------------------------ instance store ------------------------------ */
// { [instanceId]: { family, params?: {…}, lines?: { [lineKey]: { color, opacity, width, style, visible, colorDown } }, hidden?: bool } }
const STORE_KEY = 'mavrix:chart:indicators:v2';
const OLD_KEY = 'mavrix:chart:indicator-settings:v1'; // previous release: overrides keyed by the legacy ids

const readJson = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
let instances = readJson(STORE_KEY) || {};
let oldOverrides = readJson(OLD_KEY) || {};
let version = 0;
let request = null; // "open the settings dialog for this instance" (set by the toolbar menu)
const listeners = new Set();
const cache = new Map();

function persist() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(instances)); } catch { /* private mode / quota */ }
}
function emit() {
  version += 1;
  persist();
  listeners.forEach((fn) => fn());
}

function buildInstance(id) {
  const rec = () => instances[id];
  const famId = rec().family; // fixed for the life of an instance
  const fam = () => FAMILY_BY_ID[famId];
  const f0 = FAMILY_BY_ID[famId];
  return {
    id,
    family: f0.id,
    name: f0.name,
    group: f0.group,
    overlay: f0.overlay,
    primary: f0.primary,
    intradayOnly: f0.intradayOnly,
    height: f0.height,
    range: f0.range,
    paramSpecs: f0.paramSpecs,
    get params() { return { ...fam().defaults, ...(rec()?.params || {}) }; },
    get hidden() { return !!rec()?.hidden; },
    get label() { return fam().title(this.params); },
    get lines() {
      const ov = rec()?.lines || {};
      return fam().lines.map((ln) => {
        const o = ov[ln.k] || {};
        const dflt = parseColor(ln.color);
        const style = o.style ?? (ln.lineStyle || (ln.dash ? 'dashed' : 'solid'));
        const out = {
          ...ln,
          color: composeColor(o.color ?? dflt.hex, o.opacity ?? dflt.alpha),
          width: o.width ?? ln.width,
          lineStyle: style,
          dash: style !== 'solid',
          visible: o.visible !== false,
        };
        if (ln.type === 'hist') out.colorDown = composeColor(o.colorDown ?? '#ff5c5c', o.opacity ?? 0.55);
        return out;
      });
    },
    get levels() { return fam().levels ? fam().levels(this.params) : undefined; },
    calc(bars) {
      const hist = this.lines.find((l) => l.type === 'hist');
      return fam().calc(bars, this.params, hist ? { up: hist.color, down: hist.colorDown } : undefined);
    },
  };
}

const newId = (family) => `${family}-${Math.random().toString(36).slice(2, 7)}`;

export const indicatorStore = {
  subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  getVersion: () => version,

  /** The live indicator object for an instance id (or null). Legacy ids like "ema20" are migrated on first use. */
  resolve(id) {
    if (!id) return null;
    if (!instances[id]) {
      const legacy = LEGACY[id];
      if (!legacy) return null;
      const old = oldOverrides[id] || {};
      const rec = { family: legacy.family };
      const params = { ...(legacy.params || {}), ...(old.params || {}) };
      if (Object.keys(params).length) rec.params = params;
      const fam = FAMILY_BY_ID[legacy.family];
      const lines = { ...(old.lines || {}) };
      if (legacy.color && fam.primary && !lines[fam.primary]?.color) lines[fam.primary] = { ...(lines[fam.primary] || {}), color: legacy.color };
      if (Object.keys(lines).length) rec.lines = lines;
      if (old.hidden) rec.hidden = true;
      instances[id] = rec; // no emit: migration is invisible to subscribers, persisted with the next change
    }
    if (!cache.has(id)) cache.set(id, buildInstance(id));
    return cache.get(id);
  },

  /** Create a new instance of a family and return its id. Single-line families get a fresh colour + suggested length. */
  create(familyId) {
    const fam = FAMILY_BY_ID[familyId];
    if (!fam) return null;
    const n = Object.values(instances).filter((r) => r.family === familyId).length;
    const id = newId(familyId);
    const rec = { family: familyId };
    const sug = fam.suggest?.(n);
    if (sug) rec.params = sug;
    if (fam.rotateColor) rec.lines = { [fam.primary]: { color: INSTANCE_COLORS[n % INSTANCE_COLORS.length] } };
    instances[id] = rec;
    emit();
    return id;
  },

  /** Forget an instance (called when it is removed from the chart). */
  remove(id) {
    if (!instances[id]) return;
    delete instances[id];
    cache.delete(id);
    emit();
  },

  /** Number of instances of a family among the given ids. */
  countOf(familyId, ids) {
    return ids.reduce((n, id) => n + (this.resolve(id)?.family === familyId ? 1 : 0), 0);
  },

  get: (id) => instances[id] || {},
  snapshot: (id) => JSON.parse(JSON.stringify(instances[id] || {})),
  /** Put a snapshot back (Cancel in the settings dialog). */
  restore(id, rec) {
    if (!rec || !rec.family) return;
    instances[id] = rec;
    emit();
  },
  patch(id, fn) {
    const cur = instances[id];
    if (!cur) return;
    const next = fn(cur) || cur;
    instances[id] = { ...next, family: cur.family };
    emit();
  },
  /** Back to the family's defaults (inputs + style) — the instance stays on the chart. */
  reset(id) {
    const cur = instances[id];
    if (!cur) return;
    instances[id] = { family: cur.family };
    emit();
  },
  isModified: (id) => {
    const r = instances[id];
    return !!r && (Object.keys(r.params || {}).length > 0 || Object.keys(r.lines || {}).length > 0 || !!r.hidden);
  },

  // ---- "open settings for X" hand-off from the toolbar menu to the chart that owns the dialog ----
  requestSettings(id) { request = id; emit(); },
  peekRequest: () => request,
  clearRequest() { request = null; },
};

/** Convenience wrapper used by the chart. */
export const resolveIndicator = (id) => indicatorStore.resolve(id);
