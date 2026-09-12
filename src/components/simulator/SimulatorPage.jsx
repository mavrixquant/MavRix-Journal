// src/components/simulator/SimulatorPage.jsx
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAppContext } from '../../context/AppContext';
import { subscribeToTrades } from '../../firebase/tradesService';
import { enrichTradesFromDB } from '../../utils/enrichTrades';
import { computeStats } from '../../utils/statsEngine';
import { getMetricMode } from '../../utils/slResolver';
import { runMonteCarlo, summarizeMC } from '../../utils/monteCarlo';
import SimulatorControls from './SimulatorControls';
import SimulatorPanels from './SimulatorPanels';

const randomSeed = () => Math.floor(Math.random() * 1e9);

/* CSS unchanged from previous version — kept identical so the page shell doesn't change */
const SIM_CSS = `
  .sim-page {
    --accent: #F59E0B;
    --accent-2: #FDE68A;
    --accent-soft: rgba(245,158,11,.10);
    --accent-soft2: rgba(245,158,11,.28);
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;
    --win: #22c55e;
    --loss: #ef4444;

    padding: 24px;
    width: 100%;
    max-width: 1560px;
    margin: 0 auto;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 22px;
    color: var(--ink-1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  .sim-card {
    position: relative;
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(15,18,25,.72), rgba(15,18,25,.55));
    backdrop-filter: blur(18px) saturate(140%);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
    border: 1px solid var(--line);
    box-shadow:
      0 20px 50px -30px rgba(0,0,0,.9),
      inset 0 1px 0 rgba(255,255,255,.03);
    overflow: hidden;
  }

  .sim-head {
    padding: 18px 22px 16px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
  }
  .sim-head::before {
    content: '';
    position: absolute;
    left: 0; right: 0; top: 0; height: 2px;
    border-radius: 18px 18px 0 0;
    background: linear-gradient(90deg, transparent, var(--accent), var(--accent-2), var(--accent), transparent);
    background-size: 200% 100%;
    animation: simGrad 4s linear infinite;
    pointer-events: none;
  }
  .sim-head-left {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }
  .sim-eyebrow {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--ink-3);
  }
  .sim-title-row {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }
  .sim-title {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -.02em;
    color: var(--ink-1);
    line-height: 1.1;
  }
  .sim-badge {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .1em;
    text-transform: uppercase;
    padding: 3px 10px;
    border-radius: 99px;
    border: 1px solid;
    white-space: nowrap;
  }
  .sim-badge.is-live {
    color: #4ade80;
    background: rgba(74,222,128,.10);
    border-color: rgba(74,222,128,.35);
  }
  .sim-badge.is-demo {
    color: var(--accent);
    background: rgba(245,158,11,.10);
    border-color: var(--accent-soft2);
  }
  .sim-badge.is-backtest {
    color: #60a5fa;
    background: rgba(96,165,250,.10);
    border-color: rgba(96,165,250,.32);
  }
  .sim-sub {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
    color: var(--ink-2);
    letter-spacing: .01em;
  }
  .sim-sub b { color: var(--ink-1); font-weight: 700; }

  .sim-ctx {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 6px 6px 6px 14px;
    background: rgba(0,0,0,.22);
    border: 1px solid var(--line-soft);
    border-radius: 12px;
    backdrop-filter: blur(8px);
  }
  .sim-ctx-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--ink-3);
    white-space: nowrap;
  }
  .sim-ctx-select {
    padding: 8px 30px 8px 12px;
    background: rgba(10,13,19,.6);
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 9px;
    color: var(--ink-1);
    font-size: 12.5px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-weight: 600;
    cursor: pointer;
    outline: none;
    min-width: 210px;
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 20 20' fill='%23545E6E'><path d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z'/></svg>");
    background-repeat: no-repeat;
    background-position: right 10px center;
    transition: all .2s;
  }
  .sim-ctx-select:hover { border-color: rgba(255,255,255,.2); }
  .sim-ctx-select:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(245,158,11,.15);
  }

  .sim-empty-wrap {
    min-height: calc(100vh - 160px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 16px;
  }
  .sim-empty {
    position: relative;
    max-width: 520px;
    width: 100%;
    padding: 56px 40px 48px;
    border-radius: 26px;
    background:
      radial-gradient(400px 220px at 50% 0%, rgba(245,158,11,.12), transparent 70%),
      linear-gradient(180deg, rgba(15,18,25,.72), rgba(15,18,25,.55));
    border: 1px solid rgba(255,255,255,.1);
    box-shadow:
      0 40px 90px -50px rgba(245,158,11,.5),
      inset 0 1px 0 rgba(255,255,255,.04);
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    overflow: hidden;
  }
  .sim-empty::before {
    content: '';
    position: absolute;
    left: -40%; top: -40%;
    width: 180%; height: 180%;
    background: radial-gradient(circle at 50% 50%, rgba(245,158,11,.08), transparent 45%);
    animation: simFloat 8s ease-in-out infinite;
    pointer-events: none;
  }
  .sim-empty > * { position: relative; z-index: 1; }
  .sim-empty-icon {
    width: 64px;
    height: 64px;
    border-radius: 18px;
    background: linear-gradient(135deg, rgba(245,158,11,.18), rgba(245,158,11,.05));
    border: 1px solid var(--accent-soft2);
    color: var(--accent);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 22px;
    box-shadow: 0 0 40px -8px rgba(245,158,11,.5);
    font-size: 24px;
  }
  .sim-empty h3 {
    margin: 0 0 10px;
    font-size: 20px;
    font-weight: 700;
    color: var(--ink-1);
    letter-spacing: -.02em;
  }
  .sim-empty p {
    margin: 0;
    font-size: 13.5px;
    color: rgba(255,255,255,.62);
    line-height: 1.65;
    max-width: 400px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    letter-spacing: .01em;
  }
  .sim-empty p b { color: var(--accent); font-weight: 700; }

  .sim-loading {
    padding: 60px 20px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
    letter-spacing: .02em;
  }
  .sim-spinner {
    width: 28px;
    height: 28px;
    border: 2.5px solid var(--line);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: simSpin .8s linear infinite;
  }

  .sim-info {
    padding: 48px 24px;
    text-align: center;
    border: 1px dashed rgba(255,255,255,.1);
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,.005));
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  .sim-info-icon {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: rgba(245,158,11,.10);
    border: 1px solid var(--accent-soft2);
    color: var(--accent);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    margin-bottom: 4px;
  }
  .sim-info-title {
    font-size: 15px;
    font-weight: 700;
    color: var(--ink-1);
    letter-spacing: -.01em;
  }
  .sim-info-title b { color: var(--accent); }
  .sim-info-desc {
    font-size: 12.5px;
    color: var(--ink-2);
    max-width: 420px;
    line-height: 1.65;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    letter-spacing: .01em;
  }
  .sim-info-desc b { color: var(--ink-1); }

  @keyframes simGrad {
    0%   { background-position: 0% 50%; }
    100% { background-position: 200% 50%; }
  }
  @keyframes simFloat {
    0%,100% { transform: translateY(0); }
    50%     { transform: translateY(-12px); }
  }
  @keyframes simSpin {
    to { transform: rotate(360deg); }
  }

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

  const stats = useMemo(
    () => computeStats(simTrades, state.currentR, simAccount),
    [simTrades, state.currentR, simAccount]
  );

  // ---- State --------------------------------------------------------------
  const [method, setMethod] = useState('permutation');
  const [runs, setRuns] = useState(1000);
  const [blockSize, setBlockSize] = useState(5);
  const [seed, setSeed] = useState(randomSeed);

  // Starting capital — used for % drawdown and ruin defaults
  const initialCapital = useMemo(() => {
    const bal = Number(simAccount?.balance);
    return Number.isFinite(bal) && bal > 0 ? bal : 0;
  }, [simAccount]);

  // Ruin threshold: 20% of starting capital in $ mode; -10R in R mode
  const defaultRuin = useMemo(
    () => isMoney
      ? (initialCapital > 0 ? -initialCapital * 0.20 : -1000)
      : -10,
    [isMoney, initialCapital]
  );

  const [ruinThreshold, setRuinThreshold] = useState(defaultRuin);

  const [result, setResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [tab, setTab] = useState('overview');

  // Reset when account or unit mode changes
  useEffect(() => {
    setResult(null);
    setRuinThreshold(defaultRuin);
  }, [simAccountId, isMoney, defaultRuin]);

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

  // ---- Run ---------------------------------------------------------------
  const run = useCallback(() => {
    if (scores.length < 5) return;
    setIsRunning(true);
    setTimeout(() => {
      try {
        const res = runMonteCarlo(scores, {
          method,
          runs,
          seed,
          ruinThreshold: Number.isFinite(ruinThreshold) ? ruinThreshold : null,
          targets,
          initialCapital,
          blockSize,
        });
        if (res) res.unitMode = isMoney ? '$' : 'R';
        setResult(res);
      } catch (err) {
        console.error('[Simulator] error:', err);
        setResult(null);
      } finally {
        setIsRunning(false);
      }
    }, 20);
  }, [scores, method, runs, seed, ruinThreshold, targets, initialCapital, blockSize, isMoney]);

  // Auto-run on data load
  useEffect(() => {
    if (scores.length >= 5 && !loadingTrades) {
      run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scores.length, loadingTrades, simAccountId]);

  // Re-run when any knob changes and we already have a result
  useEffect(() => {
    if (result) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, runs, seed, ruinThreshold, blockSize]);

  const summary = useMemo(() => summarizeMC(result), [result]);

  // ---- Export ------------------------------------------------------------
  const handleExport = () => {
    if (!result || !summary) return;
    const fmt = (v) => v == null || Number.isNaN(v) ? '' : v.toFixed(4);
    const rows = [
      ['Monte Carlo Export'],
      ['Generated', new Date().toISOString()],
      ['Account', simAccount?.name || ''],
      ['Account Type', simAccount?.type || ''],
      ['Unit Mode', result.unitMode || ''],
      ['Method', result.method],
      ['Runs', result.runs],
      ['Trades per Run', result.n],
      ['Seed', result.seed],
      ['Block Size', result.method === 'block' ? result.blockSize : ''],
      ['Starting Capital', result.initialCapital || ''],
      ['Ruin Threshold', result.ruinThreshold ?? 'none'],
      [],
      ['Metric', '5th %ile', '25th %ile', 'Median', '75th %ile', '95th %ile'],
      ['Final Equity',  fmt(summary.p5Final),  fmt(summary.p25Final), fmt(summary.medianFinal), fmt(summary.p75Final), fmt(summary.p95Final)],
      ['Max Drawdown',  fmt(summary.maxDD_p5), fmt(summary.maxDD_p25), fmt(summary.maxDD_p50), fmt(summary.maxDD_p75), fmt(summary.maxDD_p95)],
      ['Max DD % of Capital', fmt(summary.maxDDPct_p5), '', fmt(summary.maxDDPct_p50), '', fmt(summary.maxDDPct_p95)],
      ['Sharpe',        fmt(summary.sharpe_p5), '', fmt(summary.sharpe_p50), '', fmt(summary.sharpe_p95)],
      ['Sortino (median)', '', '', fmt(summary.sortino_p50), '', ''],
      ['Profit Factor (median)', '', '', fmt(summary.pf_p50), '', ''],
      ['Expectancy (median)', '', '', fmt(summary.exp_p50), '', ''],
      ['Win Rate % (median)', '', '', fmt(summary.win_p50), '', ''],
      [],
      ['P(Profit)', summary.profitPct.toFixed(2) + '%', `${summary.profitCount}/${result.runs}`],
      ['Risk of Ruin', summary.ruinPct.toFixed(2) + '%', `${summary.ruinCount}/${result.runs}`],
      ['Longest Win Streak (median)', summary.winStreak_p50],
      ['Longest Win Streak (95th)', summary.winStreak_p95],
      ['Longest Loss Streak (median)', summary.lossStreak_p50],
      ['Longest Loss Streak (95th)', summary.lossStreak_p95],
    ];
    const csv = rows.map(r => r.map(v => {
      const s = String(v ?? '');
      return s.includes(',') ? `"${s}"` : s;
    }).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monte-carlo-${result.method}-${result.runs}-seed${result.seed}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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

  // ---- No accounts -------------------------------------------------------
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
              <p>
                Create or sync a trading account in the <b>Accounts</b> tab to generate
                Monte Carlo probabilistic scenarios.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ---- Loading -----------------------------------------------------------
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

  // ---- Insufficient data -------------------------------------------------
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

  // ---- Full simulator ----------------------------------------------------
  const badgeClass = simAccount?.type === 'Live'
    ? 'is-live'
    : simAccount?.type === 'Demo'
      ? 'is-demo'
      : 'is-backtest';

  return (
    <>
      <style>{SIM_CSS}</style>
      <div className="sim-page">
        {/* Header */}
        <div className="sim-card sim-head">
          <div className="sim-head-left">
            <span className="sim-eyebrow">Analysis</span>
            <div className="sim-title-row">
              <h1 className="sim-title">Monte Carlo Simulator</h1>
              {simAccount && (
                <span className={`sim-badge ${badgeClass}`}>
                  {simAccount.type}
                </span>
              )}
            </div>
            <span className="sim-sub">
              <b>{stats.n}</b> executions loaded · Model Mode:{' '}
              <b>{isMoney ? 'Net Cash P&L' : 'R-Multiple Shift'}</b>
              {initialCapital > 0 && !isMoney && (
                <> · Capital: <b>${initialCapital.toLocaleString()}</b></>
              )}
            </span>
          </div>
          {renderAccountSelector()}
        </div>

        {/* Controls */}
        <SimulatorControls
          method={method} setMethod={setMethod}
          runs={runs} setRuns={setRuns}
          seed={seed} setSeed={setSeed} randomizeSeed={() => setSeed(randomSeed())}
          blockSize={blockSize} setBlockSize={setBlockSize}
          ruinThreshold={ruinThreshold} setRuinThreshold={setRuinThreshold}
          isMoney={isMoney}
          initialCapital={initialCapital}
          isRunning={isRunning}
          onRun={run}
          onExport={handleExport}
          hasResult={!!result}
        />

        {/* Loading */}
        {isRunning && !result && (
          <div className="sim-card sim-loading">
            <div className="sim-spinner" />
            <span>Simulating {runs.toLocaleString()} {method} paths…</span>
          </div>
        )}

        {/* Panels */}
        {result && summary && (
          <SimulatorPanels
            result={result}
            summary={summary}
            isMoney={isMoney}
            initialCapital={initialCapital}
            actualCurve={actualCurve}
            tab={tab}
            setTab={setTab}
          />
        )}
      </div>
    </>
  );
}