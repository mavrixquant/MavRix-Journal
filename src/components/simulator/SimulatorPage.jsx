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

const COLORS = {
  amber: '#FFB020',
  win: '#35C4A1',
  loss: '#FF5C5C',
  text: '#94A3B8',
  textMuted: '#64748B',
  textLight: '#F8FAFC',
  panel: '#0F172A',
  panelBorder: '#1E293B',
  accent: '#6366F1',
};

export default function SimulatorPage() {
  const { state } = useAppContext();

  // ---- Independent account selection (does NOT follow the Dashboard) ----
  const [simAccountId, setSimAccountId] = useState('');
  const [initialized, setInitialized] = useState(false);

  // One-time initialization from the Dashboard's current account,
  // then the Simulator manages its own selection independently.
  useEffect(() => {
    if (!initialized && state.accounts.length > 0) {
      const preferred = state.selectedAccountId || state.accounts[0].id;
      setSimAccountId(preferred);
      setInitialized(true);
    }
  }, [state.accounts, state.selectedAccountId, initialized]);

  // ---- Local trade stream for the selected account ----
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

  // Local stats derived from the Simulator's own account
  const stats = useMemo(
    () => computeStats(simTrades, state.currentR, simAccount),
    [simTrades, state.currentR, simAccount]
  );

  // ---- Simulation state ----
  const [method, setMethod] = useState('permutation');
  const [runs, setRuns] = useState(1000);
  const [ruinThreshold, setRuinThreshold] = useState(isMoney ? -1000 : -10);
  const [result, setResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [tab, setTab] = useState('overview');

  // Reset when account changes
  useEffect(() => {
    setResult(null);
    setRuinThreshold(isMoney ? -1000 : -10);
  }, [simAccountId, isMoney]);

  const scores = useMemo(
    () => (stats?.outcomes || []).map(o => o.score ?? 0),
    [stats]
  );

  const actualCurve = useMemo(() => {
    const eq = stats?.equity || [];
    return [0, ...eq.map(p => p.y)];
  }, [stats]);

  const targets = useMemo(
    () => isMoney ? [500, 1000, 2500, 5000] : [5, 10, 20, 50],
    [isMoney]
  );

  const run = useCallback(() => {
    if (scores.length < 5) return;
    setIsRunning(true);
    setTimeout(() => {
      try {
        const res = runMonteCarlo(scores, { method, runs, seed: 42, ruinThreshold, targets });
        setResult(res);
      } catch (err) {
        console.error('[Simulator] error:', err);
        setResult(null);
      } finally {
        setIsRunning(false);
      }
    }, 20);
  }, [scores, method, runs, ruinThreshold, targets]);

  // Auto-run once trades load and we have enough data
  useEffect(() => {
    if (scores.length >= 5 && !result && !isRunning && !loadingTrades) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scores.length, loadingTrades]);

  // Re-run when method or runs change (only if we already have a result)
  useEffect(() => {
    if (result && (result.method !== method || result.runs !== runs)) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, runs]);

  const summary = useMemo(() => summarizeMC(result), [result]);

  const handleExport = () => {
    if (!result || !summary) return;
    const rows = [
      ['Monte Carlo Export'],
      ['Account', simAccount?.name || ''],
      ['Account Type', simAccount?.type || ''],
      ['Method', result.method],
      ['Runs', result.runs],
      ['Trades', result.n],
      ['Ruin Threshold', result.ruinThreshold ?? 'none'],
      [],
      ['Metric', '5th %ile', '25th %ile', 'Median', '75th %ile', '95th %ile'],
      ['Final Equity', summary.p5Final, summary.p25Final, summary.medianFinal, summary.p75Final, summary.p95Final],
      ['Max Drawdown', summary.maxDD_p5, summary.maxDD_p25, summary.maxDD_p50, summary.maxDD_p75, summary.maxDD_p95],
      ['Sharpe', summary.sharpe_p5, '', summary.sharpe_p50, '', summary.sharpe_p95],
      ['Sortino (median)', '', '', summary.sortino_p50, '', ''],
      ['Profit Factor (median)', '', '', summary.pf_p50, '', ''],
      ['Expectancy (median)', '', '', summary.exp_p50, '', ''],
      ['Win Rate % (median)', '', '', summary.win_p50, '', ''],
      [],
      ['P(Profit)', summary.profitPct.toFixed(2) + '%'],
      ['Risk of Ruin', summary.ruinPct.toFixed(2) + '%'],
      ['Longest Win Streak (95th)', summary.winStreak_p95],
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
    a.download = `monte-carlo-${result.method}-${result.runs}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const canRun = scores.length >= 5;

  // ---- No accounts at all ----
  if (state.accounts.length === 0) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 16px',
        background: 'radial-gradient(circle at top, rgba(99, 102, 241, 0.05) 0%, transparent 70%)'
      }}>
        <div style={{
          maxWidth: '440px',
          width: '100%',
          padding: '40px 32px',
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(12px)',
          border: `1px solid ${COLORS.panelBorder}`,
          borderRadius: '20px',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            color: COLORS.accent
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
              <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
              <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
            </svg>
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 600, color: COLORS.textLight, tracking: '-0.01em' }}>
            No accounts configured
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: COLORS.text, lineHeight: 1.6 }}>
            Create or sync a trading account in the Accounts tab to generate Monte Carlo probabilistic scenarios.
          </p>
        </div>
      </div>
    );
  }

  // ---- Loading trades ----
  if (loadingTrades && !canRun) {
    return (
      <div style={{
        minHeight: 'calc(100vh - 120px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        color: COLORS.text,
        fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
        fontSize: '13px'
      }}>
        <div style={{
          width: '32px',
          height: '32px',
          border: `2px solid ${COLORS.panelBorder}`,
          borderTopColor: COLORS.accent,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <span>Fetching market execution history…</span>
      </div>
    );
  }

  // ---- Not enough trades ----
  if (!canRun) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: COLORS.textLight, letterSpacing: '-0.02em' }}>
              Monte Carlo Simulator
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: '13px', color: COLORS.text }}>
              Simulate sequence variations without mutating active session states.
            </p>
          </div>
          <AccountSelector accounts={state.accounts} value={simAccountId} onChange={setSimAccountId} />
        </div>

        <div style={{
          padding: '48px 24px',
          textAlign: 'center',
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(8px)',
          border: `1px dashed ${COLORS.panelBorder}`,
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '24px' }}>📊</span>
          <div style={{ fontSize: '14px', fontWeight: 600, color: COLORS.textLight }}>
            Insufficient Data for <span style={{ color: COLORS.amber }}>{simAccount?.name || 'Account'}</span>
          </div>
          <div style={{ fontSize: '13px', color: COLORS.text, maxWidth: '400px', lineHeight: 1.5 }}>
            A minimum of 5 trades is required to build a statistical distribution curve. Currently recorded: <b>{scores.length}</b>.
          </div>
        </div>
      </div>
    );
  }

  // ---- Full simulator ----
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: COLORS.textLight, letterSpacing: '-0.02em' }}>
              Monte Carlo Simulator
            </h1>
            {simAccount && (
              <span style={{
                padding: '3px 10px',
                borderRadius: '9999px',
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.05em',
                background: simAccount.type === 'Backtest' ? 'rgba(148, 163, 184, 0.1)' : 'rgba(53, 196, 161, 0.12)',
                color: simAccount.type === 'Backtest' ? COLORS.text : COLORS.win,
                border: `1px solid ${simAccount.type === 'Backtest' ? 'rgba(148, 163, 184, 0.2)' : 'rgba(53, 196, 161, 0.3)'}`,
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                {simAccount.type}
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '13px', color: COLORS.text }}>
            <span style={{ color: COLORS.textLight, fontWeight: 600 }}>{stats.n}</span> executions loaded · Model Mode: <span style={{ color: COLORS.textLight, fontWeight: 600 }}>{isMoney ? 'Net Cash P&L' : 'R-Multiple Shift'}</span>
          </p>
        </div>
        <AccountSelector accounts={state.accounts} value={simAccountId} onChange={setSimAccountId} />
      </div>

      {/* Controls */}
      <SimulatorControls
        method={method} setMethod={setMethod}
        runs={runs} setRuns={setRuns}
        ruinThreshold={ruinThreshold} setRuinThreshold={setRuinThreshold}
        isRunning={isRunning}
        onRun={run}
        onExport={handleExport}
        hasResult={!!result}
      />

      {/* Loading state */}
      {isRunning && !result && (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          color: COLORS.text,
          fontFamily: "'JetBrains Mono', 'IBM Plex Mono', monospace",
          fontSize: '13px',
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(8px)',
          border: `1px solid ${COLORS.panelBorder}`,
          borderRadius: '16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '28px',
            height: '28px',
            border: `2px solid ${COLORS.panelBorder}`,
            borderTopColor: COLORS.accent,
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite'
          }} />
          <span>Simulating {runs.toLocaleString()} reshuffled equity paths…</span>
        </div>
      )}

      {/* Panels */}
      {result && summary && (
        <SimulatorPanels
          result={result}
          summary={summary}
          isMoney={isMoney}
          actualCurve={actualCurve}
          tab={tab}
          setTab={setTab}
        />
      )}
    </div>
  );
}

// ---------- Shared account selector ----------

function AccountSelector({ accounts, value, onChange }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      background: 'rgba(15, 23, 42, 0.6)',
      padding: '6px 6px 6px 14px',
      borderRadius: '12px',
      border: `1px solid ${COLORS.panelBorder}`,
      backdropFilter: 'blur(8px)'
    }}>
      <span style={{
        fontSize: '11px',
        fontWeight: 700,
        color: COLORS.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.06em'
      }}>
        Context
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '8px 12px',
          background: '#090D16',
          border: `1px solid ${COLORS.panelBorder}`,
          borderRadius: '8px',
          color: COLORS.textLight,
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          outline: 'none',
          minWidth: '200px',
          transition: 'all 0.15s ease'
        }}
      >
        {accounts.map(acc => (
          <option key={acc.id} value={acc.id}>
            {acc.name} ({acc.type})
          </option>
        ))}
      </select>
    </div>
  );
}