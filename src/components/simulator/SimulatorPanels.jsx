// src/components/simulator/SimulatorPanels.jsx
import {
  FaInfoCircle,
  FaCheckCircle,
  FaExclamationTriangle,
  FaShieldAlt,
  FaBalanceScale,
  FaArrowDown,
  FaArrowUp,
  FaPercent,
  FaDice,
  FaLayerGroup,
  FaRandom,
} from 'react-icons/fa';
import FanChart from '../dashboard/monteCarlo/charts/FanChart';
import DistributionChart from '../dashboard/monteCarlo/charts/DistributionChart';

const TABS = [
  { id: 'overview',  label: 'Overview' },
  { id: 'bands',     label: 'Bands' },
  { id: 'drawdown',  label: 'Drawdown' },
  { id: 'ratios',    label: 'Ratios' },
  { id: 'streaks',   label: 'Streaks' },
  { id: 'targets',   label: 'Targets' },
];

/* Format helpers — unit-aware */
const fmtValue = (v, isMoney) => {
  if (v == null || Number.isNaN(v)) return '—';
  if (isMoney) return `${v < 0 ? '-' : '+'}$${Math.abs(v).toFixed(2)}`;
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`;
};
const fmtRatio = (v) => (v == null || Number.isNaN(v) || !isFinite(v)) ? '—' : v.toFixed(2);
const fmtPct = (v) => (v == null || Number.isNaN(v)) ? '—' : `${v.toFixed(1)}%`;
const fmtTrades = (v) => (v == null || Number.isNaN(v)) ? '—' : `${Math.round(v)}`;

const METHOD_META = {
  permutation: {
    label: 'Permutation',
    icon: <FaRandom />,
    tagline: 'Sequence risk · same trades, different order',
    description: 'Reshuffles your exact same trades into different chronological orders. The total is invariant — only the shape of the path changes. Answers: "how much can sequencing hurt me?" P(Profit) is always 0% or 100% here.',
    profitMetricMeaningful: false,
  },
  bootstrap: {
    label: 'Bootstrap',
    icon: <FaDice />,
    tagline: 'Sample uncertainty · sampling with replacement',
    description: 'Each run samples N trades with replacement from your trade population. Win/loss mix and totals vary per draw. Answers: "if my next N trades are a random sample from the same edge, what range of outcomes would I see?"',
    profitMetricMeaningful: true,
  },
  block: {
    label: 'Block Bootstrap',
    icon: <FaLayerGroup />,
    tagline: 'Preserves streak clustering',
    description: 'Samples in blocks of consecutive trades rather than individual trades. This preserves the local autocorrelation of your strategy — streaks stay streaks. More realistic than simple bootstrap if your wins/losses cluster.',
    profitMetricMeaningful: true,
  },
};

/* ------------------------------------------------------------------ */
/*  CSS                                                                */
/* ------------------------------------------------------------------ */
const PAN_CSS = `
  .sim-panels {
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
    --win-2: #86efac;
    --win-soft: rgba(34,197,94,.10);
    --win-soft2: rgba(34,197,94,.28);
    --loss: #ef4444;
    --loss-2: #fca5a5;
    --loss-soft: rgba(239,68,68,.10);
    --loss-soft2: rgba(239,68,68,.28);

    display: flex;
    flex-direction: column;
    gap: 16px;
    color: var(--ink-1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  /* Unit badge next to tab bar */
  .sim-unit-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    border-radius: 99px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .12em;
    text-transform: uppercase;
    background: var(--accent-soft);
    border: 1px solid var(--accent-soft2);
    color: var(--accent);
  }

  /* Tab bar */
  .sim-tabs {
    display: flex;
    gap: 4px;
    padding: 4px;
    border-radius: 14px;
    background: rgba(0,0,0,.32);
    border: 1px solid var(--line-soft);
    backdrop-filter: blur(8px);
    overflow-x: auto;
    scrollbar-width: none;
  }
  .sim-tabs::-webkit-scrollbar { display: none; }

  .sim-tab {
    padding: 8px 16px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 600;
    letter-spacing: .02em;
    border-radius: 9px;
    background: transparent;
    border: none;
    color: var(--ink-2);
    cursor: pointer;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
    white-space: nowrap;
    flex-shrink: 0;
  }
  .sim-tab:hover {
    color: var(--ink-1);
    background: rgba(255,255,255,.04);
  }
  .sim-tab.is-active {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    font-weight: 700;
    box-shadow: 0 8px 20px -10px rgba(245,158,11,.6), inset 0 1px 0 rgba(255,255,255,.4);
  }

  /* Panel shell */
  .sim-panel {
    position: relative;
    border-radius: 18px;
    background: linear-gradient(180deg, rgba(15,18,25,.72), rgba(15,18,25,.55));
    backdrop-filter: blur(18px) saturate(140%);
    -webkit-backdrop-filter: blur(18px) saturate(140%);
    border: 1px solid var(--line);
    box-shadow:
      0 20px 50px -30px rgba(0,0,0,.9),
      inset 0 1px 0 rgba(255,255,255,.03);
    padding: 16px 18px;
    overflow: hidden;
    transition: border-color .25s ease, box-shadow .25s ease;
  }
  .sim-panel:hover {
    border-color: var(--accent-soft2);
    box-shadow:
      0 24px 60px -30px rgba(0,0,0,.95),
      0 0 40px -18px var(--accent-soft2),
      inset 0 1px 0 rgba(255,255,255,.04);
  }
  .sim-panel-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding-bottom: 12px;
    margin-bottom: 14px;
    border-bottom: 1px solid var(--line-soft);
    flex-wrap: wrap;
  }
  .sim-panel-title {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--ink-2);
  }
  .sim-panel-title::before {
    content: '';
    width: 3px;
    height: 14px;
    border-radius: 3px;
    background: linear-gradient(180deg, var(--accent), var(--accent-2));
    box-shadow: 0 0 10px rgba(245,158,11,.6);
    flex-shrink: 0;
  }
  .sim-panel-note {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10.5px;
    color: var(--ink-3);
    letter-spacing: .02em;
  }

  /* KPI strip */
  .sim-kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
    gap: 12px;
  }
  .sim-kpi {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(15,18,25,.72), rgba(15,18,25,.55));
    border: 1px solid var(--line);
    box-shadow: 0 20px 50px -30px rgba(0,0,0,.9);
    transition: border-color .25s, transform .25s, box-shadow .25s;
  }
  .sim-kpi:hover {
    border-color: var(--accent-soft2);
    transform: translateY(-1px);
    box-shadow:
      0 24px 60px -30px rgba(0,0,0,.95),
      0 0 40px -18px var(--accent-soft2);
  }
  .sim-kpi-icon {
    flex-shrink: 0;
    width: 42px;
    height: 42px;
    border-radius: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 15px;
    background: rgba(255,255,255,.04);
    border: 1px solid var(--line);
    color: var(--ink-2);
  }
  .sim-kpi-icon.is-win {
    color: var(--win);
    background: var(--win-soft);
    border-color: var(--win-soft2);
    box-shadow: 0 0 24px -10px var(--win-soft2);
  }
  .sim-kpi-icon.is-loss {
    color: var(--loss);
    background: var(--loss-soft);
    border-color: var(--loss-soft2);
    box-shadow: 0 0 24px -10px var(--loss-soft2);
  }
  .sim-kpi-icon.is-amber {
    color: var(--accent);
    background: var(--accent-soft);
    border-color: var(--accent-soft2);
    box-shadow: 0 0 24px -10px var(--accent-soft2);
  }
  .sim-kpi-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .sim-kpi-label {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--ink-3);
    white-space: nowrap;
  }
  .sim-kpi-value {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 19px;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -.01em;
    color: var(--ink-1);
    white-space: nowrap;
  }
  .sim-kpi-value.pos { color: var(--win); }
  .sim-kpi-value.neg { color: var(--loss); }
  .sim-kpi-value.amber { color: var(--accent); }
  .sim-kpi-sub {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    color: var(--ink-3);
    letter-spacing: .02em;
    white-space: nowrap;
  }

  /* Methodology card */
  .sim-method {
    display: flex;
    gap: 14px;
    padding: 16px 18px;
    border-radius: 14px;
    background: rgba(255,255,255,.02);
    border: 1px solid var(--line-soft);
    margin-bottom: 14px;
  }
  .sim-method-icon {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--accent-soft);
    border: 1px solid var(--accent-soft2);
    color: var(--accent);
    font-size: 16px;
    flex-shrink: 0;
    box-shadow: 0 0 24px -10px var(--accent-soft2);
  }
  .sim-method-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }
  .sim-method-name {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .sim-method-name-main {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--accent);
  }
  .sim-method-name-tag {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 10px;
    color: var(--ink-3);
    letter-spacing: .02em;
  }
  .sim-method-desc {
    font-size: 12.5px;
    line-height: 1.65;
    color: rgba(255,255,255,.72);
  }

  /* Info banner */
  .sim-info-banner {
    display: flex;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 12px;
    background: var(--accent-soft);
    border: 1px solid var(--accent-soft2);
    color: rgba(255,255,255,.82);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    line-height: 1.65;
    letter-spacing: .01em;
    margin-bottom: 14px;
  }
  .sim-info-banner svg {
    color: var(--accent);
    flex-shrink: 0;
    margin-top: 2px;
  }
  .sim-info-banner b { color: var(--accent); font-weight: 700; }

  /* Bullet list */
  .sim-ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 12.5px;
    line-height: 1.6;
    color: rgba(255,255,255,.72);
  }
  .sim-ul li {
    display: flex;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 10px;
    background: rgba(255,255,255,.015);
    border: 1px solid var(--line-soft);
    align-items: flex-start;
    transition: border-color .2s ease;
  }
  .sim-ul li:hover { border-color: rgba(255,255,255,.12); }
  .sim-ul li::before {
    content: '';
    flex-shrink: 0;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--accent);
    box-shadow: 0 0 8px rgba(245,158,11,.5);
    margin-top: 7px;
  }
  .sim-ul li b { color: var(--ink-1); font-weight: 700; }
  .sim-ul li b.pos { color: var(--win); }
  .sim-ul li b.neg { color: var(--loss); }
  .sim-ul li b.amber { color: var(--accent); }

  /* Tables */
  .sim-table-scroll { overflow-x: auto; }
  table.sim-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12.5px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
  }
  table.sim-table thead th {
    padding: 10px 12px;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--ink-2);
    border-bottom: 1px solid var(--line);
    background: rgba(255,255,255,.02);
    white-space: nowrap;
    text-align: right;
    position: sticky;
    top: 0;
    z-index: 2;
  }
  table.sim-table thead th:first-child { text-align: left; }
  table.sim-table tbody td {
    padding: 10px 12px;
    border-bottom: 1px solid rgba(255,255,255,.03);
    text-align: right;
    color: var(--ink-1);
    letter-spacing: -.005em;
    white-space: nowrap;
  }
  table.sim-table tbody td:first-child {
    text-align: left;
    font-weight: 600;
    color: var(--ink-1);
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  }
  table.sim-table tbody tr:hover td { background: rgba(255,255,255,.025); }
  table.sim-table tbody tr:last-child td { border-bottom: none; }
  table.sim-table tbody td.faint { color: var(--ink-3); }
  table.sim-table tbody td.pos { color: var(--win); font-weight: 700; }
  table.sim-table tbody td.neg { color: var(--loss); font-weight: 700; }
  table.sim-table tbody td.amber { color: var(--accent); font-weight: 700; }

  /* Legend */
  .sim-legend {
    display: flex;
    justify-content: center;
    gap: 22px;
    margin-top: 16px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11px;
    color: var(--ink-2);
    flex-wrap: wrap;
  }
  .sim-legend-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 8px;
    background: rgba(255,255,255,.02);
    border: 1px solid var(--line-soft);
  }
  .sim-legend-line {
    display: inline-block;
    width: 14px;
    height: 2px;
    border-radius: 99px;
  }
  .sim-legend-band {
    display: inline-block;
    width: 14px;
    height: 8px;
    border-radius: 3px;
  }

  .sim-foot {
    margin: 14px 0 0;
    font-size: 11px;
    color: var(--ink-3);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    line-height: 1.6;
    letter-spacing: .01em;
  }
  .sim-foot b { color: var(--ink-1); font-weight: 700; }

  .sim-grid-2 {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
    gap: 16px;
  }
  .sim-grid-auto {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 16px;
  }

  .sim-na {
    padding: 60px 20px;
    text-align: center;
    color: var(--ink-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12.5px;
    line-height: 1.8;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .sim-na-icon {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--accent-soft);
    border: 1px solid var(--accent-soft2);
    color: var(--accent);
    font-size: 20px;
    margin-bottom: 6px;
  }
  .sim-na b { color: var(--accent); font-weight: 700; }
  .sim-na span { font-size: 11px; opacity: .85; }

  .sim-chart-wrap { height: 520px; }
  .sim-chart-sm { height: 320px; }
  .sim-chart-xs { height: 240px; }

  @media (prefers-reduced-motion: reduce) {
    .sim-kpi, .sim-panel, .sim-ul li, table.sim-table tbody td, .sim-tab { transition: none !important; }
  }
`;

/* ------------------------------------------------------------------ */
/*  Small components                                                   */
/* ------------------------------------------------------------------ */
function Panel({ title, note, children }) {
  return (
    <div className="sim-panel">
      {(title || note) && (
        <div className="sim-panel-head">
          {title && <span className="sim-panel-title">{title}</span>}
          {note && <span className="sim-panel-note">{note}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

function KPI({ icon, label, value, sub, cls, iconCls }) {
  return (
    <div className="sim-kpi">
      {icon && <span className={`sim-kpi-icon ${iconCls || ''}`}>{icon}</span>}
      <div className="sim-kpi-text">
        <span className="sim-kpi-label">{label}</span>
        <span className={`sim-kpi-value ${cls || ''}`}>{value}</span>
        {sub && <span className="sim-kpi-sub">{sub}</span>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Overview                                                           */
/* ------------------------------------------------------------------ */
function OverviewPanel({ result, summary, isMoney, initialCapital }) {
  const meta = METHOD_META[result.method] || METHOD_META.permutation;
  const showProfit = meta.profitMetricMeaningful;

  const profitPct = summary.profitPct;
  const ruinPct = summary.ruinPct;

  // Verdict: profit-focused for bootstrap/block, drawdown-focused for permutation
  const verdict = (() => {
    if (showProfit) {
      if (profitPct >= 90) return { text: 'Edge is statistically robust', cls: 'pos', icon: <FaCheckCircle /> };
      if (profitPct >= 70) return { text: 'Edge is present with normal variance', cls: 'warn', icon: <FaInfoCircle /> };
      if (profitPct >= 50) return { text: 'Edge is fragile — sample-dependent', cls: 'warn', icon: <FaExclamationTriangle /> };
      return { text: 'No reliable edge detected', cls: 'neg', icon: <FaExclamationTriangle /> };
    }
    // Permutation: judge by worst-case DD % of capital if we know capital
    const worstPct = Math.abs(summary.maxDDPct_p5);
    if (initialCapital <= 0) return { text: 'Sequence stress test', cls: 'warn', icon: <FaInfoCircle /> };
    if (worstPct < 10) return { text: 'Sequence risk is manageable', cls: 'pos', icon: <FaCheckCircle /> };
    if (worstPct < 25) return { text: 'Sequence risk is notable', cls: 'warn', icon: <FaInfoCircle /> };
    return { text: 'Sequence risk is severe — size down', cls: 'neg', icon: <FaExclamationTriangle /> };
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* KPI strip */}
      <div className="sim-kpi-grid">
        {showProfit ? (
          <KPI
            icon={<FaPercent />}
            iconCls={profitPct >= 50 ? 'is-win' : 'is-loss'}
            label="P(Profit)"
            value={fmtPct(profitPct)}
            sub={`${summary.profitCount}/${result.runs} profitable`}
            cls={profitPct >= 50 ? 'pos' : 'neg'}
          />
        ) : (
          <KPI
            icon={<FaArrowDown />}
            iconCls="is-loss"
            label="Worst 5% Drawdown"
            value={fmtValue(summary.maxDD_p5, isMoney)}
            sub={initialCapital > 0 ? `${summary.maxDDPct_p5.toFixed(1)}% of capital` : 'worst-case sequence'}
            cls="neg"
          />
        )}
        <KPI
          icon={<FaShieldAlt />}
          iconCls={ruinPct > 0 ? 'is-loss' : 'is-win'}
          label="Risk of Ruin"
          value={fmtPct(ruinPct)}
          sub={result.ruinThreshold != null ? `breaches ${fmtValue(result.ruinThreshold, isMoney)}` : 'no threshold'}
          cls={ruinPct > 0 ? 'neg' : 'pos'}
        />
        <KPI
          icon={<FaBalanceScale />}
          iconCls={summary.medianFinal >= 0 ? 'is-win' : 'is-loss'}
          label="Median Final"
          value={fmtValue(summary.medianFinal, isMoney)}
          sub="50th percentile"
          cls={summary.medianFinal >= 0 ? 'pos' : 'neg'}
        />
        <KPI
          icon={<FaArrowDown />}
          iconCls={summary.p5Final >= 0 ? 'is-win' : 'is-loss'}
          label="5th %ile Final"
          value={fmtValue(summary.p5Final, isMoney)}
          sub="worst 5% outcome"
          cls={summary.p5Final >= 0 ? 'pos' : 'neg'}
        />
        <KPI
          icon={<FaArrowUp />}
          iconCls="is-win"
          label="95th %ile Final"
          value={fmtValue(summary.p95Final, isMoney)}
          sub="best 5% outcome"
          cls="pos"
        />
      </div>

      {/* Interpretation */}
      <Panel>
        <div className="sim-interp-head" style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, flexWrap:'wrap' }}>
          <span className="sim-interp-icon-tile"><FaInfoCircle /></span>
          <span className="sim-interp-title" style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '.14em',
            textTransform: 'uppercase',
            color: 'var(--ink-1)',
          }}>What this tells you</span>
          <span className={`sim-verdict ${verdict.cls}`} style={{
            display:'inline-flex', alignItems:'center', gap:6,
            marginLeft:'auto',
            fontFamily:"'IBM Plex Mono', monospace",
            fontSize: 11, fontWeight: 700, letterSpacing: '.04em',
            padding: '5px 12px', borderRadius: 99,
            border: `1px solid ${verdict.cls === 'pos' ? 'var(--win-soft2)' : verdict.cls === 'neg' ? 'var(--loss-soft2)' : 'var(--accent-soft2)'}`,
            color: verdict.cls === 'pos' ? 'var(--win-2)' : verdict.cls === 'neg' ? 'var(--loss-2)' : 'var(--accent)',
            background: verdict.cls === 'pos' ? 'var(--win-soft)' : verdict.cls === 'neg' ? 'var(--loss-soft)' : 'var(--accent-soft)',
            whiteSpace:'nowrap',
          }}>
            {verdict.icon}
            {verdict.text}
          </span>
        </div>

        {/* Methodology card */}
        <div className="sim-method">
          <div className="sim-method-icon">{meta.icon}</div>
          <div className="sim-method-body">
            <div className="sim-method-name">
              <span className="sim-method-name-main">{meta.label}</span>
              <span className="sim-method-name-tag">{meta.tagline}</span>
            </div>
            <div className="sim-method-desc">{meta.description}</div>
          </div>
        </div>

        {/* Degenerate metric warning for permutation */}
        {!showProfit && (
          <div className="sim-info-banner">
            <FaInfoCircle />
            <span>
              <b>P(Profit) is not meaningful in permutation mode.</b> Since every run
              uses the exact same trades, the total is identical — profit probability
              is always 0% or 100%. Focus on <b>drawdown</b> and <b>streaks</b> instead,
              or switch to <b>Bootstrap</b> for a real profit probability.
            </span>
          </div>
        )}

        <ul className="sim-ul">
          {showProfit ? (
            <>
              <li><span><b>{profitPct.toFixed(1)}%</b> of runs ended profitable. Median: <b>{fmtValue(summary.medianFinal, isMoney)}</b>.</span></li>
              <li><span>Best 5% reached <b className="pos">{fmtValue(summary.p95Final, isMoney)}</b>; worst 5% ended at <b className="neg">{fmtValue(summary.p5Final, isMoney)}</b>.</span></li>
              <li><span>In the worst 5% of runs you would have suffered a drawdown of at least <b className="neg">{fmtValue(summary.maxDD_p5, isMoney)}</b>{initialCapital > 0 && <> (<b className="neg">{summary.maxDDPct_p5.toFixed(1)}%</b> of starting capital)</>}.</span></li>
              {ruinPct > 0 && (
                <li><span><b className="neg">{ruinPct.toFixed(1)}%</b> of runs breached the ruin threshold of <b>{fmtValue(result.ruinThreshold, isMoney)}</b>.</span></li>
              )}
              <li><span>Longest loss streak to expect (95th pct): <b className="amber">{fmtTrades(summary.lossStreak_p95)} trades</b> in a row.</span></li>
            </>
          ) : (
            <>
              <li><span>Across all reshuffles, the total is always <b>{fmtValue(summary.medianFinal, isMoney)}</b> — only the path changes.</span></li>
              <li><span>Worst 5% of reshuffles saw a drawdown of at least <b className="neg">{fmtValue(summary.maxDD_p5, isMoney)}</b>{initialCapital > 0 && <> (<b className="neg">{summary.maxDDPct_p5.toFixed(1)}%</b> of capital)</>}.</span></li>
              <li><span>Median drawdown across all reshuffles: <b className="amber">{fmtValue(summary.maxDD_p50, isMoney)}</b>.</span></li>
              {ruinPct > 0 && (
                <li><span><b className="neg">{ruinPct.toFixed(1)}%</b> of reshuffles breached <b>{fmtValue(result.ruinThreshold, isMoney)}</b> before recovering.</span></li>
              )}
              <li><span>Longest loss streak to expect (95th pct): <b className="amber">{fmtTrades(summary.lossStreak_p95)} trades</b> in a row.</span></li>
            </>
          )}
        </ul>
      </Panel>

      {/* Percentile Table */}
      <Panel title="Percentile Table" note="Distribution across all runs">
        <div className="sim-table-scroll">
          <table className="sim-table">
            <thead>
              <tr>
                {['Metric', '5th %ile', '25th %ile', 'Median', '75th %ile', '95th %ile'].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Final Equity</td>
                <td>{fmtValue(summary.p5Final, isMoney)}</td>
                <td>{fmtValue(summary.p25Final, isMoney)}</td>
                <td>{fmtValue(summary.medianFinal, isMoney)}</td>
                <td>{fmtValue(summary.p75Final, isMoney)}</td>
                <td>{fmtValue(summary.p95Final, isMoney)}</td>
              </tr>
              <tr>
                <td>Max Drawdown</td>
                <td>{fmtValue(summary.maxDD_p5, isMoney)}</td>
                <td>{fmtValue(summary.maxDD_p25, isMoney)}</td>
                <td>{fmtValue(summary.maxDD_p50, isMoney)}</td>
                <td>{fmtValue(summary.maxDD_p75, isMoney)}</td>
                <td>{fmtValue(summary.maxDD_p95, isMoney)}</td>
              </tr>
              {initialCapital > 0 && (
                <tr>
                  <td>Max DD % of Capital</td>
                  <td>{fmtPct(summary.maxDDPct_p5)}</td>
                  <td className="faint">—</td>
                  <td>{fmtPct(summary.maxDDPct_p50)}</td>
                  <td className="faint">—</td>
                  <td>{fmtPct(summary.maxDDPct_p95)}</td>
                </tr>
              )}
              <tr>
                <td>Sharpe Ratio</td>
                <td>{fmtRatio(summary.sharpe_p5)}</td>
                <td className="faint">—</td>
                <td>{fmtRatio(summary.sharpe_p50)}</td>
                <td className="faint">—</td>
                <td>{fmtRatio(summary.sharpe_p95)}</td>
              </tr>
              <tr>
                <td>Sortino (median)</td>
                <td className="faint">—</td>
                <td className="faint">—</td>
                <td>{fmtRatio(summary.sortino_p50)}</td>
                <td className="faint">—</td>
                <td className="faint">—</td>
              </tr>
              <tr>
                <td>Profit Factor (median)</td>
                <td className="faint">—</td>
                <td className="faint">—</td>
                <td>{fmtRatio(summary.pf_p50)}</td>
                <td className="faint">—</td>
                <td className="faint">—</td>
              </tr>
              <tr>
                <td>Expectancy (median)</td>
                <td className="faint">—</td>
                <td className="faint">—</td>
                <td>{fmtValue(summary.exp_p50, isMoney)}</td>
                <td className="faint">—</td>
                <td className="faint">—</td>
              </tr>
              <tr>
                <td>Win Rate (median)</td>
                <td className="faint">—</td>
                <td className="faint">—</td>
                <td>{fmtPct(summary.win_p50)}</td>
                <td className="faint">—</td>
                <td className="faint">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bands                                                              */
/* ------------------------------------------------------------------ */
function BandsPanel({ result, actualCurve, isMoney }) {
  return (
    <Panel title="Cumulative Equity Bands" note={`${result.runs.toLocaleString()} simulated paths`}>
      <div className="sim-chart-wrap">
        <FanChart result={result} actualCurve={actualCurve} isMoney={isMoney} showActual />
      </div>
      <div className="sim-legend">
        <span className="sim-legend-item">
          <span className="sim-legend-line" style={{ background: '#F59E0B' }} />
          Median path
        </span>
        <span className="sim-legend-item">
          <span className="sim-legend-band" style={{ background: 'rgba(245,158,11,.18)' }} />
          25–75% band
        </span>
        <span className="sim-legend-item">
          <span className="sim-legend-band" style={{ background: 'rgba(245,158,11,.08)' }} />
          5–95% band
        </span>
        <span className="sim-legend-item">
          <span className="sim-legend-line" style={{ background: '#4C8BF5' }} />
          Your actual path
        </span>
      </div>
      <p className="sim-foot">
        {result.method === 'permutation'
          ? 'Every reshuffle lands on the same final total — only the path bends. The bands show how different sequences distribute over time.'
          : result.method === 'block'
            ? `Sampled in blocks of ${result.blockSize} consecutive trades to preserve local streak clustering.`
            : 'Sampled independently with replacement. The bands show the range of outcomes a fresh sample of the same size would produce.'}
      </p>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/*  Drawdown                                                           */
/* ------------------------------------------------------------------ */
function DrawdownPanel({ result, summary, isMoney, initialCapital }) {
  const neverRecovered = result.recoveryTrades.filter(v => v < 0).length;
  const neverPct = ((neverRecovered / result.runs) * 100).toFixed(1);

  return (
    <div className="sim-grid-2">
      <Panel title="Max Drawdown Distribution" note={`Worst DD per run · ${result.runs} runs`}>
        <div className="sim-chart-sm">
          <DistributionChart values={result.maxDDs} color="#ef4444" height={320} />
        </div>
        <p className="sim-foot">
          Worst expected (5th pct): <b style={{ color: '#f87171' }}>{fmtValue(summary.maxDD_p5, isMoney)}</b>
          {initialCapital > 0 && <> · <b style={{ color: '#f87171' }}>{summary.maxDDPct_p5.toFixed(1)}%</b> of capital</>}
          <br />
          Median: <b>{fmtValue(summary.maxDD_p50, isMoney)}</b>
          {initialCapital > 0 && <> · <b>{summary.maxDDPct_p50.toFixed(1)}%</b></>}
        </p>
      </Panel>

      <Panel title="Recovery Time" note="Trades to fully recover">
        <div className="sim-chart-sm">
          <DistributionChart
            values={result.recoveryTrades.filter(v => v >= 0)}
            color="#F59E0B"
            height={320}
            tooltipSuffix="to recover"
          />
        </div>
        <p className="sim-foot">
          <b style={{ color: '#f87171' }}>{neverPct}%</b> of runs never fully recovered from their worst drawdown.
        </p>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Ratios                                                             */
/* ------------------------------------------------------------------ */
function RatiosPanel({ result }) {
  if (result.method === 'permutation') {
    return (
      <Panel>
        <div className="sim-na">
          <div className="sim-na-icon"><FaBalanceScale /></div>
          <div>Ratio distributions require <b>Bootstrap</b> or <b>Block Bootstrap</b> mode.</div>
          <span>Permutation reshuffles the same trades, so Sharpe / Sortino / Profit Factor are identical across runs — there's no distribution to plot.</span>
        </div>
      </Panel>
    );
  }

  const items = [
    { title: 'Sharpe Ratio', values: result.sharpes, color: '#F59E0B' },
    { title: 'Sortino Ratio', values: result.sortinos, color: '#F59E0B' },
    { title: 'Profit Factor', values: result.profitFactors.filter(v => v < 9000), color: '#22c55e' },
    { title: 'Expectancy', values: result.expectancies, color: '#22c55e' },
    { title: 'Win Rate (%)', values: result.winRates.map(v => v * 100), color: '#F59E0B' },
  ];

  return (
    <div className="sim-grid-auto">
      {items.map(c => (
        <Panel key={c.title} title={c.title}>
          <div className="sim-chart-xs">
            <DistributionChart values={c.values} color={c.color} height={240} />
          </div>
        </Panel>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Streaks                                                            */
/* ------------------------------------------------------------------ */
function StreaksPanel({ result, summary }) {
  return (
    <div className="sim-grid-2">
      <Panel title="Longest Win Streak" note={`across ${result.runs} runs`}>
        <div className="sim-chart-sm">
          <DistributionChart values={result.longestWins} color="#22c55e" height={320} />
        </div>
        <p className="sim-foot">
          Median: <b style={{ color: '#4ade80' }}>{fmtTrades(summary.winStreak_p50)}</b> · 95th pct: <b style={{ color: '#4ade80' }}>{fmtTrades(summary.winStreak_p95)} consecutive wins</b>
        </p>
      </Panel>

      <Panel title="Longest Loss Streak" note={`across ${result.runs} runs`}>
        <div className="sim-chart-sm">
          <DistributionChart values={result.longestLosses} color="#ef4444" height={320} />
        </div>
        <p className="sim-foot">
          Median: <b style={{ color: '#f87171' }}>{fmtTrades(summary.lossStreak_p50)}</b> · 95th pct: <b style={{ color: '#f87171' }}>{fmtTrades(summary.lossStreak_p95)} consecutive losses</b>
        </p>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Targets                                                            */
/* ------------------------------------------------------------------ */
function TargetsPanel({ result, isMoney }) {
  if (!result.timeToTarget || result.timeToTarget.length === 0) {
    return (
      <Panel title="Time to Reach Target">
        <div className="sim-na">No targets configured.</div>
      </Panel>
    );
  }
  return (
    <Panel title="Time to Reach Target" note={isMoney ? 'in dollars' : 'in R-multiples'}>
      <div className="sim-table-scroll">
        <table className="sim-table">
          <thead>
            <tr>
              {['Target', 'Success %', '25th %ile Trades', 'Median Trades', '75th %ile Trades'].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.timeToTarget.map(t => (
              <tr key={t.target}>
                <td>{fmtValue(t.target, isMoney)}</td>
                <td className={t.successPct >= 50 ? 'pos' : 'neg'}>{t.successPct.toFixed(1)}%</td>
                <td>{t.p25Trades != null ? fmtTrades(t.p25Trades) : '—'}</td>
                <td className="amber">{t.medianTrades != null ? fmtTrades(t.medianTrades) : '—'}</td>
                <td>{t.p75Trades != null ? fmtTrades(t.p75Trades) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="sim-foot">
        Success % = fraction of runs that reached the target at any point.
        Median trades = 50th percentile of trade-counts <b>among runs that hit it</b>.
      </p>
    </Panel>
  );
}

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */
export default function SimulatorPanels({
  result, summary, isMoney, initialCapital, actualCurve, tab, setTab,
}) {
  return (
    <>
      <style>{PAN_CSS}</style>
      <div className="sim-panels">
        <div className="sim-tabs" role="tablist">
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              className={`sim-tab ${tab === t.id ? 'is-active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <OverviewPanel result={result} summary={summary} isMoney={isMoney} initialCapital={initialCapital} />
        )}
        {tab === 'bands' && (
          <BandsPanel result={result} actualCurve={actualCurve} isMoney={isMoney} />
        )}
        {tab === 'drawdown' && (
          <DrawdownPanel result={result} summary={summary} isMoney={isMoney} initialCapital={initialCapital} />
        )}
        {tab === 'ratios' && <RatiosPanel result={result} />}
        {tab === 'streaks' && <StreaksPanel result={result} summary={summary} />}
        {tab === 'targets' && <TargetsPanel result={result} isMoney={isMoney} />}
      </div>
    </>
  );
}