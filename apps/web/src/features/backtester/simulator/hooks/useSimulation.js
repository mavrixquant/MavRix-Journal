import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { summarizeMC } from '@/shared/trading/monteCarlo';
import { useMonteCarloWorker } from './useMonteCarloWorker';
import { MIN_TRADES, RUN_OPTIONS, runsAllowed } from '../lib/limits';

const randomSeed = () => Math.floor(Math.random() * 1e9);

// 10k runs by default, or the largest option that fits in memory for very long histories.
const defaultRuns = (n) => {
  if (runsAllowed(10000, n)) return 10000;
  return [...RUN_OPTIONS].reverse().find((r) => runsAllowed(r, n)) ?? RUN_OPTIONS[0];
};

/**
 * All simulator state in one place. The workspace is mounted with
 * key={accountId}, so every default below is recomputed per account with no
 * reset effects.
 */
export function useSimulation({ scores, simAccount, isMoney }) {
  const n = scores.length;

  // ---- configuration ------------------------------------------------------
  const [method, setMethod] = useState('permutation');
  const [runs, setRuns] = useState(() => defaultRuns(n));
  const [blockSize, setBlockSize] = useState(5);
  const [seed, setSeed] = useState(randomSeed);

  const accountBalance = useMemo(() => {
    const bal = Number(simAccount?.balance);
    return Number.isFinite(bal) && bal > 0 ? bal : 0;
  }, [simAccount]);

  const [initialCapital, setInitialCapital] = useState(accountBalance);
  const [dollarsPerRCustom, setDollarsPerRCustom] = useState(null);

  const derivedDollarsPerR = useMemo(() => {
    if (isMoney) return 0;
    const perTrade = Number(simAccount?.riskPerTrade);
    if (Number.isFinite(perTrade) && perTrade > 0) return perTrade;
    const pct = Number(simAccount?.riskPerTradePct);
    if (Number.isFinite(pct) && pct > 0 && initialCapital > 0) return (pct / 100) * initialCapital;
    return 0;
  }, [simAccount, isMoney, initialCapital]);

  const dollarsPerR = isMoney ? 0 : (dollarsPerRCustom ?? derivedDollarsPerR);

  // Capital is only meaningful to the engine when units can be related to it.
  const capitalForEngine = isMoney || dollarsPerR > 0 ? initialCapital : 0;

  // Drawdown limit is user-facing positive; engine wants a negative threshold.
  // null = follow the default, 0 = explicitly off.
  const defaultDdLimit = isMoney ? (initialCapital > 0 ? Math.round(initialCapital * 0.2) : 1000) : 10;
  const [ddLimitCustom, setDdLimitCustom] = useState(null);
  const ddLimit = ddLimitCustom ?? defaultDdLimit;

  const defaultTargets = useMemo(() => {
    if (!isMoney) return [5, 10, 20, 50];
    const c = initialCapital;
    return c > 0
      ? [c * 0.05, c * 0.1, c * 0.25, c * 0.5].map((v) => Math.round(v))
      : [500, 1000, 2500, 5000];
  }, [isMoney, initialCapital]);
  const [targetsCustom, setTargetsCustom] = useState(null);
  const targets = targetsCustom ?? defaultTargets;

  const effectiveBlock = Math.max(1, Math.min(blockSize, n));

  // ---- run state ----------------------------------------------------------
  const { run: runWorker, cancel, isRunning, progress } = useMonteCarloWorker();
  const [result, setResult] = useState(null);
  const [previous, setPrevious] = useState(null);
  const [error, setError] = useState(null);
  const resultRef = useRef(null);

  const dataSig = useMemo(() => `${n}:${scores.reduce((a, b) => a + b, 0).toFixed(6)}`, [scores, n]);

  const signature = useMemo(
    () =>
      JSON.stringify([
        dataSig,
        method,
        runs,
        seed,
        method === 'block' ? effectiveBlock : null,
        capitalForEngine,
        dollarsPerR,
        ddLimit,
        targets,
      ]),
    [dataSig, method, runs, seed, effectiveBlock, capitalForEngine, dollarsPerR, ddLimit, targets]
  );

  const sizeOk = runsAllowed(runs, n);
  const canRun = n >= MIN_TRADES && sizeOk && !isRunning;

  const run = useCallback(async () => {
    if (!canRun) return;
    setError(null);
    try {
      const res = await runWorker(scores, {
        method,
        runs,
        seed,
        ruinThreshold: ddLimit > 0 ? -ddLimit : null,
        targets,
        initialCapital: capitalForEngine,
        blockSize: effectiveBlock,
        dollarsPerR,
      });
      if (!res) return;
      res.unitMode = isMoney ? 'money' : 'R';
      res.signature = signature;
      res.ranAt = Date.now();
      setPrevious(resultRef.current ? summarizeMC(resultRef.current) : null);
      resultRef.current = res;
      setResult(res);
    } catch (err) {
      if (err?.name === 'Cancelled') return;
      console.error('[Simulator] run failed:', err);
      setError(err?.message || 'Simulation failed.');
    }
  }, [
    canRun,
    runWorker,
    scores,
    method,
    runs,
    seed,
    ddLimit,
    targets,
    capitalForEngine,
    effectiveBlock,
    dollarsPerR,
    isMoney,
    signature,
  ]);

  // Run once on arrival so the page is never an empty form.
  // (setTimeout keeps this safe under React StrictMode's mount/unmount/mount.)
  const autoRan = useRef(false);
  useEffect(() => {
    if (autoRan.current || n < MIN_TRADES) return undefined;
    const t = setTimeout(() => {
      autoRan.current = true;
      run();
    }, 0);
    return () => clearTimeout(t);
  }, [n, run]);

  // Ctrl/Cmd + Enter runs the simulation.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        run();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [run]);

  const summary = useMemo(() => summarizeMC(result), [result]);
  const isStale = !!result && result.signature !== signature;

  return {
    // config
    method, setMethod,
    runs, setRuns,
    blockSize, setBlockSize,
    seed, setSeed, randomizeSeed: () => setSeed(randomSeed()),
    initialCapital, setInitialCapital,
    dollarsPerR, derivedDollarsPerR, setDollarsPerRCustom,
    capitalForEngine,
    ddLimit, defaultDdLimit, setDdLimitCustom,
    targets, defaultTargets, setTargetsCustom,
    // run
    run, cancel, isRunning, progress, canRun, sizeOk,
    result, summary, previous, isStale, error,
    n,
  };
}
