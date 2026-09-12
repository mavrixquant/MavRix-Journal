// src/utils/monteCarlo.js
// ---------------------------------------------------------------------------
// Monte Carlo engine for trade sequences.
//
// Three methods, each mathematically distinct:
//
//   permutation — reshuffle the same N trades. Total is invariant; only the
//                 order changes. Answers: "how much does sequence hurt me?"
//                 P(Profit) is degenerate here (always 0% or 100%).
//
//   bootstrap   — sample N trades with replacement. Total varies because the
//                 win/loss mix varies per draw. Answers: "if I re-ran this
//                 strategy on a fresh sample from the same edge, what range
//                 of outcomes would I see?"
//
//   block       — sliding-window block bootstrap. Preserves local streak
//                 structure. Answers: "what if my wins/losses cluster?"
//
// All units are whatever's in `scores` — R multiples for Backtest accounts,
// account-currency units for Live/Demo. The engine never mixes them.
// ---------------------------------------------------------------------------

// --- Seeded PRNG (mulberry32) ---
function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- Per-run analyzers -----------------------------------------------------

// Scans a cumulative curve for max drawdown and (optional) ruin breach.
// Returns { final, maxDD, ruinIndex } where ruinIndex = -1 means "never".
function analyzeCurve(curve, ruinThreshold) {
  const n = curve.length - 1;
  let peak = 0;
  let maxDD = 0;
  let ruinIndex = -1;

  for (let i = 1; i <= n; i++) {
    const v = curve[i];
    if (v > peak) peak = v;
    const dd = v - peak;
    if (dd < maxDD) maxDD = dd;
    if (ruinIndex === -1 && ruinThreshold != null && v <= ruinThreshold) {
      ruinIndex = i;
    }
  }
  return { final: curve[n], maxDD, ruinIndex };
}

// Longest win / loss streak in a sequence.
function analyzeStreaks(seq) {
  let curW = 0, curL = 0, maxW = 0, maxL = 0;
  for (const s of seq) {
    if (s > 0) { curW++; curL = 0; if (curW > maxW) maxW = curW; }
    else if (s < 0) { curL++; curW = 0; if (curL > maxL) maxL = curL; }
  }
  return { maxW, maxL };
}

// Trades it took to fully recover from the worst drawdown.
// Returns -1 if the curve is still underwater at the end.
function analyzeRecovery(curve) {
  const n = curve.length - 1;
  let peak = 0, peakIdx = 0;
  let worstDD = 0, ddPeakIdx = 0;
  let endIdx = -1;

  for (let i = 0; i <= n; i++) {
    const v = curve[i];
    if (v >= peak) {
      if (worstDD < 0 && endIdx === -1 && i > ddPeakIdx) endIdx = i;
      peak = v;
      peakIdx = i;
    } else {
      const dd = v - peak;
      if (dd < worstDD) {
        worstDD = dd;
        ddPeakIdx = peakIdx;
      }
    }
  }
  if (endIdx === -1 && curve[n] < peak) return -1;
  return Math.max(0, endIdx - ddPeakIdx);
}

// Per-run ratios: sharpe, sortino, profit factor, expectancy, win rate.
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

// --- Sequence generators ---------------------------------------------------

function generatePermutation(base, n, randInt, out) {
  for (let i = 0; i < n; i++) out[i] = base[i];
  // Fisher–Yates
  for (let i = n - 1; i > 0; i--) {
    const j = randInt(i + 1);
    const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
  }
}

function generateBootstrap(base, n, randInt, out) {
  for (let i = 0; i < n; i++) out[i] = base[randInt(n)];
}

function generateBlockBootstrap(base, n, blockSize, randInt, out) {
  const L = Math.max(2, Math.min(blockSize, n));
  let cursor = 0;
  while (cursor < n) {
    const start = randInt(n - L + 1);
    const take = Math.min(L, n - cursor);
    for (let k = 0; k < take; k++) {
      out[cursor + k] = base[start + k];
    }
    cursor += take;
  }
}

