import { useCallback, useEffect, useRef, useState } from 'react';

export function useMonteCarloWorker() {
  const workerRef = useRef(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const runIdRef = useRef(0);

  const pendingRef = useRef(null);


  const ensureWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current;

    const worker = new Worker(
      new URL('../workers/monteCarlo.worker.js', import.meta.url),
      { type: 'module' }
    );

    worker.onmessage = (e) => {
      const msg = e.data;
      if (msg.runId !== runIdRef.current) return;

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