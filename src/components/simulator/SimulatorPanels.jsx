// src/components/simulator/SimulatorPanels.jsx
import { FaInfoCircle } from 'react-icons/fa';
import FanChart from '../dashboard/monteCarlo/charts/FanChart';
import DistributionChart from '../dashboard/monteCarlo/charts/DistributionChart';

const COLORS = {
  amber: '#FFB020',
  win: '#35C4A1',
  loss: '#FF5C5C',
  blue: '#4C8BF5',
  text: '#8892A3',
  textMuted: '#545E6E',
  textLight: '#E7E9EE',
  border: '#212836',
  panel: '#11151F',
  rowBorder: 'rgba(255,255,255,0.04)',
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

const formatRatio = (v) => (v == null || Number.isNaN(v) || !isFinite(v)) ? '—' : v.toFixed(2);
const formatPct = (v) => (v == null || Number.isNaN(v)) ? '—' : `${v.toFixed(1)}%`;

// ---------- Shared shell ----------

function Panel({ title, note, children, style }) {
  return (
    <div style={{
      background: COLORS.panel,
      border: `1px solid ${COLORS.border}`,
      borderRadius: '12px',
      padding: '16px 18px',
      ...style,
    }}>
      {(title || note) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: `1px solid ${COLORS.rowBorder}` }}>
          {title && <span style={{ fontSize: '12px', fontWeight: 700, color: COLORS.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>}
          {note && <span style={{ fontSize: '10.5px', color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>{note}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

function KPI({ label, value, sub, cls }) {
  const color = cls === 'pos' ? COLORS.win : cls === 'neg' ? COLORS.loss : cls === 'amber' ? COLORS.amber : COLORS.textLight;
  return (
    <div style={{ background: COLORS.panel, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '14px 16px' }}>
      <div style={{ fontSize: '10.5px', fontWeight: 700, color: COLORS.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '8px', color, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: '10.5px', color: COLORS.textMuted, marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

// ---------- Panels ----------

function OverviewPanel({ result, summary, isMoney }) {
  const isPerm = result.method === 'permutation';
  const profitPct = summary.profitPct;
  const verdict =
    profitPct >= 90 ? 'Edge looks robust' :
    profitPct >= 70 ? 'Edge present with normal variance' :
    profitPct >= 50 ? 'Edge is fragile — sample-dependent' :
    'No reliable edge detected';
  const verdictColor =
    profitPct >= 90 ? COLORS.win :
    profitPct >= 70 ? COLORS.amber : COLORS.loss;

  const rows = [
    { metric: 'Final Equity', values: [summary.p5Final, summary.p25Final, summary.medianFinal, summary.p75Final, summary.p95Final], fmt: (v) => formatValue(v, isMoney) },
    { metric: 'Max Drawdown', values: [summary.maxDD_p5, summary.maxDD_p25, summary.maxDD_p50, summary.maxDD_p75, summary.maxDD_p95], fmt: (v) => formatValue(v, isMoney) },
    { metric: 'Sharpe', values: [summary.sharpe_p5, '', summary.sharpe_p50, '', summary.sharpe_p95], fmt: (v) => formatRatio(v) },
    { metric: 'Sortino (median)', values: ['', '', summary.sortino_p50, '', ''], fmt: (v) => formatRatio(v) },
    { metric: 'Profit Factor (median)', values: ['', '', summary.pf_p50, '', ''], fmt: (v) => formatRatio(v) },
    { metric: 'Expectancy (median)', values: ['', '', summary.exp_p50, '', ''], fmt: (v) => formatValue(v, isMoney) },
    { metric: 'Win Rate (median)', values: ['', '', summary.win_p50, '', ''], fmt: (v) => formatPct(v) },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '12px' }}>
        <KPI label="P(Profit)" value={formatPct(profitPct)} sub={`${result.profitCount}/${result.runs} runs`} cls={profitPct >= 50 ? 'pos' : 'neg'} />
        <KPI label="Risk of Ruin" value={formatPct(summary.ruinPct)} sub={result.ruinThreshold !== null ? `hits ${formatValue(result.ruinThreshold, isMoney)}` : 'no threshold'} cls={summary.ruinPct > 0 ? 'neg' : 'pos'} />
        <KPI label="Median Final" value={formatValue(summary.medianFinal, isMoney)} sub="50th percentile" cls={summary.medianFinal >= 0 ? 'pos' : 'neg'} />
        <KPI label="5th %ile Final" value={formatValue(summary.p5Final, isMoney)} sub="worst 5% cutoff" cls={summary.p5Final >= 0 ? 'pos' : 'neg'} />
        <KPI label="95th %ile Final" value={formatValue(summary.p95Final, isMoney)} sub="best 5% cutoff" cls="pos" />
      </div>

      {/* Interpretation */}
      <Panel>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <FaInfoCircle style={{ color: COLORS.amber }} />
          <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: COLORS.textLight }}>What this tells you</span>
          <span style={{ marginLeft: 'auto', fontSize: '11.5px', fontWeight: 700, color: verdictColor }}>{verdict}</span>
        </div>

        <p style={{ margin: '0 0 12px', fontSize: '13px', lineHeight: 1.7, color: COLORS.text }}>
          <b style={{ color: COLORS.textLight }}>Method — {isPerm ? 'Permutation' : 'Bootstrap'}.</b>{' '}
          {isPerm
            ? 'Every run reshuffles your exact same trades in a different order. Answers: "How much does sequence-of-trades affect my outcome?" — it isolates order risk.'
            : 'Every run samples with replacement from your trade distribution. Answers: "If I re-ran this strategy with a different sample from the same underlying edge, what range of outcomes would I see?" — it isolates sample-size uncertainty.'}
        </p>

        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: 1.9, color: COLORS.text }}>
          <li><b style={{ color: COLORS.textLight }}>{profitPct.toFixed(0)}%</b> of runs ended profitable. Median outcome: <b style={{ color: COLORS.textLight }}>{formatValue(summary.medianFinal, isMoney)}</b>.</li>
          <li>Best 5% reached <b style={{ color: COLORS.win }}>{formatValue(summary.p95Final, isMoney)}</b>; worst 5% ended at <b style={{ color: COLORS.loss }}>{formatValue(summary.p5Final, isMoney)}</b>.</li>
          <li>In the worst 5% of runs you would have suffered a drawdown of at least <b style={{ color: COLORS.loss }}>{formatValue(summary.maxDD_p5, isMoney)}</b>.</li>
          {summary.ruinPct > 0 && (<li><b style={{ color: COLORS.loss }}>{summary.ruinPct.toFixed(1)}%</b> of runs breached the ruin threshold of {formatValue(result.ruinThreshold, isMoney)}.</li>)}
          <li>Longest losing streak to expect (95th pct): <b style={{ color: COLORS.textLight }}>{summary.lossStreak_p95} trades</b> in a row.</li>
        </ul>
      </Panel>

      {/* Percentile Table */}
      <Panel title="Percentile Table" note="Distribution across all runs">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', fontFamily: "'Inter', sans-serif" }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                {['Metric', '5th %ile', '25th %ile', 'Median', '75th %ile', '95th %ile'].map((h, i) => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: i === 0 ? 'left' : 'right', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: COLORS.text, borderBottom: `1px solid ${COLORS.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.metric} style={{ borderBottom: `1px solid ${COLORS.rowBorder}` }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: COLORS.textLight }}>{r.metric}</td>
                  {r.values.map((v, i) => (
                    <td key={i} style={{ padding: '10px 12px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: v === '' ? COLORS.textMuted : COLORS.textLight }}>
                      {v === '' ? '—' : r.fmt(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function BandsPanel({ result, actualCurve, isMoney }) {
  return (
    <Panel title="Cumulative Equity Bands" note={`${result.runs.toLocaleString()} simulated paths`}>
      <div style={{ height: '520px' }}>
        <FanChart result={result} actualCurve={actualCurve} isMoney={isMoney} showActual />
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px', fontSize: '11px', color: COLORS.text, fontFamily: "'IBM Plex Mono', monospace", flexWrap: 'wrap' }}>
        <span><span style={{ display: 'inline-block', width: '14px', height: '2px', background: COLORS.amber, verticalAlign: 'middle', marginRight: '6px' }} />Median path</span>
        <span><span style={{ display: 'inline-block', width: '14px', height: '8px', background: 'rgba(255,176,32,0.18)', verticalAlign: 'middle', marginRight: '6px' }} />25–75% band</span>
        <span><span style={{ display: 'inline-block', width: '14px', height: '8px', background: 'rgba(255,176,32,0.08)', verticalAlign: 'middle', marginRight: '6px' }} />5–95% band</span>
        <span><span style={{ display: 'inline-block', width: '14px', height: '2px', background: COLORS.blue, verticalAlign: 'middle', marginRight: '6px' }} />Your actual path</span>
      </div>
    </Panel>
  );
}

function DrawdownPanel({ result, summary, isMoney }) {
  const neverRecovered = result.recoveryTrades.filter(v => v < 0).length;
  const neverPct = ((neverRecovered / result.runs) * 100).toFixed(1);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
      <Panel title="Max Drawdown Distribution" note="Worst DD per run">
        <DistributionChart values={result.maxDDs} color={COLORS.loss} height={320} />
        <p style={{ margin: '12px 0 0', fontSize: '11.5px', color: COLORS.text, fontFamily: "'IBM Plex Mono', monospace" }}>
          Worst expected DD (95th pct): <b style={{ color: COLORS.loss }}>{formatValue(summary.maxDD_p5, isMoney)}</b>
        </p>
      </Panel>

      <Panel title="Recovery Time" note="Trades to fully recover">
        <DistributionChart values={result.recoveryTrades.filter(v => v >= 0)} color={COLORS.amber} height={320} tooltipSuffix="to recover" />
        <p style={{ margin: '12px 0 0', fontSize: '11.5px', color: COLORS.text, fontFamily: "'IBM Plex Mono', monospace" }}>
          {neverPct}% of runs never fully recovered from their worst DD
        </p>
      </Panel>
    </div>
  );
}

function RatiosPanel({ result }) {
  if (result.method === 'permutation') {
    return (
      <Panel>
        <div style={{ padding: '60px 20px', textAlign: 'center', color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace", fontSize: '12.5px', lineHeight: 1.8 }}>
          Ratio distributions are only meaningful in <b style={{ color: COLORS.amber }}>Bootstrap</b> mode.<br />
          <span style={{ fontSize: '11px', opacity: 0.85 }}>Permutation reshuffles the same trades, so Sharpe / Sortino / PF are identical across runs.</span>
        </div>
      </Panel>
    );
  }

  const items = [
    { title: 'Sharpe Ratio', values: result.sharpes, color: COLORS.amber },
    { title: 'Sortino Ratio', values: result.sortinos, color: COLORS.amber },
    { title: 'Profit Factor', values: result.profitFactors.filter(v => v < 9000), color: COLORS.win },
    { title: 'Expectancy', values: result.expectancies, color: COLORS.win },
    { title: 'Win Rate (%)', values: result.winRates.map(v => v * 100), color: COLORS.amber },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
      {items.map(c => (
        <Panel key={c.title} title={c.title}>
          <DistributionChart values={c.values} color={c.color} height={240} />
        </Panel>
      ))}
    </div>
  );
}

function StreaksPanel({ result, summary }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
      <Panel title="Longest Win Streak">
        <DistributionChart values={result.longestWins} color={COLORS.win} height={320} />
        <p style={{ margin: '12px 0 0', fontSize: '11.5px', color: COLORS.text, fontFamily: "'IBM Plex Mono', monospace" }}>
          95th pct: <b style={{ color: COLORS.win }}>{summary.winStreak_p95} consecutive wins</b>
        </p>
      </Panel>

      <Panel title="Longest Loss Streak">
        <DistributionChart values={result.longestLosses} color={COLORS.loss} height={320} />
        <p style={{ margin: '12px 0 0', fontSize: '11.5px', color: COLORS.text, fontFamily: "'IBM Plex Mono', monospace" }}>
          95th pct: <b style={{ color: COLORS.loss }}>{summary.lossStreak_p95} consecutive losses</b>
        </p>
      </Panel>
    </div>
  );
}

function TargetsPanel({ result, isMoney }) {
  return (
    <Panel title={`Time to Reach Target`} note={isMoney ? 'in dollars' : 'in R-multiples'}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', fontFamily: "'Inter', sans-serif" }}>
          <thead>
            <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
              {['Target', 'Success %', '25th %ile Trades', 'Median Trades', '75th %ile Trades'].map((h, i) => (
                <th key={h} style={{ padding: '10px 14px', textAlign: i === 0 ? 'left' : 'right', fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: COLORS.text, borderBottom: `1px solid ${COLORS.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.timeToTarget.map(t => (
              <tr key={t.target} style={{ borderBottom: `1px solid ${COLORS.rowBorder}` }}>
                <td style={{ padding: '12px 14px', fontWeight: 700, color: COLORS.textLight, fontFamily: "'IBM Plex Mono', monospace" }}>{formatValue(t.target, isMoney)}</td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: t.successPct >= 50 ? COLORS.win : COLORS.loss, fontWeight: 600 }}>{t.successPct.toFixed(1)}%</td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: COLORS.textLight }}>{t.p25Trades ?? '—'}</td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: COLORS.amber, fontWeight: 700 }}>{t.medianTrades ?? '—'}</td>
                <td style={{ padding: '12px 14px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", color: COLORS.textLight }}>{t.p75Trades ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ margin: '14px 0 0', fontSize: '11px', color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace" }}>
        Median trades = midpoint of all runs that reached the target. Success % shows how many runs hit it at all.
      </p>
    </Panel>
  );
}

// ---------- Main ----------

export default function SimulatorPanels({ result, summary, isMoney, actualCurve, tab, setTab }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '2px', borderBottom: `1px solid ${COLORS.border}`, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 16px', fontSize: '12.5px', fontWeight: 600,
              color: tab === t.id ? COLORS.amber : COLORS.text,
              background: 'transparent', border: 'none',
              borderBottom: `2px solid ${tab === t.id ? COLORS.amber : 'transparent'}`,
              cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'color 0.15s ease',
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* Active panel */}
      {tab === 'overview' && <OverviewPanel result={result} summary={summary} isMoney={isMoney} />}
      {tab === 'bands'    && <BandsPanel result={result} actualCurve={actualCurve} isMoney={isMoney} />}
      {tab === 'drawdown' && <DrawdownPanel result={result} summary={summary} isMoney={isMoney} />}
      {tab === 'ratios'   && <RatiosPanel result={result} />}
      {tab === 'streaks'  && <StreaksPanel result={result} summary={summary} />}
      {tab === 'targets'  && <TargetsPanel result={result} isMoney={isMoney} />}
    </div>
  );
}