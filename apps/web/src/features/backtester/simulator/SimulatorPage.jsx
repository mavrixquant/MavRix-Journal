// apps/web/src/features/backtester/simulator/SimulatorPage.jsx
//
// Monte Carlo Simulator.
//
// Title + badge are published to the GLOBAL header bar via usePageHeader().
// The account is the one currently selected in the header's account selector
// (via useDashboardAccount()). The old in-page "Context" dropdown has been
// removed — the header selector is the single source of truth.

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAppContext } from '@/app/providers/AppProvider';
import { useDashboardAccount } from '@/app/providers/useDashboardAccount';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';
import { useTrades } from '@/shared/api/trades';
import { useAccounts } from '@/shared/api/accounts';
import { enrichTradesFromDB } from '@/shared/trading/enrich';
import { computeStats } from '@/shared/trading/stats';
import { getMetricMode } from '@/shared/trading/sl';
import { summarizeMC } from '@/shared/trading/monteCarlo';
import { useMonteCarloWorker } from '@/features/backtester/simulator/hooks/useMonteCarloWorker';
import SimulatorControls from './components/SimulatorControls';
import SimulatorPanels from './components/SimulatorPanels';

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

/* ------------------------------------------------------------------ */
/*  Page-local CSS.                                                    */
/* ------------------------------------------------------------------ */
const SIM_CSS = `
  .sim-page {
    --accent: #F59E0B; --accent-2: #FDE68A;
    --accent-soft: rgba(245,158,11,.10);
    --accent-soft2: rgba(245,158,11,.28);
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE; --ink-2: #8892A3; --ink-3: #545E6E;
    --win: #22c55e; --loss: #ef4444;
    width: 100%; max-width: 1560px; margin: 0 auto;
    box-sizing: border-box; display: flex; flex-direction: column; gap: 22px;
    color: var(--ink-1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  /* Content cards (SimulatorControls / Panels also use this). */
  .sim-card {
    position: relative; border-radius: 18px;
    background: linear-gradient(180deg, rgba(15,18,25,.72), rgba(15,18,25,.55));
    backdrop-filter: blur(18px) saturate(140%);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
    border: 1px solid var(--line);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9), inset 0 1px 0 rgba(255,255,255,.03);
    overflow: hidden;
  }

  /* Empty / info states. */
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

  @keyframes simFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
  @keyframes simSpin { to { transform: rotate(360deg); } }

  @media (prefers-reduced-motion: reduce) {
    .sim-empty::before, .sim-spinner { animation: none !important; }
  }
  @media (max-width: 640px) {
    .sim-page { padding: 16px; }
  }
`;

