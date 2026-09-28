// apps/web/src/features/simulator/workers/monteCarlo.worker.js
//
// Web Worker that runs Monte Carlo simulations off the main thread.
//
// Protocol:
//   → { type: 'run', runId, scores: number[], options: object }
//   → { type: 'cancel', runId }
//
//   ← { type: 'progress', runId, pct: number }
//   ← { type: 'result', runId, result: object }
//   ← { type: 'cancelled', runId }
//   ← { type: 'error', runId, error: string }

import { runMonteCarlo } from '../utils/monteCarlo';

// Track the current run so cancel messages know what to abort.
let activeRunId = null;
let cancelRequested = false;

self.onmessage = (e) => {
  const msg = e.data;

  /* ---------- Cancel ---------- */
  if (msg.type === 'cancel') {
    if (msg.runId === activeRunId) {
      cancelRequested = true;
    }
    return;
  }

  /* ---------- Run ---------- */
  if (msg.type === 'run') {
    const { runId, scores, options } = msg;

    activeRunId = runId;
    cancelRequested = false;

    try {
      const result = runMonteCarlo(scores, {
        ...options,
        onProgress: (pct) => {
          self.postMessage({ type: 'progress', runId, pct });
        },
        shouldCancel: () => cancelRequested,
      });

      if (cancelRequested || result === null) {
        self.postMessage({ type: 'cancelled', runId });
      } else {
        self.postMessage({ type: 'result', runId, result });
      }
    } catch (err) {
      self.postMessage({
        type: 'error',
        runId,
        error: err?.message || String(err),
      });
    } finally {
      activeRunId = null;
      cancelRequested = false;
    }
  }
};