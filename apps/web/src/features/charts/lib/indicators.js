// Pure indicator maths + registry. Bars are { time, open, high, low, close, volume }.
const num = (v) => Number(v);

export function sma(bars, n) {
  const out = [];
  let sum = 0;
  bars.forEach((b, i) => {
    sum += num(b.close);
    if (i >= n) sum -= num(bars[i - n].close);
    if (i >= n - 1) out.push({ time: b.time, value: sum / n });
  });
  return out;
}

// EMA seeded with an SMA of the first n values (matches most platforms).
function emaValues(values, n) {
  const k = 2 / (n + 1);
  const out = new Array(values.length).fill(null);
  let prev = null;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v == null) continue;
    if (prev == null) {
      sum += v;
      const count = values.slice(0, i + 1).filter((x) => x != null).length;
      if (count === n) { prev = sum / n; out[i] = prev; }
    } else {
      prev = v * k + prev * (1 - k);
      out[i] = prev;
    }
  }
  return out;
}

export function ema(bars, n) {
  const vals = emaValues(bars.map((b) => num(b.close)), n);
  const out = [];
  vals.forEach((v, i) => { if (v != null) out.push({ time: bars[i].time, value: v }); });
  return out;
}

export function vwap(bars) {
  const out = [];
  let day = null, pv = 0, vol = 0;
  for (const b of bars) {
    const t = typeof b.time === 'number' ? b.time : Date.parse(`${b.time}T00:00:00Z`) / 1000;
    const d = Math.floor(t / 86400);
    if (d !== day) { day = d; pv = 0; vol = 0; }
    const v = num(b.volume) || 0;
    pv += ((num(b.high) + num(b.low) + num(b.close)) / 3) * v;
    vol += v;
    if (vol > 0) out.push({ time: b.time, value: pv / vol });
  }
  return out;
}

export function bollinger(bars, n = 20, k = 2) {
  const u = [], m = [], l = [];
  for (let i = n - 1; i < bars.length; i++) {
    let s = 0;
    for (let j = i - n + 1; j <= i; j++) s += num(bars[j].close);
    const mean = s / n;
    let v = 0;
    for (let j = i - n + 1; j <= i; j++) v += (num(bars[j].close) - mean) ** 2;
    const sd = Math.sqrt(v / n);
    const time = bars[i].time;
    u.push({ time, value: mean + k * sd });
    m.push({ time, value: mean });
    l.push({ time, value: mean - k * sd });
  }
  return { u, m, l };
}

// Wilder's RSI
export function rsi(bars, n = 14) {
  const out = [];
  let g = 0, l = 0;
  for (let i = 1; i < bars.length; i++) {
    const d = num(bars[i].close) - num(bars[i - 1].close);
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

export function macd(bars, fast = 12, slow = 26, signal = 9) {
  const closes = bars.map((b) => num(b.close));
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
      h.push({ time: b.time, value: hv, color: hv >= 0 ? 'rgba(53,196,161,.55)' : 'rgba(255,92,92,.55)' });
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

/*
  Registry. overlay:true draws on the price pane, otherwise in its own pane.
  lines[].type: 'line' (default) | 'hist'.
*/
export const INDICATORS = [
  { id: 'ema9', label: 'EMA 9', group: 'Moving averages', overlay: true, primary: 'v', lines: [{ k: 'v', color: '#FFD166' }], calc: (b) => ({ v: ema(b, 9) }) },
  { id: 'ema20', label: 'EMA 20', group: 'Moving averages', overlay: true, primary: 'v', lines: [{ k: 'v', color: '#F5B544' }], calc: (b) => ({ v: ema(b, 20) }) },
  { id: 'ema50', label: 'EMA 50', group: 'Moving averages', overlay: true, primary: 'v', lines: [{ k: 'v', color: '#5EA8FF' }], calc: (b) => ({ v: ema(b, 50) }) },
  { id: 'ema200', label: 'EMA 200', group: 'Moving averages', overlay: true, primary: 'v', lines: [{ k: 'v', color: '#FF8AD8' }], calc: (b) => ({ v: ema(b, 200) }) },
  { id: 'sma50', label: 'SMA 50', group: 'Moving averages', overlay: true, primary: 'v', lines: [{ k: 'v', color: '#7DD3FC' }], calc: (b) => ({ v: sma(b, 50) }) },
  { id: 'sma200', label: 'SMA 200', group: 'Moving averages', overlay: true, primary: 'v', lines: [{ k: 'v', color: '#B58CFF' }], calc: (b) => ({ v: sma(b, 200) }) },
  { id: 'vwap', label: 'VWAP (daily)', group: 'Overlays', overlay: true, primary: 'v', intradayOnly: true, lines: [{ k: 'v', color: '#FF8AD8', width: 2 }], calc: (b) => ({ v: vwap(b) }) },
  {
    id: 'bb', label: 'Bollinger 20, 2', group: 'Overlays', overlay: true, primary: 'm',
    lines: [
      { k: 'u', color: 'rgba(94,168,255,.75)', width: 1 },
      { k: 'm', color: 'rgba(94,168,255,.45)', width: 1, dash: true },
      { k: 'l', color: 'rgba(94,168,255,.75)', width: 1 },
    ],
    calc: (b) => bollinger(b, 20, 2),
  },
  { id: 'rsi', label: 'RSI 14', group: 'Oscillators', overlay: false, primary: 'v', height: 120, range: [0, 100], levels: [30, 70], lines: [{ k: 'v', color: '#B58CFF', width: 1.5 }], calc: (b) => ({ v: rsi(b, 14) }) },
  {
    id: 'macd', label: 'MACD 12, 26, 9', group: 'Oscillators', overlay: false, primary: 'm', height: 130,
    lines: [
      { k: 'h', color: 'rgba(53,196,161,.55)', type: 'hist' },
      { k: 'm', color: '#5EA8FF', width: 1.5 },
      { k: 's', color: '#F5B544', width: 1.5 },
    ],
    calc: (b) => macd(b, 12, 26, 9),
  },
  { id: 'atr', label: 'ATR 14', group: 'Volatility', overlay: false, primary: 'v', height: 100, lines: [{ k: 'v', color: '#7DD3FC', width: 1.5 }], calc: (b) => ({ v: atr(b, 14) }) },
];

export const INDICATOR_GROUPS = [...new Set(INDICATORS.map((i) => i.group))];