export default function SimulatorPage() {
  const { state } = useAppContext();
  // The active account comes from the header's account selector for
  // the /backtester route. No local dropdown anymore.
  const { accountId } = useDashboardAccount();

  // ──────────────────────────────────────────────────────────────
  //  Data layer — React Query hooks
  // ──────────────────────────────────────────────────────────────
  const { data: accounts = [] } = useAccounts();

  const { data: rawSimTrades = [], isLoading: loadingTrades } =
    useTrades(accountId);

  const simTrades = useMemo(() => {
    if (!rawSimTrades || rawSimTrades.length === 0) return [];
    return enrichTradesFromDB(rawSimTrades).enrichedTrades;
  }, [rawSimTrades]);

  const simAccount = useMemo(
    () => accounts.find((a) => a.id === accountId) || null,
    [accounts, accountId]
  );

  const metric = useMemo(() => getMetricMode(simAccount), [simAccount]);
  const isMoney = metric === '$';
  const unitMode = isMoney ? 'money' : 'R';

  const stats = useMemo(
    () => computeStats(simTrades, state.currentR, simAccount),
    [simTrades, state.currentR, simAccount]
  );

  // ──────────────────────────────────────────────────────────────
  //  Simulation state
  // ──────────────────────────────────────────────────────────────
  const [method, setMethod] = useState('permutation');
  const [runs, setRuns] = useState(10000);
  const [blockSize, setBlockSize] = useState(5);
  const [seed, setSeed] = useState(randomSeed);

  const accountBalance = useMemo(() => {
    const bal = Number(simAccount?.balance);
    return Number.isFinite(bal) && bal > 0 ? bal : 0;
  }, [simAccount]);

  const [initialCapital, setInitialCapital] = useState(0);

  useEffect(() => {
    setInitialCapital(accountBalance);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const dollarsPerR = useMemo(() => {
    if (unitMode === 'money') return 0;

    const perTradeRisk = Number(simAccount?.riskPerTrade);
    if (Number.isFinite(perTradeRisk) && perTradeRisk > 0) {
      return perTradeRisk;
    }

    const pct = Number(simAccount?.riskPerTradePct);
    if (Number.isFinite(pct) && pct > 0 && initialCapital > 0) {
      return (pct / 100) * initialCapital;
    }

    return 0;
  }, [simAccount, unitMode, initialCapital]);

  const defaultRuin = useMemo(
    () =>
      unitMode === 'money'
        ? initialCapital > 0
          ? -initialCapital * 0.2
          : -1000
        : -10,
    [unitMode, initialCapital]
  );

  const [ruinThreshold, setRuinThreshold] = useState(defaultRuin);
  const [thresholdCustomized, setThresholdCustomized] = useState(false);

  const [result, setResult] = useState(null);
  const [tab, setTab] = useState('overview');

  const {
    run: runWorker,
    cancel: cancelWorker,
    isRunning,
    progress: workerProgress,
  } = useMonteCarloWorker();

  useEffect(() => {
    cancelWorker();
    setResult(null);
    setThresholdCustomized(false);
    setRuinThreshold(defaultRuin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId, unitMode, defaultRuin]);

  useEffect(() => {
    if (!thresholdCustomized) {
      setRuinThreshold(defaultRuin);
    }
  }, [defaultRuin, thresholdCustomized]);

  const scores = useMemo(
    () => (stats?.outcomes || []).map((o) => o.score ?? 0),
    [stats]
  );

  const actualCurve = useMemo(() => {
    const eq = stats?.equity || [];
    return [0, ...eq.map((p) => p.y)];
  }, [stats]);

  const targets = useMemo(
    () =>
      isMoney
        ? [
            initialCapital > 0 ? initialCapital * 0.05 : 500,
            initialCapital > 0 ? initialCapital * 0.1 : 1000,
            initialCapital > 0 ? initialCapital * 0.25 : 2500,
            initialCapital > 0 ? initialCapital * 0.5 : 5000,
          ]
        : [5, 10, 20, 50],
    [isMoney, initialCapital]
  );

  const simulationConfig = useMemo(
    () => ({
      unitMode,
      method,
      runs,
      seed,
      ddThreshold: Number.isFinite(ruinThreshold) ? ruinThreshold : null,
      targets,
      initialCapital,
      blockSize,
      dollarsPerR,
    }),
    [
      unitMode,
      method,
      runs,
      seed,
      ruinThreshold,
      targets,
      initialCapital,
      blockSize,
      dollarsPerR,
    ]
  );

  const run = useCallback(async () => {
    if (scores.length < 5) {
      console.warn(
        `[Simulator] Cannot run Monte Carlo: at least 5 trades are required. Current: ${scores.length}.`
      );
      return;
    }

    try {
      const res = await runWorker(scores, {
        method: simulationConfig.method,
        runs: simulationConfig.runs,
        seed: simulationConfig.seed,
        ruinThreshold: simulationConfig.ddThreshold,
        targets: simulationConfig.targets,
        initialCapital: simulationConfig.initialCapital,
        blockSize: simulationConfig.blockSize,
        dollarsPerR: simulationConfig.dollarsPerR,
      });

      if (res) {
        res.unitMode = simulationConfig.unitMode;
        res.simulationConfig = { ...simulationConfig };
        setResult(res);
      }
    } catch (err) {
      if (err.name === 'Cancelled') {
        console.log('[Simulator] run cancelled by user');
        return;
      }
      console.error('[Simulator] error:', err);
      setResult(null);
    }
  }, [scores, simulationConfig, runWorker]);

  const handleCancel = useCallback(() => {
    cancelWorker();
  }, [cancelWorker]);

  const resultIsStale = useMemo(() => {
    if (!result) return false;
    return !simulationConfigsEqual(result.simulationConfig, simulationConfig);
  }, [result, simulationConfig]);

  const summary = useMemo(() => summarizeMC(result), [result]);

  // ──────────────────────────────────────────────────────────────
  //  Export handlers
  // ──────────────────────────────────────────────────────────────
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
    addRow(rows, 'Block Size', result.method === 'block' ? result.blockSize ?? '' : '');
    addRow(rows, 'Starting Capital', result.initialCapital ?? '');
    addRow(rows, 'Dollars per R', result.dollarsPerR ?? '');
    addRow(rows, 'DD Threshold (breach depth)', result.ddThreshold ?? 'none');

    if (Array.isArray(result.targets) && result.targets.length > 0) {
      addRow(rows, 'Targets', result.targets.join(' | '));
    }

    rows.push([], ['Core Results']);
    addRow(rows, 'Final P&L — p5', summary.finalPnl?.p5 ?? '');
    addRow(rows, 'Final P&L — p50', summary.finalPnl?.p50 ?? '');
    addRow(rows, 'Final P&L — p95', summary.finalPnl?.p95 ?? '');
    addRow(rows, 'Profitable Samples %', summary.profitPct ?? '');
    addRow(rows, 'Profitable Samples Count', summary.profitCount ?? '');
    addRow(rows, 'DD Threshold Breach %', summary.ddBreachPct ?? '');
    addRow(rows, 'DD Threshold Breach Count', summary.ddBreachCount ?? '');

    rows.push([], ['Drawdown']);
    addRow(rows, 'Max Drawdown — p5', result.maxDrawdown?.p5 ?? '');
    addRow(rows, 'Max Drawdown — p50', result.maxDrawdown?.p50 ?? '');
    addRow(rows, 'Max Drawdown — p95', result.maxDrawdown?.p95 ?? '');

    rows.push([], ['Recovery']);
    addRow(rows, 'Recovery Trades — p5', result.recovery?.p5 ?? '');
    addRow(rows, 'Recovery Trades — p50', result.recovery?.p50 ?? '');
    addRow(rows, 'Recovery Trades — p95', result.recovery?.p95 ?? '');

    rows.push([], ['Streaks']);
    addRow(rows, 'Longest Win Streak — p5', result.streaks?.wins?.p5 ?? '');
    addRow(rows, 'Longest Win Streak — p50', result.streaks?.wins?.p50 ?? '');
    addRow(rows, 'Longest Win Streak — p95', result.streaks?.wins?.p95 ?? '');
    addRow(rows, 'Longest Loss Streak — p5', result.streaks?.losses?.p5 ?? '');
    addRow(rows, 'Longest Loss Streak — p50', result.streaks?.losses?.p50 ?? '');
    addRow(rows, 'Longest Loss Streak — p95', result.streaks?.losses?.p95 ?? '');

    rows.push([], ['Ratios']);
    addRow(rows, 'Sharpe — p5', result.ratios?.sharpe?.p5 ?? '');
    addRow(rows, 'Sharpe — p50', result.ratios?.sharpe?.p50 ?? '');
    addRow(rows, 'Sharpe — p95', result.ratios?.sharpe?.p95 ?? '');
    addRow(rows, 'Sortino — p5', result.ratios?.sortino?.p5 ?? '');
    addRow(rows, 'Sortino — p50', result.ratios?.sortino?.p50 ?? '');
    addRow(rows, 'Sortino — p95', result.ratios?.sortino?.p95 ?? '');
    addRow(rows, 'Profit Factor — p5', result.ratios?.profitFactor?.p5 ?? '');
    addRow(rows, 'Profit Factor — p50', result.ratios?.profitFactor?.p50 ?? '');
    addRow(rows, 'Profit Factor — p95', result.ratios?.profitFactor?.p95 ?? '');
    addRow(rows, 'Expectancy — p5', result.ratios?.expectancy?.p5 ?? '');
    addRow(rows, 'Expectancy — p50', result.ratios?.expectancy?.p50 ?? '');
    addRow(rows, 'Expectancy — p95', result.ratios?.expectancy?.p95 ?? '');
    addRow(rows, 'Win Rate — p5', result.ratios?.winRate?.p5 ?? '');
    addRow(rows, 'Win Rate — p50', result.ratios?.winRate?.p50 ?? '');
    addRow(rows, 'Win Rate — p95', result.ratios?.winRate?.p95 ?? '');

    if (Array.isArray(result.timeToTarget) && result.timeToTarget.length > 0) {
      rows.push([], ['Targets']);
      result.timeToTarget.forEach((target) => {
        addRow(rows, `Target ${target.target} — P(ever touched)`, target.successPct ?? '');
        addRow(rows, `Target ${target.target} — P(final ≥ target)`, target.finalPct ?? '');
        addRow(rows, `Target ${target.target} — First Hit p25`, target.p25Trades ?? '');
        addRow(rows, `Target ${target.target} — First Hit p50`, target.medianTrades ?? '');
        addRow(rows, `Target ${target.target} — First Hit p75`, target.p75Trades ?? '');
      });
    }

    if (result.method === 'permutation') {
      rows.push(
        [],
        ['Permutation Note'],
        [
          'Explanation',
          'Total P&L is invariant across permutation runs; only trade ordering and path shape change.',
        ]
      );
    }

    if (result.infinitePfCount != null) {
      rows.push(
        [],
        ['Profit Factor Note'],
        ['Runs with infinite Profit Factor', result.infinitePfCount]
      );
    }

    const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `monte-carlo-${result.method}-${result.runs}-seed${result.seed}.csv`;
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
        Number.isFinite(result.winRates?.[i]) ? result.winRates[i] * 100 : '',
        result.longestWins?.[i] ?? '',
        result.longestLosses?.[i] ?? '',
      ]);
    }

    const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `monte-carlo-runs-${result.method}-${result.runs}-seed${result.seed}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const canRun = scores.length >= 5;

  // Publish title + badge to the global header bar.
  const badgeVariant = simAccount?.type === 'Backtest'
    ? 'is-backtest'
    : simAccount?.type === 'Live'
      ? 'is-live'
      : simAccount?.type === 'Demo'
        ? 'is-demo'
        : 'is-default';

  usePageHeader({
    title: 'Monte Carlo Simulator',
    badge: simAccount?.type,
    badgeVariant,
  });

  /* ---------------------------------------------------------------- */
  /*  Early returns                                                    */
  /* ---------------------------------------------------------------- */

  if (accounts.length === 0) {
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
              <p>
                Create or sync a trading account in the <b>Accounts</b> tab to generate Monte Carlo probabilistic scenarios.
              </p>
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

  return (
    <>
      <style>{SIM_CSS}</style>
      <div className="sim-page">

        <SimulatorControls
          method={method}
          setMethod={setMethod}
          runs={runs}
          setRuns={setRuns}
          initialCapital={initialCapital}
          setInitialCapital={setInitialCapital}
          seed={seed}
          setSeed={setSeed}
          randomizeSeed={() => setSeed(randomSeed())}
          blockSize={blockSize}
          setBlockSize={setBlockSize}
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
          onCancel={handleCancel}
          workerProgress={workerProgress}
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
              <b>Simulation settings changed.</b> The results below were generated
              with an older configuration. Click <b>Run Simulation</b> to update them.
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