// src/components/dashboard/monteCarlo/MonteCarloModal.jsx
import { useState, useMemo, useEffect, useCallback } from 'react';
import Portal from '../../common/Portal';
import { useStats } from '../../../hooks/useStats';
import { runMonteCarlo, summarizeMC } from '../../../utils/monteCarlo';
import FanChart from './charts/FanChart';                 // ← was ../charts/FanChart
import DistributionChart from './charts/DistributionChart'; // ← was ../charts/DistributionChart
import { FaTimes, FaPlay, FaRedo, FaDownload, FaInfoCircle } from 'react-icons/fa';

const COLORS = {
  amber: '#FFB020',
  win: '#35C4A1',
  loss: '#FF5C5C',
  blue: '#4C8BF5',
  text: '#8892A3',
  textMuted: '#545E6E',
  textLight: '#E7E9EE',
  grid: '#1A2029',
  panel: '#11151F',
  border: '#212836',
};

const PRESETS = {
  quick:    { runs: 200,  label: 'Quick' },
  standard: { runs: 1000, label: 'Standard' },
  deep:     { runs: 2000, label: 'Deep' },
};

const TABS = [
  { id: 'overview',  label: 'Overview' },
  { id: 'bands',     label: 'Bands' },
  { id: 'drawdown',  label: 'Drawdown' },
  { id: 'ratios',    label: 'Ratios' },
  { id: 'streaks',   label: 'Streaks' },
  { id: 'targets',   label: 'Targets' },
];

