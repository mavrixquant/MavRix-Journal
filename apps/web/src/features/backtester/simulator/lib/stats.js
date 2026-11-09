// Small helpers over the sorted arrays the engine already produces.

export function pctSorted(sorted, p) {
  const len = sorted?.length ?? 0;
  if (len === 0) return null;
  if (len === 1) return sorted[0];
  const idx = p * (len - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export const QUANTILES = [0.05, 0.25, 0.5, 0.75, 0.95];

export const quantiles = (sorted) => QUANTILES.map((q) => pctSorted(sorted, q));

/** Share (0-100) of `sorted` that is <= value. */
export function rankPct(sorted, value) {
  if (!sorted?.length || !Number.isFinite(value)) return null;
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] <= value) lo = mid + 1;
    else hi = mid;
  }
  return (lo / sorted.length) * 100;
}

/** Recovery stats from engine `recoveryTrades`: 0 = never in DD, -1 = never recovered. */
export function recoveryStats(recoveryTrades) {
  const recovered = [];
  let never = 0;
  let noDD = 0;
  for (const v of recoveryTrades || []) {
    if (v === -1) never++;
    else if (v === 0) noDD++;
    else recovered.push(v);
  }
  recovered.sort((a, b) => a - b);
  const total = recoveryTrades?.length || 0;
  return {
    recovered,
    neverPct: total ? (never / total) * 100 : 0,
    noDDPct: total ? (noDD / total) * 100 : 0,
    p50: pctSorted(recovered, 0.5),
    p95: pctSorted(recovered, 0.95),
  };
}

/** Integer histogram with a merged tail bucket. */
export function intHistogram(values, maxBuckets = 24) {
  if (!values?.length) return null;
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const cap = Math.min(max, min + maxBuckets - 1);
  const counts = new Array(cap - min + 1).fill(0);
  for (const v of values) counts[Math.min(v, cap) - min]++;
  const labels = counts.map((_, i) => String(min + i));
  if (cap < max) labels[labels.length - 1] = `${cap}+`;
  return { labels, counts, min, max: cap };
}

/** Keep at most `max` evenly spaced indices (always includes first and last). */
export function thinIndices(length, max = 400) {
  if (length <= max) return Array.from({ length }, (_, i) => i);
  const out = [];
  const step = (length - 1) / (max - 1);
  for (let i = 0; i < max; i++) out.push(Math.round(i * step));
  return out;
}
