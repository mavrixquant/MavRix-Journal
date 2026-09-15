// src/features/simulator/utils/monteCarlo.js
// ---------------------------------------------------------------------------
// Monte Carlo engine for trade sequences.
//
// Three methods, each mathematically distinct:
//   permutation — reshuffle the same N trades. Total invariant.
//   bootstrap   — sample N trades with replacement.
//   block       — sliding-window block bootstrap.
//
// All units in `scores` are either:
//   - R multiples, when using R-mode, or
//   - account currency, when using money-mode.
//
// IMPORTANT:
// This engine's cumulative curve is currently additive:
//   curve[i] = curve[i - 1] + tradeResult
//
// Therefore R-mode is a fixed-R cumulative model.
// It is NOT a compounded percentage-of-equity account model.
// ---------------------------------------------------------------------------

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


// Two-pass: find worst DD (peak->trough), then find first recovery of that peak.
// Returns drawdown DURATION (peak index -> recovery index). -1 if never recovered.
function analyzeRecovery(curve) {
  const n = curve.length - 1;
  let peak = 0, peakIdx = 0;
  let worstDD = 0, ddPeakIdx = 0, ddTroughIdx = 0;

  for (let i = 1; i <= n; i++) {
    const v = curve[i];
    if (v > peak) {
      peak = v;
      peakIdx = i;
    } else {
      const dd = v - peak;
      if (dd < worstDD) {
        worstDD = dd;
        ddPeakIdx = peakIdx;
        ddTroughIdx = i;
      }
    }
  }

  if (worstDD >= 0) return 0;

  const peakValue = curve[ddPeakIdx];
  let recoveryIdx = -1;
  for (let i = ddTroughIdx + 1; i <= n; i++) {
    if (curve[i] >= peakValue) { recoveryIdx = i; break; }
  }
  if (recoveryIdx === -1) return -1;
  return recoveryIdx - ddPeakIdx;
}

// --- Sequence generators ---------------------------------------------------

function generatePermutation(base, n, randInt, out) {
  for (let i = 0; i < n; i++) out[i] = base[i];
  for (let i = n - 1; i > 0; i--) {
    const j = randInt(i + 1);
    const tmp = out[i]; out[i] = out[j]; out[j] = tmp;
  }
}

function generateBootstrap(base, n, randInt, out) {
  for (let i = 0; i < n; i++) out[i] = base[randInt(n)];
}

