import { useMemo, useState, useCallback } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { chartColors } from '@/shared/charts/theme';
import Panel from './Panel';
import { Verdict, KpiGrid } from './Summary';
import TargetsPanel from './TargetsPanel';
import StatsTable from './StatsTable';
import FanChart from './charts/FanChart';
import DrawdownChart from './charts/DrawdownChart';
import HistogramChart, { IntHistogramChart } from './charts/HistogramChart';
import { buildInsights } from '../lib/insights';
import { exportSummaryCsv, exportRunsCsv } from '../lib/exportCsv';
import { fmtAxis, fmtInt, fmtPct, fmtUnit } from '../lib/format';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'drawdown', label: 'Drawdown' },
  { id: 'streaks', label: 'Streaks & recovery' },
  { id: 'targets', label: 'Targets' },
  { id: 'stats', label: 'Statistics' },
];

function PathsToggle({ checked, onChange }) {
  return (
    <label className="sx-toggle">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>Sample paths</span>
    </label>
  );
}

function RangeStats({ items }) {
  return (
    <div className="sx-range">
      {items.map((i) => (
        <div key={i.label}>
          <span>{i.label}</span>
          <b>{i.value}</b>
        </div>
      ))}
    </div>
  );
}

export default function ResultsView({
  result, summary, previous, isMoney, actualCurve, accountMeta, onSwitchToBootstrap, busy,
}) {
  const [tab, setTab] = useState('overview');
  const [showPaths, setShowPaths] = useState(true);

  const actualFinal = actualCurve?.length ? actualCurve[actualCurve.length - 1] : null;
  const insights = useMemo(
    () => buildInsights({ result, summary, isMoney, actualFinal }),
    [result, summary, isMoney, actualFinal]
  );

  const axisFmt = useCallback((v) => fmtAxis(v, isMoney), [isMoney]);
  const intFmt = useCallback((v) => String(Math.round(v)), []);
  const finalColor = useCallback((mid) => (mid >= 0 ? chartColors.win : chartColors.loss), []);
  const lossColor = useCallback(() => chartColors.loss, []);

  const isPerm = result.method === 'permutation';
  const s = result._sorted;
  const rec = insights.recovery;
  const breachTrades = useMemo(
    () => (result.ddBreachTrades || []).filter((v) => v > 0),
    [result]
  );

  const onKeyTabs = (e) => {
    const i = TABS.findIndex((t) => t.id === tab);
    if (e.key === 'ArrowRight') setTab(TABS[(i + 1) % TABS.length].id);
    if (e.key === 'ArrowLeft') setTab(TABS[(i - 1 + TABS.length) % TABS.length].id);
  };

  return (
    <div className={`sx-results ${busy ? 'is-busy' : ''}`}>
      <Verdict insights={insights} onSwitchToBootstrap={onSwitchToBootstrap} />
      <KpiGrid result={result} summary={summary} previous={previous} isMoney={isMoney} />

      <div className="sx-tabbar">
        <div className="sx-tabs" role="tablist" aria-label="Result sections" onKeyDown={onKeyTabs}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`sx-tab-${t.id}`}
              aria-selected={tab === t.id}
              aria-controls={`sx-panel-${t.id}`}
              tabIndex={tab === t.id ? 0 : -1}
              className={tab === t.id ? 'is-active' : ''}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="sx-exports">
          <button type="button" className="sx-btn sx-btn-ghost" onClick={() => exportSummaryCsv({ result, summary, meta: accountMeta })}>
            <Download size={14} /> Summary CSV
          </button>
          <button type="button" className="sx-btn sx-btn-ghost" onClick={() => exportRunsCsv({ result })}>
            <FileSpreadsheet size={14} /> All runs CSV
          </button>
        </div>
      </div>

      <div role="tabpanel" id={`sx-panel-${tab}`} aria-labelledby={`sx-tab-${tab}`} className="sx-tabpanel">
        {tab === 'overview' && (
          <>
            <Panel
              title="Equity paths"
              note="Shaded: middle 50% and middle 90% of runs. Blue is your real equity curve."
              actions={<PathsToggle checked={showPaths} onChange={setShowPaths} />}
            >
              <div className="sx-legend">
                <span><i style={{ background: 'var(--accent)' }} /> Median</span>
                <span><i style={{ background: 'color-mix(in srgb, var(--accent) 35%, transparent)' }} /> 25-75%</span>
                <span><i style={{ background: 'color-mix(in srgb, var(--accent) 15%, transparent)' }} /> 5-95%</span>
                <span><i style={{ background: chartColors.blue }} /> Actual</span>
              </div>
              <FanChart result={result} actualCurve={actualCurve} isMoney={isMoney} showPaths={showPaths} />
            </Panel>

            <div className="sx-grid-2">
              <Panel
                title="Final P&L distribution"
                note={isPerm ? 'Fixed under permutation' : `Where ${fmtInt(result.runs)} runs finish`}
              >
                {isPerm ? (
                  <div className="sx-note">
                    Permutation keeps every trade, so every run ends at {fmtUnit(summary.medianFinal, isMoney, { sign: true })}.
                    Switch to Bootstrap or Block to see a spread of outcomes.
                  </div>
                ) : (
                  <>
                    <RangeStats
                      items={[
                        { label: 'Worst 5%', value: fmtUnit(summary.p5Final, isMoney, { sign: true }) },
                        { label: 'Median', value: fmtUnit(summary.medianFinal, isMoney, { sign: true }) },
                        { label: 'Best 5%', value: fmtUnit(summary.p95Final, isMoney, { sign: true }) },
                      ]}
                    />
                    <HistogramChart values={result.finalValues} fmt={axisFmt} colorFor={finalColor} />
                  </>
                )}
              </Panel>

              <Panel title="Max drawdown distribution" note="Deepest fall from peak, one value per run">
                <RangeStats
                  items={[
                    { label: 'Median', value: fmtUnit(Math.abs(summary.maxDD_p50), isMoney) },
                    { label: 'Worst 25%', value: fmtUnit(Math.abs(summary.maxDD_p25), isMoney) },
                    { label: 'Worst 5%', value: fmtUnit(Math.abs(summary.maxDD_p5), isMoney) },
                  ]}
                />
                <HistogramChart values={result.maxDDs} fmt={axisFmt} colorFor={lossColor} />
              </Panel>
            </div>
          </>
        )}

        {tab === 'drawdown' && (
          <>
            <Panel
              title="Drawdown paths"
              note="How far below its running peak a run sits after each trade. Dashed red is your limit."
              actions={<PathsToggle checked={showPaths} onChange={setShowPaths} />}
            >
              <div className="sx-legend">
                <span><i style={{ background: chartColors.loss }} /> Worst 5%</span>
                <span><i style={{ background: 'var(--accent)' }} /> 25th pct</span>
                <span><i style={{ background: chartColors.textLight }} /> Median</span>
              </div>
              <DrawdownChart result={result} isMoney={isMoney} showPaths={showPaths} />
            </Panel>

            <div className="sx-grid-2">
              <Panel title="Max drawdown summary">
                <RangeStats
                  items={[
                    { label: 'Median', value: fmtUnit(Math.abs(summary.maxDD_p50), isMoney) },
                    { label: 'Worst 25%', value: fmtUnit(Math.abs(summary.maxDD_p25), isMoney) },
                    { label: 'Worst 5%', value: fmtUnit(Math.abs(summary.maxDD_p5), isMoney) },
                  ]}
                />
                {(result.initialCapital ?? 0) > 0 && (
                  <RangeStats
                    items={[
                      { label: 'Median % of capital', value: fmtPct(Math.abs(summary.maxDDPct_p50)) },
                      { label: 'Worst 5% % of capital', value: fmtPct(Math.abs(summary.maxDDPct_p5)) },
                    ]}
                  />
                )}
              </Panel>

              <Panel
                title="When breaches happen"
                note={Number.isFinite(result.ddThreshold) ? 'Trade number at which a run first crosses the limit' : 'No drawdown limit set'}
              >
                {breachTrades.length > 0 ? (
                  <HistogramChart values={breachTrades} fmt={intFmt} colorFor={lossColor} buckets={20} />
                ) : (
                  <div className="sx-note">
                    {Number.isFinite(result.ddThreshold)
                      ? 'No run crossed the drawdown limit.'
                      : 'Set a drawdown limit in the setup panel to see breach timing.'}
                  </div>
                )}
              </Panel>
            </div>
          </>
        )}

        {tab === 'streaks' && (
          <>
            <div className="sx-grid-2">
              <Panel title="Longest losing streak" note="Per run, consecutive losing trades">
                <RangeStats
                  items={[
                    { label: 'Median', value: fmtInt(summary.lossStreak_p50) },
                    { label: '1 in 20', value: `${fmtInt(summary.lossStreak_p95)}+` },
                  ]}
                />
                <IntHistogramChart values={result.longestLosses} color={chartColors.loss} />
              </Panel>
              <Panel title="Longest winning streak" note="Per run, consecutive winning trades">
                <RangeStats
                  items={[
                    { label: 'Median', value: fmtInt(summary.winStreak_p50) },
                    { label: '1 in 20', value: `${fmtInt(summary.winStreak_p95)}+` },
                  ]}
                />
                <IntHistogramChart values={result.longestWins} color={chartColors.win} />
              </Panel>
            </div>

            <Panel
              title="Recovery time"
              note="Trades from the start of the worst drawdown until equity regains its prior peak"
            >
              <RangeStats
                items={[
                  { label: 'Median', value: rec.p50 == null ? '--' : `${fmtInt(rec.p50)} trades` },
                  { label: '95th pct', value: rec.p95 == null ? '--' : `${fmtInt(rec.p95)} trades` },
                  { label: 'Never recovered', value: fmtPct(rec.neverPct) },
                ]}
              />
              {rec.recovered.length > 1 ? (
                <HistogramChart values={rec.recovered} fmt={intFmt} colorFor={() => chartColors.amber} buckets={24} />
              ) : (
                <div className="sx-note">Not enough runs with a completed recovery to chart.</div>
              )}
            </Panel>
          </>
        )}

        {tab === 'targets' && <TargetsPanel result={result} isMoney={isMoney} />}
        {tab === 'stats' && <StatsTable result={result} isMoney={isMoney} />}
      </div>
    </div>
  );
}
