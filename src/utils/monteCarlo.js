// src/utils/monteCarlo.js
// Monte Carlo engine for trade sequences.
// Two methods:
//   - permutation: shuffle order without replacement (same trades, different order)
//   - bootstrap:   sample with replacement (sample-size uncertainty)
// Uses a seeded PRNG for reproducibility.

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Per-run metric extraction ---
function analyzeCurve(curve, ruinThreshold) {
  const n = curve.length - 1;
  let peak = 0, maxDD = 0, ruinHit = false;
  for (let i = 1; i <= n; i++) {
    const v = curve[i];
    if (v > peak) peak = v;
    const dd = v - peak;
    if (dd < maxDD) maxDD = dd;
    if (ruinThreshold !== null && v <= ruinThreshold) ruinHit = true;
  }
  return { final: curve[n], maxDD, ruinHit };
}

function analyzeStreaks(seq) {
  let curW = 0, curL = 0, maxW = 0, maxL = 0;
  for (const s of seq) {
    if (s > 0) { curW++; curL = 0; if (curW > maxW) maxW = curW; }
    else if (s < 0) { curL++; curW = 0; if (curL > maxL) maxL = curL; }
  }
  return { maxW, maxL };
}

function analyzeRecovery(curve) {
  const n = curve.length - 1;
  let peak = 0, peakIdx = 0;
  let worstDD = 0, ddStart = 0, ddEnd = -1;
  let curDDStart = 0;

  for (let i = 0; i <= n; i++) {
    const v = curve[i];
    if (v >= peak) {
      if (worstDD < 0 && ddEnd === -1 && curDDStart > 0) ddEnd = i;
      peak = v;
      peakIdx = i;
    } else {
      const dd = v - peak;
      if (dd < worstDD) {
        worstDD = dd;
        ddStart = peakIdx;
        curDDStart = peakIdx;
      }
    }
  }
  // Never recovered if still underwater at end
  if (ddEnd === -1 && curve[n] < peak) return -1;
  return Math.max(0, ddEnd - ddStart);
}

function analyzeRatios(seq) {
  const n = seq.length;
  if (n === 0) return { sharpe: 0, sortino: 0, pf: 0, expectancy: 0, winRate: 0 };

  let sum = 0, winSum = 0, lossSum = 0, winCount = 0, lossCount = 0;
  for (const s of seq) {
    sum += s;
    if (s > 0) { winSum += s; winCount++; }
    else if (s < 0) { lossSum += s; lossCount++; }
  }
  const mean = sum / n;

  let varSum = 0, downSum = 0;
  for (const s of seq) {
    const d = s - mean;
    varSum += d * d;
    const dn = Math.min(0, s);
    downSum += dn * dn;
  }
  const std = Math.sqrt(varSum / n);
  const downStd = Math.sqrt(downSum / n);
  const sharpe = std > 0 ? mean / std : 0;
  const sortino = downStd > 0 ? mean / downStd : 0;
  const pf = lossSum !== 0 ? winSum / Math.abs(lossSum) : (winSum > 0 ? Infinity : 0);
  const winRate = n > 0 ? winCount / n : 0;

  return { sharpe, sortino, pf, expectancy: mean, winRate };
}

