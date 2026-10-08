// apps/api/src/lib/marketData/queue.js
//
// Promise-based request queue with two safety rails:
//
//   1. Concurrency limit   — at most N outbound Yahoo requests in flight
//   2. Minimum gap         — at least M ms between the START of any two
//                            requests, regardless of concurrency
//
// Yahoo's undocumented rate limit is roughly 2,000 req/hour/IP. Bursty
// parallel calls trigger 429 + a temporary IP block. This queue keeps us
// well under that ceiling while still allowing ~2x throughput for a single
// user opening a chart.
//
// Single-process only. Values read from env at import time.

import { env } from '../../config/env.js';

const MAX_CONCURRENT = env.marketData.yahooMaxConcurrent;
const MIN_GAP_MS     = env.marketData.yahooMinGapMs;

let active = 0;
const pending = []; // { fn, resolve, reject }
let lastStartAt = 0;
let drainTimer = null;

function scheduleDrain(delayMs) {
  if (drainTimer) return;
  drainTimer = setTimeout(() => {
    drainTimer = null;
    drain();
  }, delayMs);
}

function drain() {
  if (active >= MAX_CONCURRENT) return;
  if (pending.length === 0) return;

  const sinceLast = Date.now() - lastStartAt;
  const wait = MIN_GAP_MS - sinceLast;

  if (wait > 0) {
    scheduleDrain(wait);
    return;
  }

  const job = pending.shift();
  active += 1;
  lastStartAt = Date.now();

  Promise.resolve()
    .then(() => job.fn())
    .then(
      (value) => job.resolve(value),
      (err) => job.reject(err)
    )
    .finally(() => {
      active -= 1;
      // Immediately attempt to start the next job if the gap allows.
      if (pending.length > 0) drain();
    });
}

/**
 * Enqueue an async function. Returns a Promise that resolves/rejects with
 * whatever `fn()` returns.
 *
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
export function enqueue(fn) {
  return new Promise((resolve, reject) => {
    pending.push({ fn, resolve, reject });
    drain();
  });
}

/** Diagnostics for the admin health page. */
export function getStats() {
  return {
    active,
    queued: pending.length,
    maxConcurrent: MAX_CONCURRENT,
    minGapMs: MIN_GAP_MS,
  };
}