// --- Percentile helper (with linear interpolation) ------------------------
function percentile(sortedAsc, p) {
  const len = sortedAsc.length;
  if (len === 0) return 0;
  if (len === 1) return sortedAsc[0];
  const idx = p * (len - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  return sortedAsc[lo] + (sortedAsc[hi] - sortedAsc[lo]) * (idx - lo);
}

// --- Main entry point ------------------------------------------------------
export function runMonteCarlo(scores, options = {}) {
  const {
    method = 'permutation',
    runs = 1000,
    seed = 42,
    ruinThreshold = null,
    targets = [],
    initialCapital = 0,
    blockSize = 5,
  } = options;

  if (!scores || scores.length < 2) return null;

  const n = scores.length;
  const rand = mulberry32(seed);
  const randInt = (max) => Math.floor(rand() * max);
  const base = scores.slice();
  const buf = new Float64Array(n);

  // Pre-allocate per-run metric arrays
  const curves = new Array(runs);
  const finalValues = new Float64Array(runs);
  const maxDDs = new Float64Array(runs);
  const maxDDPct = new Float64Array(runs);
  const sharpes = new Float64Array(runs);
  const sortinos = new Float64Array(runs);
  const pfs = new Float64Array(runs);
  const expectancies = new Float64Array(runs);
  const winRates = new Float64Array(runs);
  const longestWins = new Int32Array(runs);
  const longestLosses = new Int32Array(runs);
  const recoveryTrades = new Int32Array(runs);
  const ruinTrades = new Int32Array(runs);

  let ruinCount = 0;
  let profitCount = 0;

  for (let r = 0; r < runs; r++) {
    // 1. Generate sequence
    if (method === 'bootstrap') {
      generateBootstrap(base, n, randInt, buf);
    } else if (method === 'block') {
      generateBlockBootstrap(base, n, blockSize, randInt, buf);
    } else {
      generatePermutation(base, n, randInt, buf);
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

    // 3. Analyze
    const a = analyzeCurve(curve, ruinThreshold);
    finalValues[r] = a.final;
    maxDDs[r] = a.maxDD;
    maxDDPct[r] = initialCapital > 0 ? (a.maxDD / initialCapital) * 100 : 0;
    ruinTrades[r] = a.ruinIndex;

    if (a.ruinIndex >= 0) ruinCount++;
    if (a.final > 0) profitCount++;

    const st = analyzeStreaks(buf);
    longestWins[r] = st.maxW;
    longestLosses[r] = st.maxL;

    const ra = analyzeRatios(buf);
    sharpes[r] = ra.sharpe;
    sortinos[r] = ra.sortino;
    pfs[r] = isFinite(ra.pf) ? ra.pf : 9999;
    expectancies[r] = ra.expectancy;
    winRates[r] = ra.winRate;

    recoveryTrades[r] = analyzeRecovery(curve);
  }

  // 4. Percentile bands (with interpolation)
  const buildBand = (p) => {
    const out = new Float64Array(n + 1);
    const scratch = new Float64Array(runs);
    for (let i = 0; i <= n; i++) {
      for (let r = 0; r < runs; r++) scratch[r] = curves[r][i];
      scratch.sort();
      out[i] = percentile(scratch, p);
    }
    return Array.from(out);
  };

  const p5 = buildBand(0.05);
  const p25 = buildBand(0.25);
  const p50 = buildBand(0.50);
  const p75 = buildBand(0.75);
  const p95 = buildBand(0.95);

  // 5. Time to target
  const timeToTarget = (targets || []).map(target => {
    let hits = 0;
    const times = [];
    for (let r = 0; r < runs; r++) {
      const c = curves[r];
      for (let i = 1; i <= n; i++) {
        if (c[i] >= target) { hits++; times.push(i); break; }
      }
    }
    times.sort((a, b) => a - b);
    return {
      target,
      successPct: (hits / runs) * 100,
      medianTrades: times.length ? percentile(times, 0.50) : null,
      p25Trades:    times.length ? percentile(times, 0.25) : null,
      p75Trades:    times.length ? percentile(times, 0.75) : null,
    };
  });

  // 6. Sorted copies for one-shot percentile reads (used by summarize)
  const sorted = {
    final:      Array.from(finalValues).sort((a, b) => a - b),
    maxDD:      Array.from(maxDDs).sort((a, b) => a - b),
    maxDDPct:   Array.from(maxDDPct).sort((a, b) => a - b),
    sharpe:     Array.from(sharpes).sort((a, b) => a - b),
    sortino:    Array.from(sortinos).sort((a, b) => a - b),
    pf:         Array.from(pfs).sort((a, b) => a - b),
    expectancy: Array.from(expectancies).sort((a, b) => a - b),
    winRate:    Array.from(winRates).sort((a, b) => a - b),
    winStreak:  Array.from(longestWins).sort((a, b) => a - b),
    lossStreak: Array.from(longestLosses).sort((a, b) => a - b),
  };

  return {
    method, runs, n, seed, ruinThreshold, initialCapital, blockSize,
    unitMode: null,  // set by caller — 'R' or '$'

    // Arrays for distribution charts
    finalValues:    Array.from(finalValues),
    maxDDs:         Array.from(maxDDs),
    maxDDPct:       Array.from(maxDDPct),
    sharpes:        Array.from(sharpes),
    sortinos:       Array.from(sortinos),
    profitFactors:  Array.from(pfs),
    expectancies:   Array.from(expectancies),
    winRates:       Array.from(winRates),
    longestWins:    Array.from(longestWins),
    longestLosses:  Array.from(longestLosses),
    recoveryTrades: Array.from(recoveryTrades),
    ruinTrades:     Array.from(ruinTrades),

    // Fan chart bands
    percentiles: { p5, p25, p50, p75, p95 },

    // Aggregate
    profitCount, profitPct: (profitCount / runs) * 100,
    ruinCount,   ruinPct:   (ruinCount / runs) * 100,
    medianFinal: percentile(sorted.final, 0.50),
    avgFinal:    finalValues.reduce((a, b) => a + b, 0) / runs,

    // Percentile lookup for summarize()
    _sorted: sorted,

    timeToTarget,
  };
}

// --- Distribution histogram -----------------------------------------------
export function buildHistogram(values, bucketCount = 12) {
  if (!values || values.length === 0) return null;
  let min = Infinity, max = -Infinity;
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  if (min === max) { min -= 0.5; max += 0.5; }

  const bucketSize = (max - min) / bucketCount;
  const counts = new Array(bucketCount).fill(0);
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
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

// --- Percentile from any array --------------------------------------------
export function pct(arr, p) {
  if (!arr || arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return percentile(s, p);
}

// --- Summarize for panels --------------------------------------------------
export function summarizeMC(result) {
  if (!result) return null;
  const s = result._sorted;
  const last = result.n;

  return {
    runs: result.runs,
    n: result.n,
    method: result.method,
    unitMode: result.unitMode,

    // Final equity distribution
    medianFinal: percentile(s.final, 0.50),
    p5Final:     percentile(s.final, 0.05),
    p25Final:    percentile(s.final, 0.25),
    p75Final:    percentile(s.final, 0.75),
    p95Final:    percentile(s.final, 0.95),

    // Max drawdown distribution (absolute units)
    maxDD_p5:    percentile(s.maxDD, 0.05),   // worst tail
    maxDD_p25:   percentile(s.maxDD, 0.25),
    maxDD_p50:   percentile(s.maxDD, 0.50),
    maxDD_p75:   percentile(s.maxDD, 0.75),
    maxDD_p95:   percentile(s.maxDD, 0.95),

    // Max drawdown as % of starting capital
    maxDDPct_p5:  percentile(s.maxDDPct, 0.05),
    maxDDPct_p50: percentile(s.maxDDPct, 0.50),
    maxDDPct_p95: percentile(s.maxDDPct, 0.95),

    // Ratios
    sharpe_p5:   percentile(s.sharpe, 0.05),
    sharpe_p50:  percentile(s.sharpe, 0.50),
    sharpe_p95:  percentile(s.sharpe, 0.95),
    sortino_p50: percentile(s.sortino, 0.50),
    pf_p50:      percentile(s.pf, 0.50),
    exp_p50:     percentile(s.expectancy, 0.50),
    win_p50:     percentile(s.winRate, 0.50),

    // Streaks
    winStreak_p50:  percentile(s.winStreak, 0.50),
    winStreak_p95:  percentile(s.winStreak, 0.95),
    lossStreak_p50: percentile(s.lossStreak, 0.50),
    lossStreak_p95: percentile(s.lossStreak, 0.95),

    // Ruin + profit aggregates
    profitPct: result.profitPct,
    profitCount: result.profitCount,
    ruinPct: result.ruinPct,
    ruinCount: result.ruinCount,
  };
}