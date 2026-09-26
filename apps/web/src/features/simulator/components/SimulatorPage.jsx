// src/components/simulator/SimulatorPage.jsx
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useAppContext } from '@/app/providers/AppProvider';
import { subscribeToTrades } from '@/services/trades.service';
import { enrichTradesFromDB } from '@/shared/utils/enrichTrades';
import { computeStats } from '@/features/dashboard/utils/statsEngine';
import { getMetricMode } from '@/shared/utils/slResolver';
import { runMonteCarlo, summarizeMC } from '@/features/simulator/utils/monteCarlo';
import SimulatorControls from './SimulatorControls';
import SimulatorPanels from './SimulatorPanels';

const randomSeed = () => Math.floor(Math.random() * 1e9);
const simulationConfigsEqual = (a, b) => {
  if (!a || !b) return false;

  return (
    a.unitMode === b.unitMode &&
    a.method === b.method &&
    a.runs === b.runs &&
    a.seed === b.seed &&
    a.ddThreshold === b.ddThreshold &&
    a.initialCapital === b.initialCapital &&
    a.blockSize === b.blockSize &&
    a.dollarsPerR === b.dollarsPerR &&
    JSON.stringify(a.targets) === JSON.stringify(b.targets)
  );
};

const SIM_CSS = `
  .sim-page {
    --accent: #F59E0B; --accent-2: #FDE68A;
    --accent-soft: rgba(245,158,11,.10);
    --accent-soft2: rgba(245,158,11,.28);
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE; --ink-2: #8892A3; --ink-3: #545E6E;
    --win: #22c55e; --loss: #ef4444;
    padding: 24px; width: 100%; max-width: 1560px; margin: 0 auto;
    box-sizing: border-box; display: flex; flex-direction: column; gap: 22px;
    color: var(--ink-1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .sim-card {
    position: relative; border-radius: 18px;
    background: linear-gradient(180deg, rgba(15,18,25,.72), rgba(15,18,25,.55));
    backdrop-filter: blur(18px) saturate(140%);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
    border: 1px solid var(--line);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.03);
    overflow: hidden;
  }
  .sim-head {
    padding: 18px 22px 16px; display: flex; flex-wrap: wrap;
    align-items: center; justify-content: space-between; gap: 18px;
  }
  .sim-head::before {
    content: ''; position: absolute; left: 0; right: 0; top: 0; height: 2px;
    border-radius: 18px 18px 0 0;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%; animation: simGrad 4s linear infinite;
    pointer-events: none;
  }
  .sim-head-left { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
  .sim-eyebrow {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; font-weight: 700;
    letter-spacing: .14em; text-transform: uppercase; color: var(--ink-3);
  }
  .sim-title-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .sim-title {
    margin: 0; font-size: 22px; font-weight: 700;
    letter-spacing: -.02em; color: var(--ink-1); line-height: 1.1;
  }
  .sim-badge {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; font-weight: 700; letter-spacing: .1em;
    text-transform: uppercase; padding: 3px 10px;
    border-radius: 99px; border: 1px solid; white-space: nowrap;
  }
  .sim-badge.is-live { color: #4ade80; background: rgba(74,222,128,.10); border-color: rgba(74,222,128,.35); }
  .sim-badge.is-demo { color: var(--accent); background: rgba(245,158,11,.10); border-color: var(--accent-soft2); }
  .sim-badge.is-backtest { color: #60a5fa; background: rgba(96,165,250,.10); border-color: rgba(96,165,250,.32); }
  .sim-sub {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px; color: var(--ink-2); letter-spacing: .01em;
  }
  .sim-sub b { color: var(--ink-1); font-weight: 700; }
  .sim-ctx {
    display: inline-flex; align-items: center; gap: 10px;
    padding: 6px 6px 6px 14px; background: rgba(0,0,0,.22);
    border: 1px solid var(--line-soft); border-radius: 12px;
    backdrop-filter: blur(8px);
  }
  .sim-ctx-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px; font-weight: 700; letter-spacing: .14em;
    text-transform: uppercase; color: var(--ink-3); white-space: nowrap;
  }
  .sim-ctx-select {
    padding: 8px 30px 8px 12px; background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1); border-radius: 9px;
    color: var(--ink-1); font-size: 12.5px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-weight: 600; cursor: pointer; outline: none; min-width: 210px;
    appearance: none; -webkit-appearance: none;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 20 20' fill='%23545E6E'><path d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z'/></svg>");
    background-repeat: no-repeat; background-position: right 10px center;
    transition: all .2s;
  }
  .sim-ctx-select:hover { border-color: rgba(255,255,255,.2); }
  .sim-ctx-select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(245,158,11,.15); }
  .sim-empty-wrap {
    min-height: calc(100vh - 160px); display: flex;
    align-items: center; justify-content: center; padding: 40px 16px;
  }
  .sim-empty {
    position: relative; max-width: 520px; width: 100%;
    padding: 56px 40px 48px; border-radius: 26px;
    background:
      radial-gradient(400px 220px at 50% 0%, rgba(245,158,11,.12), transparent 70%),
      linear-gradient(180deg, rgba(15,18,25,.72), rgba(15,18,25,.55));
    border: 1px solid rgba(255,255,255,.1);
    box-shadow: 0 40px 90px -50px rgba(245,158,11,.5), inset 0 1px 0 rgba(255,255,255,.04);
    display: flex; flex-direction: column; align-items: center; text-align: center;
    overflow: hidden;
  }
  .sim-empty::before {
    content: ''; position: absolute; left: -40%; top: -40%;
    width: 180%; height: 180%;
    background: radial-gradient(circle at 50% 50%, rgba(245,158,11,.08), transparent 45%);
    animation: simFloat 8s ease-in-out infinite; pointer-events: none;
  }
  .sim-empty > * { position: relative; z-index: 1; }
  .sim-empty-icon {
    width: 64px; height: 64px; border-radius: 18px;
    background: linear-gradient(135deg, rgba(245,158,11,.18), rgba(245,158,11,.05));
    border: 1px solid var(--accent-soft2); color: var(--accent);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 22px;
    box-shadow: 0 0 40px -8px rgba(245,158,11,.5); font-size: 24px;
  }
  .sim-empty h3 { margin: 0 0 10px; font-size: 20px; font-weight: 700; color: var(--ink-1); letter-spacing: -.02em; }
  .sim-empty p {
    margin: 0; font-size: 13.5px; color: rgba(255,255,255,.62);
    line-height: 1.65; max-width: 400px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace; letter-spacing: .01em;
  }
  .sim-empty p b { color: var(--accent); font-weight: 700; }
  .sim-loading {
    padding: 60px 20px; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 14px;
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px; letter-spacing: .02em;
  }
  .sim-spinner {
    width: 28px; height: 28px;
    border: 2.5px solid var(--line); border-top-color: var(--accent);
    border-radius: 50%; animation: simSpin .8s linear infinite;
  }
  .sim-info {
    padding: 48px 24px; text-align: center;
    border: 1px dashed rgba(255,255,255,.1); border-radius: 18px;
    background: linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,.005));
    display: flex; flex-direction: column; align-items: center; gap: 12px;
  }
  .sim-info-icon {
    width: 48px; height: 48px; border-radius: 14px;
    background: rgba(245,158,11,.10); border: 1px solid var(--accent-soft2);
    color: var(--accent);
    display: inline-flex; align-items: center; justify-content: center;
    font-size: 20px; margin-bottom: 4px;
  }
  .sim-info-title { font-size: 15px; font-weight: 700; color: var(--ink-1); letter-spacing: -.01em; }
  .sim-info-title b { color: var(--accent); }
  .sim-info-desc {
    font-size: 12.5px; color: var(--ink-2); max-width: 420px; line-height: 1.65;
    font-family: 'IBM Plex Mono', ui-monospace, monospace; letter-spacing: .01em;
  }
  .sim-info-desc b { color: var(--ink-1); }
  @keyframes simGrad { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
  @keyframes simFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
  @keyframes simSpin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) {
    .sim-head::before, .sim-empty::before, .sim-spinner { animation: none !important; }
  }
  @media (max-width: 640px) {
    .sim-page { padding: 16px; }
    .sim-head { padding: 16px 18px; }
    .sim-ctx-select { min-width: 0; width: 100%; }
    .sim-ctx { width: 100%; }
  }
`;

