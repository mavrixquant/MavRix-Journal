
import { env } from '../../config/env.js';

// Yahoo queue (existing)
const YAHOO_MAX_CONCURRENT = env.marketData.yahooMaxConcurrent;
const YAHOO_MIN_GAP_MS     = env.marketData.yahooMinGapMs;

let yahooActive = 0;
const yahooPending = [];
let yahooLastStartAt = 0;
let yahooDrainTimer = null;

function scheduleYahooDrain(delayMs) {
  if (yahooDrainTimer) return;
  yahooDrainTimer = setTimeout(() => {
    yahooDrainTimer = null;
    drainYahoo();
  }, delayMs);
}

function drainYahoo() {
  if (yahooActive >= YAHOO_MAX_CONCURRENT) return;
  if (yahooPending.length === 0) return;

  const sinceLast = Date.now() - yahooLastStartAt;
  const wait = YAHOO_MIN_GAP_MS - sinceLast;

  if (wait > 0) {
    scheduleYahooDrain(wait);
    return;
  }

  const job = yahooPending.shift();
  yahooActive += 1;
  yahooLastStartAt = Date.now();

  Promise.resolve()
    .then(() => job.fn())
    .then(
      (value) => job.resolve(value),
      (err) => job.reject(err)
    )
    .finally(() => {
      yahooActive -= 1;
      if (yahooPending.length > 0) drainYahoo();
    });
}

// Alpha Vantage queue (new)
// Free tier: 5 calls/min, 500 calls/day → 12s minimum gap between calls
const AV_MAX_CONCURRENT = env.marketData.alphaVantageMaxConcurrent;
const AV_MIN_GAP_MS     = env.marketData.alphaVantageMinGapMs;

let avActive = 0;
const avPending = [];
let avLastStartAt = 0;
let avDrainTimer = null;

function scheduleAvDrain(delayMs) {
  if (avDrainTimer) return;
  avDrainTimer = setTimeout(() => {
    avDrainTimer = null;
    drainAv();
  }, delayMs);
}

function drainAv() {
  if (avActive >= AV_MAX_CONCURRENT) return;
  if (avPending.length === 0) return;

  const sinceLast = Date.now() - avLastStartAt;
  const wait = AV_MIN_GAP_MS - sinceLast;

  if (wait > 0) {
    scheduleAvDrain(wait);
    return;
  }

  const job = avPending.shift();
  avActive += 1;
  avLastStartAt = Date.now();

  Promise.resolve()
    .then(() => job.fn())
    .then(
      (value) => job.resolve(value),
      (err) => job.reject(err)
    )
    .finally(() => {
      avActive -= 1;
      if (avPending.length > 0) drainAv();
    });
}

// Provider-specific enqueue functions
export function enqueue(fn) {
  // Default to Yahoo queue for backward compatibility
  return new Promise((resolve, reject) => {
    yahooPending.push({ fn, resolve, reject });
    drainYahoo();
  });
}

export function enqueueAlphaVantage(fn) {
  return new Promise((resolve, reject) => {
    avPending.push({ fn, resolve, reject });
    drainAv();
  });
}

export function getStats() {
  return {
    yahoo: {
      active: yahooActive,
      queued: yahooPending.length,
      maxConcurrent: YAHOO_MAX_CONCURRENT,
      minGapMs: YAHOO_MIN_GAP_MS,
    },
    alphavantage: {
      active: avActive,
      queued: avPending.length,
      maxConcurrent: AV_MAX_CONCURRENT,
      minGapMs: AV_MIN_GAP_MS,
    },
  };
}