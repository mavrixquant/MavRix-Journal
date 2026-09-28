// apps/web/src/features/simulator/hooks/useMonteCarloWorker.js
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Manages a single Monte Carlo Web Worker instance.
 *
 *   const { run, cancel, isRunning, progress } = useMonteCarloWorker();
 *   const result = await run(scores, options);
 *
 * Only one run can be in-flight at a time. Starting a new run while one is
 * already running is disallowed by the caller (SimulatorPage gates on isRunning).
 */
export function useMonteCarloWorker() {
  const workerRef = useRef(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  // Track the ID of the current run. Incoming messages that don't match
  // this ID are treated as stale and ignored.
  const runIdRef = useRef(0);

  // Deferred promise for the currently awaited run.
  const pendingRef = useRef(null);

  /* ---------------- Worker lifecycle ---------------- */

  const ensureWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;

    // Vite-specific: `new URL('./file.worker.js', import.meta.url)` is the
    // canonical way to reference a worker from source code.
    const worker = new Worker(
      new URL('../workers/monteCarlo.worker.js', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.runId !== runIdRef.current) return; // stale

      switch (msg.type) {
        case 'progress':
          setProgress(msg.pct);
          break;

        case 'result':
          setProgress(100);
          setIsRunning(false);
          if (pendingRef.current) {
            pendingRef.current.resolve(msg.result);
            pendingRef.current = null;
          }
          break;

        case 'cancelled':
          setIsRunning(false);
          if (pendingRef.current) {
            const err = new Error('cancelled');
            err.name = 'Cancelled';
            pendingRef.current.reject(err);
            pendingRef.current = null;
          }
          break;

        case 'error':
          setIsRunning(false);
          if (pendingRef.current) {
            pendingRef.current.reject(new Error(msg.error));
            pendingRef.current = null;
          }
          break;

        default:
          break;
      }
    };

    worker.onerror = (err) => {
      console.error('[monteCarlo worker] error:', err);
      setIsRunning(false);
      if (pendingRef.current) {
        pendingRef.current.reject(new Error(err?.message || 'Worker error'));
        pendingRef.current = null;
      }
    };

    workerRef.current = worker;
    return worker;
  }, []);

  /* ---------------- Run / Cancel ---------------- */

  const run = useCallback(
    (scores, options) => {
      return new Promise((resolve, reject) => {
        const runId = ++runIdRef.current;
        pendingRef.current = { resolve, reject };
        setIsRunning(true);
        setProgress(0);

        const worker = ensureWorker();
        worker.postMessage({
          type: 'run',
          runId,
          scores,
          options,
        });
      });
    },
    [ensureWorker]
  );

  const cancel = useCallback(() => {
    if (!workerRef.current || !pendingRef.current) return;
    workerRef.current.postMessage({
      type: 'cancel',
      runId: runIdRef.current,
    });
  }, []);

  /* ---------------- Cleanup ---------------- */

  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      pendingRef.current = null;
    };
  }, []);

  return { run, cancel, isRunning, progress };
}