export default function SimulatorPage() {
  const { state } = useAppContext();

  const [simAccountId, setSimAccountId] = useState('');
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (!initialized && state.accounts.length > 0) {
      const preferred = state.selectedAccountId || state.accounts[0].id;
      setSimAccountId(preferred);
      setInitialized(true);
    }
  }, [state.accounts, state.selectedAccountId, initialized]);

  const [simTrades, setSimTrades] = useState([]);
  const [loadingTrades, setLoadingTrades] = useState(false);

  useEffect(() => {
    if (!simAccountId) { setSimTrades([]); return; }
    setLoadingTrades(true);
    const unsub = subscribeToTrades(simAccountId, (rawTrades) => {
      const { enrichedTrades } = enrichTradesFromDB(rawTrades);
      setSimTrades(enrichedTrades);
      setLoadingTrades(false);
    });
    return () => unsub();
  }, [simAccountId]);

  const simAccount = useMemo(
    () => state.accounts.find(a => a.id === simAccountId) || null,
    [state.accounts, simAccountId]
  );

  const metric = useMemo(() => getMetricMode(simAccount), [simAccount]);
  const isMoney = metric === '$';

  // Explicit simulation unit mode.
  // 'money' = scores/equity are account currency.
  // 'R'     = scores/equity are R-multiples.
  const unitMode = isMoney ? 'money' : 'R';

  const stats = useMemo(
    () => computeStats(simTrades, state.currentR, simAccount),
    [simTrades, state.currentR, simAccount]
  );

  // ---- State --------------------------------------------------------------
  const [method, setMethod] = useState('permutation');
  const [runs, setRuns] = useState(10000);
  const [blockSize, setBlockSize] = useState(5);
  const [seed, setSeed] = useState(randomSeed);

  // Current account balance is the default starting point,
  // but Monte Carlo uses its own explicit starting-capital value.
  // This prevents future/live balance changes from silently redefining
  // the historical simulation starting capital.
  const accountBalance = useMemo(() => {
    const bal = Number(simAccount?.balance);
    return Number.isFinite(bal) && bal > 0 ? bal : 0;
  }, [simAccount]);

  const [initialCapital, setInitialCapital] = useState(0);

  // Reset simulation starting capital whenever the selected account changes.
  // The current account balance is only the default; the user can override it.
  useEffect(() => {
    setInitialCapital(accountBalance);
  }, [simAccountId]);

  // Best-effort $/R conversion: if the account exposes per-trade risk we use it.
  // Otherwise fall back to a 1% risk assumption only if the account suggests a %
  // risk model; otherwise leave at 0 so the UI hides the % row.
  const dollarsPerR = useMemo(() => {
    // Money mode has no R conversion.
    if (unitMode === 'money') return 0;

    const perTradeRisk = Number(simAccount?.riskPerTrade);

    if (Number.isFinite(perTradeRisk) && perTradeRisk > 0) {
      return perTradeRisk;
    }

    const pct = Number(simAccount?.riskPerTradePct);

    if (
      Number.isFinite(pct) &&
      pct > 0 &&
      initialCapital > 0
    ) {
      return (pct / 100) * initialCapital;
    }

    return 0;
  }, [simAccount, unitMode, initialCapital]);

  // Threshold is a DRAWDOWN DEPTH now, always stored as a negative magnitude.
  const defaultRuin = useMemo(
    () => unitMode === 'money'
      ? (initialCapital > 0 ? -initialCapital * 0.20 : -1000)
      : -10,
    [unitMode, initialCapital]
  );

  const [ruinThreshold, setRuinThreshold] = useState(defaultRuin);
  const [thresholdCustomized, setThresholdCustomized] = useState(false);

  const [result, setResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const simulationRunId = useRef(0);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    // A different account means a different trade population/account context.
    // Any previous Monte Carlo result must be discarded.
    simulationRunId.current += 1;
    setResult(null);
    setIsRunning(false);

    // Account/mode changes restore the default DD threshold.
    setThresholdCustomized(false);
    setRuinThreshold(defaultRuin);
  }, [simAccountId, unitMode]);

  useEffect(() => {
    if (!thresholdCustomized) {
      setRuinThreshold(defaultRuin);
    }
  }, [defaultRuin, thresholdCustomized]);

  const scores = useMemo(
    () => (stats?.outcomes || []).map(o => o.score ?? 0),
    [stats]
  );

  const actualCurve = useMemo(() => {
    const eq = stats?.equity || [];
    return [0, ...eq.map(p => p.y)];
  }, [stats]);

  const targets = useMemo(
    () => isMoney
      ? [
          initialCapital > 0 ? initialCapital * 0.05 : 500,
          initialCapital > 0 ? initialCapital * 0.10 : 1000,
          initialCapital > 0 ? initialCapital * 0.25 : 2500,
          initialCapital > 0 ? initialCapital * 0.50 : 5000,
        ]
      : [5, 10, 20, 50],
    [isMoney, initialCapital]
  );

  const simulationConfig = useMemo(() => ({
    unitMode,
    method,
    runs,
    seed,
    ddThreshold: Number.isFinite(ruinThreshold) ? ruinThreshold : null,
    targets,
    initialCapital,
    blockSize,
    dollarsPerR,
  }), [
    unitMode,
    method,
    runs,
    seed,
    ruinThreshold,
    targets,
    initialCapital,
    blockSize,
    dollarsPerR,
  ]);
  const run = useCallback(() => {
    if (scores.length < 5) {
      console.warn(
        `[Simulator] Cannot run Monte Carlo: at least 5 trades are required. Current: ${scores.length}.`
      );
      return;
    }

    const runId = ++simulationRunId.current;
    setIsRunning(true);
    setTimeout(() => {
      try {
        const res = runMonteCarlo(scores, {
          method: simulationConfig.method,
          runs: simulationConfig.runs,
          seed: simulationConfig.seed,

          // Keep the engine-compatible field for now.
          // In Phase 3 we'll rename the engine API completely.
          ruinThreshold: simulationConfig.ddThreshold,

          targets: simulationConfig.targets,
          initialCapital: simulationConfig.initialCapital,
          blockSize: simulationConfig.blockSize,
          dollarsPerR: simulationConfig.dollarsPerR,
        });

        if (res) {
          // Explicit unit mode for downstream panels/export.
          res.unitMode = simulationConfig.unitMode;

          // Store the exact configuration that produced this result.
          res.simulationConfig = { ...simulationConfig };
        }
        if (runId === simulationRunId.current) {
          setResult(res);
        }
      } catch (err) {
        console.error('[Simulator] error:', err);

        if (runId === simulationRunId.current) {
          setResult(null);
        }
      } finally {
        if (runId === simulationRunId.current) {
          setIsRunning(false);
        }
      }
    }, 20);
  }, [scores, simulationConfig]);

  const resultIsStale = useMemo(() => {
    if (!result) return false;

    return !simulationConfigsEqual(
      result.simulationConfig,
      simulationConfig
    );
  }, [result, simulationConfig]);

  const summary = useMemo(
    () => summarizeMC(result),
    [result]
  );

  const handleExport = () => {
    if (!result || !summary || resultIsStale) return;

    const fmt = (value) => {
      if (value == null || value === '') return '';
      if (typeof value === 'number') {
        return Number.isFinite(value) ? String(value) : '';
      }
      return String(value);
    };

    const csvEscape = (value) => {
      const text = fmt(value);

      if (
        text.includes(',') ||
        text.includes('"') ||
        text.includes('\n') ||
        text.includes('\r')
      ) {
        return `"${text.replace(/"/g, '""')}"`;
      }

      return text;
    };

    const addRow = (rows, label, value, extra = '') => {
      rows.push([label, value, extra]);
    };

    const rows = [
      ['Monte Carlo Export'],
      ['Generated', new Date().toISOString()],
      [],

      ['Simulation Configuration'],
    ];

    addRow(rows, 'Account', result.account ?? '');
    addRow(rows, 'Account Type', result.accountType ?? '');
    addRow(rows, 'Unit Mode', result.unitMode ?? '');
    addRow(rows, 'Method', result.method ?? '');
    addRow(rows, 'Runs', result.runs ?? '');
    addRow(rows, 'Trades per Run', result.n ?? '');
    addRow(rows, 'Seed', result.seed ?? '');
    addRow(
      rows,
      'Block Size',
      result.method === 'block' ? result.blockSize ?? '' : ''
    );
    addRow(rows, 'Starting Capital', result.initialCapital ?? '');
    addRow(rows, 'Dollars per R', result.dollarsPerR ?? '');
    addRow(rows, 'DD Threshold (breach depth)', result.ddThreshold ?? 'none');

    if (Array.isArray(result.targets) && result.targets.length > 0) {
      addRow(rows, 'Targets', result.targets.join(' | '));
    }

    rows.push(
      [],
      ['Core Results']
    );

    addRow(rows, 'Final P&L — p5', summary.finalPnl?.p5 ?? '');
    addRow(rows, 'Final P&L — p50', summary.finalPnl?.p50 ?? '');
    addRow(rows, 'Final P&L — p95', summary.finalPnl?.p95 ?? '');
    addRow(rows, 'Profitable Samples %', summary.profitPct ?? '');
    addRow(rows, 'Profitable Samples Count', summary.profitCount ?? '');
    addRow(
      rows,
      'DD Threshold Breach %',
      summary.ddBreachPct ?? ''
    );
    addRow(
      rows,
      'DD Threshold Breach Count',
      summary.ddBreachCount ?? ''
    );

    rows.push(
      [],
      ['Drawdown']
    );

    addRow(
      rows,
      'Max Drawdown — p5',
      result.maxDrawdown?.p5 ?? ''
    );
    addRow(
      rows,
      'Max Drawdown — p50',
      result.maxDrawdown?.p50 ?? ''
    );
    addRow(
      rows,
      'Max Drawdown — p95',
      result.maxDrawdown?.p95 ?? ''
    );

    rows.push(
      [],
      ['Recovery']
    );

    addRow(
      rows,
      'Recovery Trades — p5',
      result.recovery?.p5 ?? ''
    );
    addRow(
      rows,
      'Recovery Trades — p50',
      result.recovery?.p50 ?? ''
    );
    addRow(
      rows,
      'Recovery Trades — p95',
      result.recovery?.p95 ?? ''
    );

    rows.push(
      [],
      ['Streaks']
    );

    addRow(
      rows,
      'Longest Win Streak — p5',
      result.streaks?.wins?.p5 ?? ''
    );
    addRow(
      rows,
      'Longest Win Streak — p50',
      result.streaks?.wins?.p50 ?? ''
    );
    addRow(
      rows,
      'Longest Win Streak — p95',
      result.streaks?.wins?.p95 ?? ''
    );

    addRow(
      rows,
      'Longest Loss Streak — p5',
      result.streaks?.losses?.p5 ?? ''
    );
    addRow(
      rows,
      'Longest Loss Streak — p50',
      result.streaks?.losses?.p50 ?? ''
    );
    addRow(
      rows,
      'Longest Loss Streak — p95',
      result.streaks?.losses?.p95 ?? ''
    );

    rows.push(
      [],
      ['Ratios']
    );

    addRow(rows, 'Sharpe — p5', result.ratios?.sharpe?.p5 ?? '');
    addRow(rows, 'Sharpe — p50', result.ratios?.sharpe?.p50 ?? '');
    addRow(rows, 'Sharpe — p95', result.ratios?.sharpe?.p95 ?? '');

    addRow(rows, 'Sortino — p5', result.ratios?.sortino?.p5 ?? '');
    addRow(rows, 'Sortino — p50', result.ratios?.sortino?.p50 ?? '');
    addRow(rows, 'Sortino — p95', result.ratios?.sortino?.p95 ?? '');

    addRow(
      rows,
      'Profit Factor — p5',
      result.ratios?.profitFactor?.p5 ?? ''
    );
    addRow(
      rows,
      'Profit Factor — p50',
      result.ratios?.profitFactor?.p50 ?? ''
    );
    addRow(
      rows,
      'Profit Factor — p95',
      result.ratios?.profitFactor?.p95 ?? ''
    );

    addRow(
      rows,
      'Expectancy — p5',
      result.ratios?.expectancy?.p5 ?? ''
    );
    addRow(
      rows,
      'Expectancy — p50',
      result.ratios?.expectancy?.p50 ?? ''
    );
    addRow(
      rows,
      'Expectancy — p95',
      result.ratios?.expectancy?.p95 ?? ''
    );

    addRow(
      rows,
      'Win Rate — p5',
      result.ratios?.winRate?.p5 ?? ''
    );
    addRow(
      rows,
      'Win Rate — p50',
      result.ratios?.winRate?.p50 ?? ''
    );
    addRow(
      rows,
      'Win Rate — p95',
      result.ratios?.winRate?.p95 ?? ''
    );

    if (Array.isArray(result.timeToTarget) && result.timeToTarget.length > 0) {
      rows.push(
        [],
        ['Targets']
      );

      result.timeToTarget.forEach((target) => {
        addRow(
          rows,
          `Target ${target.target} — P(ever touched)`,
          target.successPct ?? ''
        );

        addRow(
          rows,
          `Target ${target.target} — P(final ≥ target)`,
          target.finalPct ?? ''
        );

        addRow(
          rows,
          `Target ${target.target} — First Hit p25`,
          target.p25Trades ?? ''
        );

        addRow(
          rows,
          `Target ${target.target} — First Hit p50`,
          target.medianTrades ?? ''
        );

        addRow(
          rows,
          `Target ${target.target} — First Hit p75`,
          target.p75Trades ?? ''
        );
      });
    }

    if (result.method === 'permutation') {
      rows.push(
        [],
        ['Permutation Note'],
        [
          'Explanation',
          'Total P&L is invariant across permutation runs; only trade ordering and path shape change.'
        ]
      );
    }

    if (result.infinitePfCount != null) {
      rows.push(
        [],
        ['Profit Factor Note'],
        [
          'Runs with infinite Profit Factor',
          result.infinitePfCount
        ]
      );
    }

    const csv = rows
      .map((row) => row.map(csvEscape).join(','))
      .join('\r\n');

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download =
      `monte-carlo-${result.method}-${result.runs}-seed${result.seed}.csv`;

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);
  };

  const handleExportRaw = () => {
    if (!result || resultIsStale) return;

    const fmt = (value) => {
      if (value == null || value === '') return '';

      if (typeof value === 'number') {
        if (value === Infinity) return 'Infinity';
        if (value === -Infinity) return '-Infinity';
        return Number.isFinite(value) ? String(value) : '';
      }

      return String(value);
    };

    const csvEscape = (value) => {
      const text = fmt(value);

      if (
        text.includes(',') ||
        text.includes('"') ||
        text.includes('\n') ||
        text.includes('\r')
      ) {
        return `"${text.replace(/"/g, '""')}"`;
      }

      return text;
    };

    const rows = [
      [
        'Run',
        'Final P&L',
        'Max Drawdown',
        'Max Drawdown %',
        'DD Threshold Breach Trade',
        'Recovery Trades',
        'Sharpe',
        'Sortino',
        'Profit Factor',
        'Expectancy',
        'Win Rate %',
        'Longest Win Streak',
        'Longest Loss Streak',
      ],
    ];

    const runs = result.runs ?? 0;

    for (let i = 0; i < runs; i++) {
      const pf = result.runProfitFactorInfinite?.[i]
        ? 'Infinity'
        : result.runProfitFactors?.[i] ?? '';

      rows.push([
        i + 1,
        result.finalValues?.[i] ?? '',
        result.maxDDs?.[i] ?? '',
        result.maxDDPct?.[i] ?? '',
        result.ddBreachTrades?.[i] ?? '',
        result.recoveryTrades?.[i] ?? '',
        result.sharpes?.[i] ?? '',
        result.sortinos?.[i] ?? '',
        pf,
        result.expectancies?.[i] ?? '',
        Number.isFinite(result.winRates?.[i])
          ? result.winRates[i] * 100
          : '',
        result.longestWins?.[i] ?? '',
        result.longestLosses?.[i] ?? '',
      ]);
    }

    const csv = rows
      .map((row) => row.map(csvEscape).join(','))
      .join('\r\n');

    const blob = new Blob([csv], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download =
      `monte-carlo-runs-${result.method}-${result.runs}-seed${result.seed}.csv`;

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);

    URL.revokeObjectURL(url);
  };

  const canRun = scores.length >= 5;

  const renderAccountSelector = () => (
    <div className="sim-ctx">
      <span className="sim-ctx-label">Context</span>
      <select
        className="sim-ctx-select"
        value={simAccountId}
        onChange={(e) => setSimAccountId(e.target.value)}
      >
        {state.accounts.map(acc => (
          <option key={acc.id} value={acc.id}>
            {acc.name} ({acc.type})
          </option>
        ))}
      </select>
    </div>
  );

  if (state.accounts.length === 0) {
    return (
      <>
        <style>{SIM_CSS}</style>
        <div className="sim-page">
          <div className="sim-empty-wrap">
            <div className="sim-empty">
              <div className="sim-empty-icon">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                  <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                  <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
                </svg>
              </div>
              <h3>No accounts configured</h3>
              <p>Create or sync a trading account in the <b>Accounts</b> tab to generate Monte Carlo probabilistic scenarios.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (loadingTrades && !canRun) {
    return (
      <>
        <style>{SIM_CSS}</style>
        <div className="sim-page">
          <div className="sim-loading" style={{ minHeight: 'calc(100vh - 120px)', justifyContent: 'center' }}>
            <div className="sim-spinner" />
            <span>Fetching market execution history…</span>
          </div>
        </div>
      </>
    );
  }

  if (!canRun) {
    return (
      <>
        <style>{SIM_CSS}</style>
        <div className="sim-page">
          <div className="sim-card sim-head">
            <div className="sim-head-left">
              <span className="sim-eyebrow">Analysis</span>
              <div className="sim-title-row">
                <h1 className="sim-title">Monte Carlo Simulator</h1>
              </div>
              <span className="sim-sub">
                Simulate sequence variations without mutating active session states.
              </span>
            </div>
            {renderAccountSelector()}
          </div>
          <div className="sim-info">
            <div className="sim-info-icon">📊</div>
            <div className="sim-info-title">
              Insufficient Data for <b>{simAccount?.name || 'Account'}</b>
            </div>
            <div className="sim-info-desc">
              A minimum of 5 trades is required to build a statistical distribution curve.
              Currently recorded: <b>{scores.length}</b>.
            </div>
          </div>
        </div>
      </>
    );
  }

  const badgeClass = simAccount?.type === 'Live'
    ? 'is-live' : simAccount?.type === 'Demo'
      ? 'is-demo' : 'is-backtest';

  return (
    <>
      <style>{SIM_CSS}</style>
      <div className="sim-page">
        <div className="sim-card sim-head">
          <div className="sim-head-left">
            <span className="sim-eyebrow">Analysis</span>
            <div className="sim-title-row">
              <h1 className="sim-title">Monte Carlo Simulator</h1>
              {simAccount && (
                <span className={`sim-badge ${badgeClass}`}>{simAccount.type}</span>
              )}
            </div>
            <span className="sim-sub">
              <b>{stats.n}</b> executions loaded · Model Mode:{' '}
              <b>{unitMode === 'money' ? 'Net Cash P&L' : 'R-Multiple Shift'}</b>
              {initialCapital > 0 && !isMoney && (
                <> · Starting Capital: <b>${initialCapital.toLocaleString()}</b>
                  {dollarsPerR > 0 && <> · 1R ≈ <b>${dollarsPerR.toFixed(2)}</b></>}
                </>
              )}
            </span>
          </div>
          {renderAccountSelector()}
        </div>

        <SimulatorControls
          method={method} setMethod={setMethod}
          runs={runs} setRuns={setRuns}
          initialCapital={initialCapital}
          setInitialCapital={setInitialCapital}
          seed={seed} setSeed={setSeed} randomizeSeed={() => setSeed(randomSeed())}
          blockSize={blockSize} setBlockSize={setBlockSize}
          ruinThreshold={ruinThreshold}
          setRuinThreshold={setRuinThreshold}
          setThresholdCustomized={setThresholdCustomized}
          isMoney={isMoney}
          isRunning={isRunning}
          onRun={run}
          onExport={handleExport}
          onExportRaw={handleExportRaw}
          hasResult={!!result}
          isStale={resultIsStale}
        />

        {result && resultIsStale && !isRunning && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '11px 14px',
              borderRadius: 12,
              background: 'rgba(245,158,11,.08)',
              border: '1px solid rgba(245,158,11,.28)',
              color: '#FDE68A',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 11.5,
              lineHeight: 1.5,
            }}
          >
            <span style={{ fontSize: 15 }}>⚠</span>

            <span>
              <b>Simulation settings changed.</b>{' '}
              The results below were generated with an older configuration.
              Click <b>Run Simulation</b> to update them.
            </span>
          </div>
        )}

        {isRunning && !result && (
          <div className="sim-card sim-loading">
            <div className="sim-spinner" />
            <span>Simulating {runs.toLocaleString()} {method} paths…</span>
          </div>
        )}

        {result && summary && (
          <SimulatorPanels
            result={result}
            summary={summary}
            isMoney={isMoney}
            initialCapital={result?.initialCapital ?? initialCapital}
            dollarsPerR={result?.dollarsPerR ?? dollarsPerR}
            actualCurve={actualCurve}
            tab={tab}
            setTab={setTab}
            resultIsStale={resultIsStale}
          />
        )}
      </div>
    </>
  );
}