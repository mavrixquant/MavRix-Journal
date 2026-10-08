// apps/web/src/features/charts/lib/indicators.js
//
// Pure math for the chart overlays. Each function returns an array of
// { time, value } objects in the exact shape lightweight-charts expects.

/* ------------------------------------------------------------------ */
/*  EMA                                                               */
/* ------------------------------------------------------------------ */

export function computeEMA(bars, period) {
  if (!bars || bars.length < period) return [];
  const k = 2 / (period + 1);

  let sum = 0;
  for (let i = 0; i < period; i++) sum += bars[i].close;
  let ema = sum / period;

  const out = [{ time: bars[period - 1].time, value: ema }];
  for (let i = period; i < bars.length; i++) {
    ema = bars[i].close * k + ema * (1 - k);
    out.push({ time: bars[i].time, value: ema });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  VWAP (resets each UTC day)                                        */
/* ------------------------------------------------------------------ */

function dayKey(time) {
  if (typeof time === 'string') return time;
  return new Date(time * 1000).toISOString().slice(0, 10);
}

export function computeVWAP(bars) {
  if (!bars || bars.length === 0) return [];
  const out = [];
  let cumTPV = 0;
  let cumVol = 0;
  let currentDay = null;

  for (const b of bars) {
    const d = dayKey(b.time);
    if (d !== currentDay) {
      cumTPV = 0;
      cumVol = 0;
      currentDay = d;
    }
    const tp = (b.high + b.low + b.close) / 3;
    cumTPV += tp * (b.volume || 0);
    cumVol += b.volume || 0;
    if (cumVol > 0) out.push({ time: b.time, value: cumTPV / cumVol });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Bollinger Bands                                                   */
/* ------------------------------------------------------------------ */

export function computeBollinger(bars, period = 20, mult = 2) {
  if (!bars || bars.length < period) return { upper: [], middle: [], lower: [] };

  const upper = [];
  const middle = [];
  const lower = [];

  for (let i = period - 1; i < bars.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += bars[j].close;
    const sma = sum / period;

    let variance = 0;
    for (let j = i - period + 1; j <= i; j++) {
      variance += (bars[j].close - sma) ** 2;
    }
    const sd = Math.sqrt(variance / period);

    upper.push({ time: bars[i].time, value: sma + mult * sd });
    middle.push({ time: bars[i].time, value: sma });
    lower.push({ time: bars[i].time, value: sma - mult * sd });
  }

  return { upper, middle, lower };
}

/* ------------------------------------------------------------------ */
/*  Bundled compute — one call per render                             */
/* ------------------------------------------------------------------ */

export function computeIndicators(bars, flags) {
  return {
    ema20: flags.ema20 ? computeEMA(bars, 20) : [],
    ema50: flags.ema50 ? computeEMA(bars, 50) : [],
    vwap: flags.vwap ? computeVWAP(bars) : [],
    bb: flags.bb ? computeBollinger(bars, 20, 2) : { upper: [], middle: [], lower: [] },
  };
}