// --- Main entry point ---
export function runMonteCarlo(scores, options = {}) {
  const {
    method = 'permutation',
    runs = 1000,
    seed = 42,
    ruinThreshold = null,
    targets = [],
  } = options;

  if (!scores || scores.length < 2) return null;
  const n = scores.length;
  const rand = mulberry32(seed);
  const randInt = (max) => Math.floor(rand() * max);

  const curves = new Array(runs);
  const maxDDs = new Float64Array(runs);
  const finalValues = new Float64Array(runs);
  const sharpes = new Float64Array(runs);
  const sortinos = new Float64Array(runs);
  const pfs = new Float64Array(runs);
  const expectancies = new Float64Array(runs);
  const winRates = new Float64Array(runs);
  const longestWins = new Int32Array(runs);
  const longestLosses = new Int32Array(runs);
  const recoveryTrades = new Int32Array(runs);

  let ruinCount = 0, profitCount = 0;
  const base = scores.slice();
  const buf = new Float64Array(n);

  for (let r = 0; r < runs; r++) {
    // 1. Generate sequence
    if (method === 'bootstrap') {
      for (let i = 0; i < n; i++) buf[i] = base[randInt(n)];
    } else {
      for (let i = 0; i < n; i++) buf[i] = base[i];
      for (let i = n - 1; i > 0; i--) {
        const j = randInt(i + 1);
        const tmp = buf[i]; buf[i] = buf[j]; buf[j] = tmp;
      }
    }

    // 2. Cumulative curve
    const curve = new Float64Array(n + 1);
    curve[0] = 0;
    let cum = 0;
    for (let i = 0; i < n; i++) {
      cum += buf[i];
      curve[i + 1] = cum;
    }
    curves[r] = curve;

    // 3. Metrics
    const a = analyzeCurve(curve, ruinThreshold);
    finalValues[r] = a.final;
    maxDDs[r] = a.maxDD;
    if (a.ruinHit) ruinCount++;
    if (a.final > 0) profitCount++;

    const streaks = analyzeStreaks(buf);
    longestWins[r] = streaks.maxW;
    longestLosses[r] = streaks.maxL;

    const ratios = analyzeRatios(buf);
    sharpes[r] = ratios.sharpe;
    sortinos[r] = ratios.sortino;
    pfs[r] = isFinite(ratios.pf) ? ratios.pf : 9999;
    expectancies[r] = ratios.expectancy;
    winRates[r] = ratios.winRate;

    recoveryTrades[r] = analyzeRecovery(curve);
  }

  // 4. Percentile bands
  const p5 = new Float64Array(n + 1);
  const p25 = new Float64Array(n + 1);
  const p50 = new Float64Array(n + 1);
  const p75 = new Float64Array(n + 1);
  const p95 = new Float64Array(n + 1);
  const sortBuf = new Float64Array(runs);

  for (let i = 0; i <= n; i++) {
    for (let r = 0; r < runs; r++) sortBuf[r] = curves[r][i];
    sortBuf.sort();
    p5[i]  = sortBuf[Math.floor(0.05 * (runs - 1))];
    p25[i] = sortBuf[Math.floor(0.25 * (runs - 1))];
    p50[i] = sortBuf[Math.floor(0.50 * (runs - 1))];
    p75[i] = sortBuf[Math.floor(0.75 * (runs - 1))];
    p95[i] = sortBuf[Math.floor(0.95 * (runs - 1))];
  }

  // 5. Time-to-target
  const timeToTarget = targets.map(target => {
    let hit = 0;
    const times = [];
    for (const c of curves) {
      for (let i = 1; i < c.length; i++) {
        if (c[i] >= target) { hit++; times.push(i); break; }
      }
    }
    times.sort((a, b) => a - b);
    return {
      target,
      successPct: (hit / runs) * 100,
      medianTrades: times.length ? times[Math.floor(0.5 * (times.length - 1))] : null,
      p25Trades: times.length ? times[Math.floor(0.25 * (times.length - 1))] : null,
      p75Trades: times.length ? times[Math.floor(0.75 * (times.length - 1))] : null,
    };
  });

  return {
    method, runs, n, ruinThreshold, seed,
    percentiles: {
      p5: Array.from(p5), p25: Array.from(p25), p50: Array.from(p50),
      p75: Array.from(p75), p95: Array.from(p95),
    },
    maxDDs: Array.from(maxDDs),
    finalValues: Array.from(finalValues),
    sharpes: Array.from(sharpes),
    sortinos: Array.from(sortinos),
    profitFactors: Array.from(pfs),
    expectancies: Array.from(expectancies),
    winRates: Array.from(winRates),
    longestWins: Array.from(longestWins),
    longestLosses: Array.from(longestLosses),
    recoveryTrades: Array.from(recoveryTrades),
    ruinCount, ruinPct: (ruinCount / runs) * 100,
    profitCount, profitPct: (profitCount / runs) * 100,
    timeToTarget,
  };
}

// --- Generic histogram builder ---
export function buildHistogram(values, bucketCount = 12) {
  if (!values || values.length === 0) return null;
  let min = Infinity, max = -Infinity;
  for (const v of values) {
    if (!isFinite(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!isFinite(min) || !isFinite(max)) return null;
  if (min === max) { min -= 0.5; max += 0.5; }
  const bucketSize = (max - min) / bucketCount;
  const counts = new Array(bucketCount).fill(0);
  for (const v of values) {
    if (!isFinite(v)) continue;
    let idx = Math.floor((v - min) / bucketSize);
    if (idx >= bucketCount) idx = bucketCount - 1;
    if (idx < 0) idx = 0;
    counts[idx]++;
  }
  const labels = [];
  for (let i = 0; i < bucketCount; i++) {
    const s = min + i * bucketSize;
    const e = s + bucketSize;
    labels.push(`${s.toFixed(2)}..${e.toFixed(2)}`);
  }
  return { labels, counts, min, max, bucketSize };
}

// --- Percentile from any array ---
export function pct(arr, p) {
  if (!arr || arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor(p * (s.length - 1))];
}

// --- Summary object for KPI cards and CI table ---
export function summarizeMC(result) {
  if (!result) return null;
  const { n, runs, percentiles } = result;
  const last = n;
  return {
    runs, n,
    medianFinal: percentiles.p50[last],
    p5Final:     percentiles.p5[last],
    p95Final:    percentiles.p95[last],
    p25Final:    percentiles.p25[last],
    p75Final:    percentiles.p75[last],
    maxDD_p5:    pct(result.maxDDs, 0.05),
    maxDD_p25:   pct(result.maxDDs, 0.25),
    maxDD_p50:   pct(result.maxDDs, 0.50),
    maxDD_p75:   pct(result.maxDDs, 0.75),
    maxDD_p95:   pct(result.maxDDs, 0.95),
    sharpe_p5:   pct(result.sharpes, 0.05),
    sharpe_p50:  pct(result.sharpes, 0.50),
    sharpe_p95:  pct(result.sharpes, 0.95),
    sortino_p50: pct(result.sortinos, 0.50),
    pf_p50:      pct(result.profitFactors, 0.50),
    exp_p50:     pct(result.expectancies, 0.50),
    win_p50:     pct(result.winRates, 0.50),
    winStreak_p95:  pct(result.longestWins, 0.95),
    lossStreak_p95: pct(result.longestLosses, 0.95),
    profitPct: result.profitPct,
    ruinPct: result.ruinPct,
  };
}