const formatValue = (v, isMoney) => {
  if (v == null || Number.isNaN(v)) return '—';
  if (isMoney) return `${v < 0 ? '-' : '+'}$${Math.abs(v).toFixed(2)}`;
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`;
};

const formatRatio = (v) => {
  if (v == null || Number.isNaN(v) || !isFinite(v)) return '—';
  return v.toFixed(2);
};

const formatPct = (v) => (v == null || Number.isNaN(v)) ? '—' : `${v.toFixed(1)}%`;

// ---------------- Sub-components ----------------

function SummaryKPIs({ summary, result, isMoney }) {
  if (!summary) return null;
  const items = [
    { label: 'P(Profit)', value: formatPct(summary.profitPct), cls: summary.profitPct >= 50 ? 'pos' : 'neg', sub: `${result.profitCount}/${result.runs} runs` },
    { label: 'Risk of Ruin', value: formatPct(summary.ruinPct), cls: summary.ruinPct > 0 ? 'neg' : 'pos', sub: result.ruinThreshold !== null ? `hits ${formatValue(result.ruinThreshold, isMoney)}` : 'no threshold' },
    { label: 'Median Final', value: formatValue(summary.medianFinal, isMoney), cls: summary.medianFinal >= 0 ? 'pos' : 'neg', sub: '50th percentile' },
    { label: '5th %ile Final', value: formatValue(summary.p5Final, isMoney), cls: summary.p5Final >= 0 ? 'pos' : 'neg', sub: 'worst 5% cutoff' },
    { label: '95th %ile Final', value: formatValue(summary.p95Final, isMoney), cls: 'pos', sub: 'best 5% cutoff' },
  ];
  const color = (c) => c === 'pos' ? COLORS.win : c === 'neg' ? COLORS.loss : COLORS.textLight;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
      {items.map(it => (
        <div key={it.label} style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '12px 14px' }}>
          <div style={{ fontSize: '10.5px', fontWeight: 600, color: COLORS.text, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{it.label}</div>
          <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '6px', color: color(it.cls), fontFamily: "'IBM Plex Mono', monospace" }}>{it.value}</div>
          <div style={{ fontSize: '10.5px', color: COLORS.textMuted, marginTop: '2px' }}>{it.sub}</div>
        </div>
      ))}
    </div>
  );
}

function PercentileTable({ summary, isMoney }) {
  if (!summary) return null;
  const rows = [
    { metric: 'Final Equity', values: [summary.p5Final, summary.p25Final, summary.medianFinal, summary.p75Final, summary.p95Final], fmt: (v) => formatValue(v, isMoney) },
    { metric: 'Max Drawdown', values: [summary.maxDD_p5, summary.maxDD_p25, summary.maxDD_p50, summary.maxDD_p75, summary.maxDD_p95], fmt: (v) => formatValue(v, isMoney) },
    { metric: 'Sharpe', values: [summary.sharpe_p5, (summary.sharpe_p5 + summary.sharpe_p95) / 2, summary.sharpe_p50, (summary.sharpe_p50 + summary.sharpe_p95) / 2, summary.sharpe_p95], fmt: (v) => formatRatio(v) },
    { metric: 'Sortino (median)', values: [null, null, summary.sortino_p50, null, null], fmt: (v) => formatRatio(v) },
    { metric: 'Profit Factor (median)', values: [null, null, summary.pf_p50, null, null], fmt: (v) => formatRatio(v) },
    { metric: 'Expectancy (median)', values: [null, null, summary.exp_p50, null, null], fmt: (v) => formatValue(v, isMoney) },
    { metric: 'Win Rate (median)', values: [null, null, summary.win_p50, null, null], fmt: (v) => formatPct(v) },
  ];
  return (
    <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '10px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: "'Inter', sans-serif" }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
            {['Metric', '5th %ile', '25th %ile', 'Median', '75th %ile', '95th %ile'].map((h, i) => (
              <th key={h} style={{ padding: '9px 12px', textAlign: i === 0 ? 'left' : 'right', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: COLORS.text, borderBottom: `1px solid ${COLORS.border}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.metric} style={{ borderBottom: `1px solid rgba(255,255,255,0.03)` }}>
              <td style={{ padding: '8px 12px', fontWeight: 600, color: COLORS.textLight }}>{r.metric}</td>
              {r.values.map((v, i) => (
                <td key={i} style={{ padding: '8px 12px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: v == null ? COLORS.textMuted : COLORS.textLight }}>
                  {v == null ? '—' : r.fmt(v)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InterpretationPanel({ result, summary, isMoney }) {
  if (!summary || !result) return null;

  const isPerm = result.method === 'permutation';
  const worstDD = summary.maxDD_p5;
  const bestCase = summary.p95Final;
  const worstCase = summary.p5Final;
  const profitPct = summary.profitPct;

  const verdict =
    profitPct >= 90 ? 'Edge looks robust' :
    profitPct >= 70 ? 'Edge present with normal variance' :
    profitPct >= 50 ? 'Edge is fragile — sample-dependent' :
    'No reliable edge detected';

  const verdictColor =
    profitPct >= 90 ? COLORS.win :
    profitPct >= 70 ? COLORS.amber :
    COLORS.loss;

  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: '10px', padding: '16px 18px', fontSize: '12px', lineHeight: '1.7', color: COLORS.text }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <FaInfoCircle style={{ color: COLORS.amber }} />
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: COLORS.textLight }}>
          What this tells you
        </span>
        <span style={{ marginLeft: 'auto', fontSize: '11px', fontWeight: 700, color: verdictColor }}>{verdict}</span>
      </div>

      <p style={{ margin: '0 0 10px' }}>
        <b style={{ color: COLORS.textLight }}>Method — {isPerm ? 'Permutation' : 'Bootstrap'}.</b>{' '}
        {isPerm
          ? 'Every run reshuffles your exact same trades in a different order. Answers: "How much does sequence-of-trades affect my outcome?" — it isolates order risk.'
          : 'Every run samples with replacement from your trade distribution. Answers: "If I re-ran this strategy with a different sample from the same underlying edge, what range of outcomes would I see?" — it isolates sample-size uncertainty.'}
      </p>

      <ul style={{ margin: 0, paddingLeft: '18px' }}>
        <li>
          <b style={{ color: COLORS.textLight }}>{profitPct.toFixed(0)}%</b> of runs ended profitable. The median outcome was <b style={{ color: COLORS.textLight }}>{formatValue(summary.medianFinal, isMoney)}</b>.
        </li>
        <li>
          Best 5% of runs reached <b style={{ color: COLORS.win }}>{formatValue(bestCase, isMoney)}</b>; worst 5% ended at <b style={{ color: COLORS.loss }}>{formatValue(worstCase, isMoney)}</b>.
        </li>
        <li>
          In the worst 5% of runs you would have suffered a drawdown of at least <b style={{ color: COLORS.loss }}>{formatValue(worstDD, isMoney)}</b>. Plan your risk budget around that, not around your realized max DD.
        </li>
        {summary.ruinPct > 0 && (
          <li>
            <b style={{ color: COLORS.loss }}>{summary.ruinPct.toFixed(1)}%</b> of runs would have breached your ruin threshold of {formatValue(result.ruinThreshold, isMoney)}.
          </li>
        )}
        <li>
          Longest losing streak you should expect (95th pct): <b style={{ color: COLORS.textLight }}>{summary.lossStreak_p95} trades</b> in a row.
        </li>
      </ul>
    </div>
  );
}

// ---------------- Main modal ----------------

export default function MonteCarloModal({ isOpen, onClose }) {
  const { stats, metric } = useStats();
  const isMoney = metric === '$';

  const [method, setMethod] = useState('permutation');
  const [runs, setRuns] = useState(1000);
  const [ruinThreshold, setRuinThreshold] = useState(isMoney ? -1000 : -10);
  const [result, setResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [tab, setTab] = useState('overview');
  const [showActual, setShowActual] = useState(true);

  // Update ruinThreshold default when metric changes
  useEffect(() => {
    setRuinThreshold(isMoney ? -1000 : -10);
  }, [isMoney]);

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
        console.error('[MonteCarlo] error:', err);
        setResult(null);
      } finally {
        setIsRunning(false);
      }
    }, 20);
  }, [scores, method, runs, ruinThreshold, targets]);

  // Auto-run on open
  useEffect(() => {
    if (isOpen && scores.length >= 5 && !result && !isRunning) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Reset when modal closed
  useEffect(() => {
    if (!isOpen) { setResult(null); setTab('overview'); setShowActual(true); }
  }, [isOpen]);

  // Re-run when method or runs change (and result already exists)
  useEffect(() => {
    if (isOpen && result && (result.method !== method || result.runs !== runs)) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, runs]);

  const summary = useMemo(() => summarizeMC(result), [result]);

  const handleExport = () => {
    if (!result || !summary) return;
    const rows = [
      ['Monte Carlo Export'],
      ['Method', result.method],
      ['Runs', result.runs],
      ['Trades', result.n],
      ['Ruin Threshold', result.ruinThreshold ?? 'none'],
      [],
      ['Metric', '5th %ile', '25th %ile', 'Median', '75th %ile', '95th %ile'],
      ['Final Equity', summary.p5Final, summary.p25Final, summary.medianFinal, summary.p75Final, summary.p95Final],
      ['Max Drawdown', summary.maxDD_p5, summary.maxDD_p25, summary.maxDD_p50, summary.maxDD_p75, summary.maxDD_p95],
      ['Sharpe', summary.sharpe_p5, '', summary.sharpe_p50, '', summary.sharpe_p95],
      ['Sortino', '', '', summary.sortino_p50, '', ''],
      ['Profit Factor', '', '', summary.pf_p50, '', ''],
      ['Expectancy', '', '', summary.exp_p50, '', ''],
      ['Win Rate (%)', '', '', summary.win_p50, '', ''],
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

  if (!isOpen) return null;

  const canRun = scores.length >= 5;

  return (
    <Portal>
      <div
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(5, 7, 10, 0.85)', backdropFilter: 'blur(6px)', padding: '16px',
        }}
      >
        <div
          style={{
            width: '100%', maxWidth: '1200px', maxHeight: '94vh',
            display: 'flex', flexDirection: 'column',
            background: '#0D1117', border: '1px solid #212836', borderRadius: '16px',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.7)', color: '#E7E9EE',
            fontFamily: "'Inter', sans-serif", overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ padding: '16px 22px', borderBottom: '1px solid #1A2029', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: '17px', fontWeight: 600, color: '#FFF' }}>
                Monte Carlo Simulation
              </h2>
              <p style={{ margin: '3px 0 0', fontSize: '11.5px', color: COLORS.text }}>
                {scores.length > 0 && `${scores.length} trades · `}Reshuffles order {runs.toLocaleString()} times
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Preset */}
              <select
                value={Object.keys(PRESETS).find(k => PRESETS[k].runs === runs) || ''}
                onChange={(e) => { const p = PRESETS[e.target.value]; if (p) setRuns(p.runs); }}
                disabled={isRunning}
                style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.textLight, fontSize: '11.5px', fontFamily: "'IBM Plex Mono', monospace", padding: '5px 8px', outline: 'none', cursor: isRunning ? 'not-allowed' : 'pointer' }}
              >
                <option value="">Custom</option>
                {Object.entries(PRESETS).map(([k, p]) => (
                  <option key={k} value={k}>{p.label} · {p.runs}</option>
                ))}
              </select>

              {/* Runs */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: COLORS.text }}>
                Runs
                <input
                  type="number" value={runs} min={50} max={5000} step={50}
                  onChange={(e) => setRuns(Math.max(50, Math.min(5000, Number(e.target.value) || 1000)))}
                  disabled={isRunning}
                  style={{ width: '70px', background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.textLight, fontSize: '11.5px', fontFamily: "'IBM Plex Mono', monospace", padding: '5px 8px', outline: 'none', textAlign: 'center' }}
                />
              </label>

              {/* Method */}
              <div style={{ display: 'flex', background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: '6px', padding: '2px' }}>
                {['permutation', 'bootstrap'].map(m => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    disabled={isRunning}
                    style={{
                      padding: '4px 12px', fontSize: '11px', fontWeight: 600,
                      background: method === m ? COLORS.amber : 'transparent',
                      color: method === m ? '#0D1117' : COLORS.text,
                      border: 'none', borderRadius: '4px',
                      cursor: isRunning ? 'not-allowed' : 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >{m}</button>
                ))}
              </div>

              {/* Ruin threshold */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: COLORS.text }}>
                Ruin
                <input
                  type="number" value={ruinThreshold}
                  onChange={(e) => setRuinThreshold(Number(e.target.value))}
                  disabled={isRunning}
                  style={{ width: '80px', background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.textLight, fontSize: '11.5px', fontFamily: "'IBM Plex Mono', monospace", padding: '5px 8px', outline: 'none', textAlign: 'right' }}
                />
              </label>

              {/* Export */}
              <button
                onClick={handleExport}
                disabled={!result}
                title="Export CSV"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  padding: '6px 10px', background: 'transparent',
                  border: `1px solid ${COLORS.border}`, borderRadius: '6px',
                  color: result ? COLORS.textLight : COLORS.textMuted,
                  fontSize: '11px', cursor: result ? 'pointer' : 'not-allowed',
                }}
              ><FaDownload size={10} /> CSV</button>

              {/* Re-run / Run */}
              <button
                onClick={run}
                disabled={!canRun || isRunning}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px',
                  background: canRun && !isRunning ? COLORS.amber : 'rgba(255,176,32,0.3)',
                  color: canRun && !isRunning ? '#0D1117' : 'rgba(10,13,19,0.5)',
                  border: 'none', borderRadius: '8px',
                  fontSize: '12px', fontWeight: 700,
                  cursor: canRun && !isRunning ? 'pointer' : 'not-allowed',
                }}
              >
                {result ? <FaRedo size={10} /> : <FaPlay size={10} />}
                {isRunning ? 'Simulating…' : result ? 'Re-run' : 'Run'}
              </button>

              <button
                onClick={onClose}
                style={{ background: 'transparent', border: 'none', color: COLORS.text, cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#E7E9EE')}
                onMouseLeave={(e) => (e.currentTarget.style.color = COLORS.text)}
              ><FaTimes size={16} /></button>
            </div>
          </div>

          {/* Tabs */}
          {result && (
            <div style={{ padding: '10px 22px 0', display: 'flex', gap: '4px', borderBottom: '1px solid #1A2029', overflowX: 'auto' }}>
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    padding: '8px 14px', fontSize: '12px', fontWeight: 600,
                    color: tab === t.id ? COLORS.amber : COLORS.text,
                    background: 'transparent', border: 'none',
                    borderBottom: `2px solid ${tab === t.id ? COLORS.amber : 'transparent'}`,
                    cursor: 'pointer', whiteSpace: 'nowrap',
                  }}
                >{t.label}</button>
              ))}
            </div>
          )}

          {/* Body */}
          <div style={{ padding: '18px 22px', overflowY: 'auto', flex: 1 }}>
            {!canRun && (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px' }}>
                Need at least 5 trades to run a simulation.
              </div>
            )}

            {canRun && !result && isRunning && (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: COLORS.text, fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px' }}>
                Simulating {runs.toLocaleString()} reshuffled equity curves…
              </div>
            )}

            {result && (
              <>
                {/* OVERVIEW */}
                {tab === 'overview' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <SummaryKPIs summary={summary} result={result} isMoney={isMoney} />
                    <InterpretationPanel result={result} summary={summary} isMoney={isMoney} />
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: COLORS.text, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Percentile Table</div>
                      <PercentileTable summary={summary} isMoney={isMoney} />
                    </div>
                  </div>
                )}

                {/* BANDS */}
                {tab === 'bands' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: COLORS.text, cursor: 'pointer' }}>
                        <input type="checkbox" checked={showActual} onChange={(e) => setShowActual(e.target.checked)} />
                        Show actual path
                      </label>
                    </div>
                    <div style={{ height: '480px' }}>
                      <FanChart result={result} actualCurve={actualCurve} isMoney={isMoney} showActual={showActual} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '22px', marginTop: '12px', fontSize: '10.5px', color: COLORS.text, fontFamily: "'IBM Plex Mono', monospace", flexWrap: 'wrap' }}>
                      <span><span style={{ display: 'inline-block', width: '12px', height: '2px', background: COLORS.amber, verticalAlign: 'middle', marginRight: '6px' }} />Median path</span>
                      <span><span style={{ display: 'inline-block', width: '12px', height: '8px', background: 'rgba(255,176,32,0.18)', verticalAlign: 'middle', marginRight: '6px' }} />25–75% band</span>
                      <span><span style={{ display: 'inline-block', width: '12px', height: '8px', background: 'rgba(255,176,32,0.08)', verticalAlign: 'middle', marginRight: '6px' }} />5–95% band</span>
                      {showActual && <span><span style={{ display: 'inline-block', width: '12px', height: '2px', background: COLORS.blue, verticalAlign: 'middle', marginRight: '6px' }} />Your actual path</span>}
                    </div>
                  </>
                )}

                {/* DRAWDOWN */}
                {tab === 'drawdown' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: COLORS.text, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Max Drawdown Distribution</div>
                      <DistributionChart values={result.maxDDs} color={COLORS.loss} tooltipSuffix="" />
                      <p style={{ margin: '8px 0 0', fontSize: '10.5px', color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
                        Worst expected DD (95th pct): <b style={{ color: COLORS.loss }}>{formatValue(summary.maxDD_p5, isMoney)}</b>
                      </p>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: COLORS.text, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Recovery Time (Trades)</div>
                      <DistributionChart
                        values={result.recoveryTrades.filter(v => v >= 0)}
                        color={COLORS.amber}
                        tooltipSuffix="to recover"
                      />
                      <p style={{ margin: '8px 0 0', fontSize: '10.5px', color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
                        {(() => {
                          const never = result.recoveryTrades.filter(v => v < 0).length;
                          const pct = ((never / result.runs) * 100).toFixed(1);
                          return `${pct}% of runs never fully recovered from their worst DD`;
                        })()}
                      </p>
                    </div>
                  </div>
                )}

                {/* RATIOS */}
                {tab === 'ratios' && (
                  <>
                    {result.method === 'permutation' ? (
                      <div style={{ padding: '40px 20px', textAlign: 'center', color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px' }}>
                        Ratio distributions are only meaningful in Bootstrap mode.<br />
                        <span style={{ fontSize: '11px', opacity: 0.8 }}>Permutation reshuffles the same trades, so Sharpe / Sortino / PF are identical across runs.</span>
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                        {[
                          { title: 'Sharpe Ratio', values: result.sharpes, color: COLORS.amber },
                          { title: 'Sortino Ratio', values: result.sortinos, color: COLORS.amber },
                          { title: 'Profit Factor', values: result.profitFactors.filter(v => v < 9000), color: COLORS.win },
                          { title: 'Expectancy', values: result.expectancies, color: COLORS.win },
                          { title: 'Win Rate (%)', values: result.winRates.map(v => v * 100), color: COLORS.amber },
                        ].map(c => (
                          <div key={c.title}>
                            <div style={{ fontSize: '11px', fontWeight: 700, color: COLORS.text, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{c.title}</div>
                            <DistributionChart values={c.values} color={c.color} />
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* STREAKS */}
                {tab === 'streaks' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: COLORS.text, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Longest Win Streak</div>
                      <DistributionChart values={result.longestWins} color={COLORS.win} />
                      <p style={{ margin: '8px 0 0', fontSize: '10.5px', color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
                        95th pct: <b style={{ color: COLORS.win }}>{summary.winStreak_p95} consecutive wins</b>
                      </p>
                    </div>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: COLORS.text, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Longest Loss Streak</div>
                      <DistributionChart values={result.longestLosses} color={COLORS.loss} />
                      <p style={{ margin: '8px 0 0', fontSize: '10.5px', color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
                        95th pct: <b style={{ color: COLORS.loss }}>{summary.lossStreak_p95} consecutive losses</b>
                      </p>
                    </div>
                  </div>
                )}

                {/* TARGETS */}
                {tab === 'targets' && (
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: COLORS.text, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>Time to reach target {isMoney ? '($)' : '(R)'}</div>
                    <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '10px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', fontFamily: "'Inter', sans-serif" }}>
                        <thead>
                          <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                            {['Target', 'Success %', '25th %ile Trades', 'Median Trades', '75th %ile Trades'].map((h, i) => (
                              <th key={h} style={{ padding: '10px 12px', textAlign: i === 0 ? 'left' : 'right', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: COLORS.text, borderBottom: `1px solid ${COLORS.border}` }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.timeToTarget.map(t => (
                            <tr key={t.target} style={{ borderBottom: `1px solid rgba(255,255,255,0.03)` }}>
                              <td style={{ padding: '10px 12px', fontWeight: 700, color: COLORS.textLight, fontFamily: "'IBM Plex Mono', monospace" }}>{formatValue(t.target, isMoney)}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: t.successPct >= 50 ? COLORS.win : COLORS.loss }}>{t.successPct.toFixed(1)}%</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: COLORS.textLight }}>{t.p25Trades ?? '—'}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: COLORS.amber, fontWeight: 700 }}>{t.medianTrades ?? '—'}</td>
                              <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: COLORS.textLight }}>{t.p75Trades ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p style={{ margin: '10px 0 0', fontSize: '10.5px', color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
                      Median trades = the midpoint of all runs that reached the target. Success % shows how many runs hit it at all.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}