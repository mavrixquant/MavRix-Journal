// apps/api/src/services/healthCheck/runStore.js
//
// In-memory run registry for health-check executions.
//
// One Map<runId, Run>. Each Run owns an EventEmitter the SSE controller
// subscribes to. Events are ALSO buffered on the Run so a client that
// connects late (or reconnects) sees the full history replayed.
//
// Runs are pruned 5 minutes after they finish. While running, they're
// kept indefinitely — a stuck run would otherwise leak memory, but the
// orchestrator always terminates (finally block), so this is safe.

import { EventEmitter } from 'node:events';

const RUN_TTL_MS = 5 * 60 * 1000;      // 5 min after completion
const PRUNE_INTERVAL_MS = 60 * 1000;   // sweep once a minute

/** @type {Map<string, Run>} */
const runs = new Map();

function makeId() {
  return `hc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * @typedef {object} Run
 * @property {string}   id
 * @property {string[]} phases
 * @property {string}   requestedBy
 * @property {'running'|'completed'|'failed'} status
 * @property {number}   startedAt
 * @property {number|null} completedAt
 * @property {EventEmitter} emitter
 * @property {object[]} events
 * @property {object|null} summary
 */

export function createRun({ phases, requestedBy }) {
  const id = makeId();
  const run = {
    id,
    phases,
    requestedBy,
    status: 'running',
    startedAt: Date.now(),
    completedAt: null,
    emitter: new EventEmitter(),
    events: [],
    summary: null,
  };
  // Multiple SSE subscribers are possible (multi-tab superadmins).
  run.emitter.setMaxListeners(50);
  runs.set(id, run);
  return run;
}

export function getRun(id) {
  return runs.get(id) || null;
}

export function emit(run, event) {
  if (!run) return;
  const stamped = { ...event, ts: Date.now() };
  run.events.push(stamped);
  run.emitter.emit('event', stamped);
}

export function subscribe(run, listener) {
  if (!run) return () => {};
  run.emitter.on('event', listener);
  return () => run.emitter.off('event', listener);
}

export function complete(run, summary) {
  if (!run) return;
  run.status = 'completed';
  run.completedAt = Date.now();
  run.summary = summary;
}

export function fail(run, error) {
  if (!run) return;
  run.status = 'failed';
  run.completedAt = Date.now();
  run.summary = { error: error?.message || String(error) };
}

// Periodic prune. `.unref()` keeps this timer from pinning the process.
setInterval(() => {
  const now = Date.now();
  for (const [id, run] of runs) {
    if (
      run.status !== 'running' &&
      run.completedAt &&
      now - run.completedAt > RUN_TTL_MS
    ) {
      runs.delete(id);
    }
  }
}, PRUNE_INTERVAL_MS).unref?.();