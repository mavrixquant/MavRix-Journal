
import { env } from '../../config/env.js';

const MAX_CONCURRENT = env.marketData.yahooMaxConcurrent;
const MIN_GAP_MS     = env.marketData.yahooMinGapMs;

let active = 0;
const pending = [];
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
      if (pending.length > 0) drain();
    });
}

export function enqueue(fn) {
  return new Promise((resolve, reject) => {
    pending.push({ fn, resolve, reject });
    drain();
  });
}

export function getStats() {
  return {
    active,
    queued: pending.length,
    maxConcurrent: MAX_CONCURRENT,
    minGapMs: MIN_GAP_MS,
  };
}