function generateBlockBootstrap(base, n, blockSize, randInt, out) {
  const L = Math.max(1, Math.min(blockSize, n));

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
    dollarsPerR = 0,      // conversion factor, only relevant in R-mode
  } = options;

  // Validate input trades.
  if (!Array.isArray(scores) && !ArrayBuffer.isView(scores)) return null;
  if (scores.length < 2) return null;

  const cleanScores = Array.from(scores, Number);

  if (cleanScores.some(v => !Number.isFinite(v))) {
    throw new Error('Monte Carlo scores must contain only finite numbers.');
  }

  const n = cleanScores.length;

  // Validate simulation parameters.
  if (!Number.isInteger(runs) || runs < 1) {
    throw new Error('Monte Carlo runs must be an integer >= 1.');
  }

  if (runs > 1_000_000) {
    throw new Error(
      'Monte Carlo runs cannot exceed 1,000,000 in the browser.'
    );
  }

  if (!Number.isInteger(seed) || seed < 0) {
    throw new Error('Monte Carlo seed must be a non-negative integer.');
  }

  if (!Number.isInteger(blockSize) || blockSize < 1) {
    throw new Error('Monte Carlo blockSize must be an integer >= 1.');
  }

  if (initialCapital < 0 || !Number.isFinite(initialCapital)) {
    throw new Error('initialCapital must be a finite number >= 0.');
  }

  if (dollarsPerR < 0 || !Number.isFinite(dollarsPerR)) {
    throw new Error('dollarsPerR must be a finite number >= 0.');
  }

  const numericThreshold =
    ruinThreshold == null ? null : Number(ruinThreshold);

  if (
    numericThreshold != null &&
    !Number.isFinite(numericThreshold)
  ) {
    throw new Error('ddThreshold must be null or a finite number.');
  }

  if (numericThreshold != null && numericThreshold >= 0) {
    throw new Error(
      'ddThreshold must be negative or null. Example: -10 for a 10-unit drawdown threshold.'
    );
  }

  if (!Array.isArray(targets)) {
    throw new Error('targets must be an array.');
  }

  const cleanTargets = targets.map(Number);

  if (cleanTargets.some(target => !Number.isFinite(target))) {
    throw new Error('targets must contain only finite numbers.');
  }

  if (cleanTargets.some(target => target <= 0)) {
    throw new Error('targets must contain only positive numbers.');
  }

  const uniqueTargets = [...new Set(cleanTargets)].sort((a, b) => a - b);

  const base = cleanScores;
  const rand = mulberry32(seed);
  const randInt = (max) => Math.floor(rand() * max);
  const buf = new Float64Array(n);

  const curves = new Array(runs);

  const finalValues = new Float64Array(runs);
  const maxDDs = new Float64Array(runs);
  const maxDDPct = new Float64Array(runs);
  const sharpes = new Float64Array(runs);
  const sortinos = new Float64Array(runs);
  const pfs = new Float64Array(runs);
  const pfInfinite = new Uint8Array(runs);
  const expectancies = new Float64Array(runs);
  const winRates = new Float64Array(runs);
  const longestWins = new Int32Array(runs);
  const longestLosses = new Int32Array(runs);
  const recoveryTrades = new Int32Array(runs);
  const ruinTrades = new Int32Array(runs);

  let ruinCount = 0;
  let profitCount = 0;
  let infinitePfCount = 0;
  let finalValueSum = 0;

  // Convert-mode: how to translate maxDD into a % of capital.
  // - $ mode: maxDD is already in currency; divide by capital.
  // - R mode with dollarsPerR > 0: convert R -> $ first.
  // - R mode without conversion: no % is meaningful; store 0.
  const ddToCapitalPct = (maxDD) => {
    if (initialCapital <= 0) return 0;

    // Money mode:
    // maxDD is already expressed in account currency.
    if (dollarsPerR === 0) {
      return (maxDD / initialCapital) * 100;
    }

    // R mode:
    // Convert R -> account currency before calculating percentage.
    return (maxDD * dollarsPerR / initialCapital) * 100;
  };

  for (let r = 0; r < runs; r++) {
    if (method === 'permutation') {
      generatePermutation(base, n, randInt, buf);
    } else if (method === 'bootstrap') {
      generateBootstrap(base, n, randInt, buf);
    } else if (method === 'block') {
      generateBlockBootstrap(base, n, blockSize, randInt, buf);
    } else {
      throw new Error(
        `Unknown Monte Carlo method: "${method}". Expected "permutation", "bootstrap", or "block".`
      );
    }

    const curve = new Float64Array(n + 1);
    curve[0] = 0;

    let cum = 0;
    let peak = 0;
    let maxDD = 0;
    let ruinIndex = -1;

    let curW = 0;
    let curL = 0;
    let maxW = 0;
    let maxL = 0;

    let sum = 0;
    let winSum = 0;
    let lossSum = 0;
    let winCount = 0;
    let varSum = 0;
    let downSum = 0;

    for (let i = 0; i < n; i++) {
      const s = buf[i];

      cum += s;
      curve[i + 1] = cum;

      if (cum > peak) peak = cum;

      const dd = cum - peak;

      if (dd < maxDD) {
        maxDD = dd;
      }

      if (
        ruinIndex === -1 &&
        numericThreshold != null &&
        dd <= numericThreshold
      ) {
        ruinIndex = i + 1;
      }

      if (s > 0) {
        curW++;
        curL = 0;
        if (curW > maxW) maxW = curW;
      } else if (s < 0) {
        curL++;
        curW = 0;
        if (curL > maxL) maxL = curL;
      } else {
        curW = 0;
        curL = 0;
      }

      sum += s;

      if (s > 0) {
        winSum += s;
        winCount++;
      } else if (s < 0) {
        lossSum += s;
      }
    }

    const mean = sum / n;

    for (let i = 0; i < n; i++) {
      const s = buf[i];
      const d = s - mean;

      varSum += d * d;

      const dn = Math.min(0, s);
      downSum += dn * dn;
    }

    finalValues[r] = cum;
    finalValueSum += cum;
    maxDDs[r] = maxDD;
    maxDDPct[r] = ddToCapitalPct(maxDD);
    ruinTrades[r] = ruinIndex;

    if (ruinIndex >= 0) ruinCount++;
    if (cum > 0) profitCount++;

    longestWins[r] = maxW;
    longestLosses[r] = maxL;

    const std = n > 1
      ? Math.sqrt(varSum / (n - 1))
      : 0;

    const downStd = n > 1
      ? Math.sqrt(downSum / (n - 1))
      : 0;

    sharpes[r] = std > 0
      ? mean / std
      : 0;

    sortinos[r] = downStd > 0
      ? mean / downStd
      : 0;

    const pf =
      lossSum !== 0
        ? winSum / Math.abs(lossSum)
        : winSum > 0
          ? Infinity
          : null;

    if (pf === null || !isFinite(pf)) {
      pfs[r] = 0;
      pfInfinite[r] = 1;
      infinitePfCount++;
    } else {
      pfs[r] = pf;
      pfInfinite[r] = 0;
    }

    expectancies[r] = mean;
    winRates[r] = winCount / n;

    recoveryTrades[r] = analyzeRecovery(curve);

    curves[r] = curve;
  }

  // Percentile bands.
  // Sort once per trade position, then derive all five percentiles.
  const buildBands = () => {
    const out = {
      p5:  new Float64Array(n + 1),
      p25: new Float64Array(n + 1),
      p50: new Float64Array(n + 1),
      p75: new Float64Array(n + 1),
      p95: new Float64Array(n + 1),
    };

    const scratch = new Float64Array(runs);

    for (let i = 0; i <= n; i++) {
      for (let r = 0; r < runs; r++) {
        scratch[r] = curves[r][i];
      }

      scratch.sort();

      out.p5[i]  = percentile(scratch, 0.05);
      out.p25[i] = percentile(scratch, 0.25);
      out.p50[i] = percentile(scratch, 0.50);
      out.p75[i] = percentile(scratch, 0.75);
      out.p95[i] = percentile(scratch, 0.95);
    }

    return {
      p5: Array.from(out.p5),
      p25: Array.from(out.p25),
      p50: Array.from(out.p50),
      p75: Array.from(out.p75),
      p95: Array.from(out.p95),
    };
  };

  const {
    p5,
    p25,
    p50,
    p75,
    p95,
  } = buildBands();


  // Drawdown percentile bands.
  // Reconstruct each run's drawdown and sort once per trade position.
  const buildDrawdownBands = () => {
    const out = {
      p5:  new Float64Array(n + 1),
      p25: new Float64Array(n + 1),
      p50: new Float64Array(n + 1),
      p75: new Float64Array(n + 1),
      p95: new Float64Array(n + 1),
    };

    const scratch = new Float64Array(runs);
    const peaks = new Float64Array(runs);

    for (let i = 0; i <= n; i++) {
      for (let r = 0; r < runs; r++) {
        const equity = curves[r][i];

        if (equity > peaks[r]) {
          peaks[r] = equity;
        }

        scratch[r] = equity - peaks[r];
      }

      scratch.sort();

      out.p5[i]  = percentile(scratch, 0.05);
      out.p25[i] = percentile(scratch, 0.25);
      out.p50[i] = percentile(scratch, 0.50);
      out.p75[i] = percentile(scratch, 0.75);
      out.p95[i] = percentile(scratch, 0.95);
    }

    return {
      p5: Array.from(out.p5),
      p25: Array.from(out.p25),
      p50: Array.from(out.p50),
      p75: Array.from(out.p75),
      p95: Array.from(out.p95),
    };
  };
  const {
    p5: ddP5,
    p25: ddP25,
    p50: ddP50,
    p75: ddP75,
    p95: ddP95,
  } = buildDrawdownBands();

  // Evenly-spaced sampling for FanChart (fixes the "first 300 only" bug).
  const SAMPLE_COUNT = 300;
  const count = Math.min(runs, SAMPLE_COUNT);
  const sampledCurves = [];
  const sampledDrawdownCurves = [];

  if (count === 1) {
    const sampled = Array.from(curves[0]);
    sampledCurves.push(sampled);

    const dd = new Array(n + 1);
    let peak = 0;

    for (let i = 0; i <= n; i++) {
      if (sampled[i] > peak) peak = sampled[i];
      dd[i] = sampled[i] - peak;
    }

    sampledDrawdownCurves.push(dd);
  } else if (count > 1) {
    for (let i = 0; i < count; i++) {
      const r = Math.round((i * (runs - 1)) / (count - 1));
      const sampled = Array.from(curves[r]);

      sampledCurves.push(sampled);

      const dd = new Array(n + 1);
      let peak = 0;

      for (let j = 0; j <= n; j++) {
        if (sampled[j] > peak) peak = sampled[j];
        dd[j] = sampled[j] - peak;
      }

      sampledDrawdownCurves.push(dd);
    }
  }

  // Time-to-target.
  let timeToTarget = [];

  if (uniqueTargets.length > 0) {
    const targetCount = uniqueTargets.length;

    const targetEverCounts = new Int32Array(targetCount);
    const targetFinalCounts = new Int32Array(targetCount);
    const targetTimes = Array.from({ length: targetCount }, () => []);

    for (let r = 0; r < runs; r++) {
      const c = curves[r];
      const finalValue = c[n];

      // Targets are sorted ascending.
      // Walk each run once and advance through targets as they are hit.
      let nextTarget = 0;

      for (let i = 1; i <= n && nextTarget < targetCount; i++) {
        const equity = c[i];

        while (
          nextTarget < targetCount &&
          equity >= uniqueTargets[nextTarget]
        ) {
          targetEverCounts[nextTarget]++;
          targetTimes[nextTarget].push(i);
          nextTarget++;
        }
      }

      // Find how many configured targets are <= final value.
      // Binary search avoids scanning all targets for every run.
      let lo = 0;
      let hi = targetCount;

      while (lo < hi) {
        const mid = (lo + hi) >> 1;

        if (uniqueTargets[mid] <= finalValue) {
          lo = mid + 1;
        } else {
          hi = mid;
        }
      }

      for (let t = 0; t < lo; t++) {
        targetFinalCounts[t]++;
      }
    }

    timeToTarget = uniqueTargets.map((target, index) => {
      const times = targetTimes[index];

      times.sort((a, b) => a - b);

      return {
        target,
        successPct: (targetEverCounts[index] / runs) * 100,
        finalPct: (targetFinalCounts[index] / runs) * 100,
        medianTrades: times.length ? percentile(times, 0.50) : null,
        p25Trades: times.length ? percentile(times, 0.25) : null,
        p75Trades: times.length ? percentile(times, 0.75) : null,
      };
    });
  }

  // Sorted copies (excluding infinite PF for finite stats)
  const finitePfs = [];
  for (let r = 0; r < runs; r++) if (!pfInfinite[r]) finitePfs.push(pfs[r]);
  finitePfs.sort((a, b) => a - b);

  const sorted = {
    final:      Array.from(finalValues).sort((a, b) => a - b),
    maxDD:      Array.from(maxDDs).sort((a, b) => a - b),
    maxDDPct:   Array.from(maxDDPct).sort((a, b) => a - b),
    sharpe:     Array.from(sharpes).sort((a, b) => a - b),
    sortino:    Array.from(sortinos).sort((a, b) => a - b),
    expectancy: Array.from(expectancies).sort((a, b) => a - b),
    winRate:    Array.from(winRates).sort((a, b) => a - b), // fraction 0..1
    winStreak:  Array.from(longestWins).sort((a, b) => a - b),
    lossStreak: Array.from(longestLosses).sort((a, b) => a - b),
  };

  return {
    method,
    runs,
    n,
    seed,

    // Drawdown threshold terminology.
    ddThreshold: numericThreshold,

    // Backward-compatible alias for the current UI.
    ruinThreshold: numericThreshold,

    initialCapital,
    blockSize,
    dollarsPerR,

    unitMode: null,

    sampledCurves,
    sampledDrawdownCurves,
    sampledShown: sampledCurves.length,

    finalValues:    Array.from(finalValues),
    maxDDs:         Array.from(maxDDs),
    maxDDPct:       Array.from(maxDDPct),
    sharpes:        Array.from(sharpes),
    sortinos:       Array.from(sortinos),
    profitFactors:  finitePfs,

    // Per-run metrics for raw run-level export.
    runProfitFactors: Array.from(pfs),
    runProfitFactorInfinite: Array.from(pfInfinite),

    infinitePfCount,
    expectancies:   Array.from(expectancies),
    winRates:       Array.from(winRates),
    longestWins:    Array.from(longestWins),
    longestLosses:  Array.from(longestLosses),
    recoveryTrades: Array.from(recoveryTrades),
    ddBreachTrades: Array.from(ruinTrades),

    // Backward-compatible alias.
    ruinTrades: Array.from(ruinTrades),

    percentiles: { p5, p25, p50, p75, p95 },

    drawdownPercentiles: {
      p5: ddP5,
      p25: ddP25,
      p50: ddP50,
      p75: ddP75,
      p95: ddP95,
    },

    profitCount, profitPct: (profitCount / runs) * 100,
    // Drawdown-threshold breach statistics.
    ddBreachCount: ruinCount,
    ddBreachPct:   (ruinCount / runs) * 100,

    // Backward-compatible aliases for the current UI.
    ruinCount,
    ruinPct: (ruinCount / runs) * 100,
    medianFinal: percentile(sorted.final, 0.50),
    avgFinal:    finalValueSum / runs,

    _sorted: sorted,
    _finitePfs: finitePfs,
    _infinitePfCount: infinitePfCount,

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

export function pct(arr, p) {
  if (!arr || arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return percentile(s, p);
}

// --- Summarize for panels --------------------------------------------------
export function summarizeMC(result) {
  if (!result) return null;
  const s = result._sorted;
  const finitePfs = result._finitePfs || [];

  return {
    runs: result.runs,
    n: result.n,
    method: result.method,
    unitMode: result.unitMode,

    medianFinal: percentile(s.final, 0.50),
    p5Final:     percentile(s.final, 0.05),
    p25Final:    percentile(s.final, 0.25),
    p75Final:    percentile(s.final, 0.75),
    p95Final:    percentile(s.final, 0.95),

    maxDD_p5:    percentile(s.maxDD, 0.05),
    maxDD_p25:   percentile(s.maxDD, 0.25),
    maxDD_p50:   percentile(s.maxDD, 0.50),
    maxDD_p75:   percentile(s.maxDD, 0.75),
    maxDD_p95:   percentile(s.maxDD, 0.95),

    // maxDDPct is signed, matching maxDD.
    // Therefore p5 = deeper/worse drawdown,
    // p50 = median drawdown,
    // p95 = shallower drawdown.
    maxDDPct_p5:  percentile(s.maxDDPct, 0.05),
    maxDDPct_p50: percentile(s.maxDDPct, 0.50),
    maxDDPct_p95: percentile(s.maxDDPct, 0.95),

    // Trade Sharpe (unannualized) — renamed in UI
    sharpe_p5:   percentile(s.sharpe, 0.05),
    sharpe_p50:  percentile(s.sharpe, 0.50),
    sharpe_p95:  percentile(s.sharpe, 0.95),
    sortino_p50: percentile(s.sortino, 0.50),

    pf_p50: finitePfs.length ? percentile(finitePfs, 0.50) : Infinity,
    infinitePfCount: result._infinitePfCount || 0,

    exp_p50: percentile(s.expectancy, 0.50),

    // Convert fraction to percent (0..1 -> 0..100)
    win_p50: percentile(s.winRate, 0.50) * 100,

    winStreak_p50:  percentile(s.winStreak, 0.50),
    winStreak_p95:  percentile(s.winStreak, 0.95),
    lossStreak_p50: percentile(s.lossStreak, 0.50),
    lossStreak_p95: percentile(s.lossStreak, 0.95),

    profitPct: result.profitPct,
    profitCount: result.profitCount,

    // Drawdown-threshold breach statistics.
    ddBreachPct: result.ddBreachPct,
    ddBreachCount: result.ddBreachCount,
  };
}