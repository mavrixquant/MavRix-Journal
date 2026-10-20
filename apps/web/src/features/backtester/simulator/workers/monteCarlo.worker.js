
import { runMonteCarlo } from '@/shared/trading/monteCarlo';

let activeRunId = null;
let cancelRequested = false;

self.onmessage = (e) => {
  const msg = e.data;

  if (msg.type === 'cancel') {
    if (msg.runId === activeRunId) {
      cancelRequested = true;
    }
    return;
  }

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