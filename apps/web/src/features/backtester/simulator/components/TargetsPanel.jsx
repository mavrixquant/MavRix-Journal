import Panel from './Panel';
import { fmtUnit, fmtPct, fmtInt } from '../lib/format';

export default function TargetsPanel({ result, isMoney }) {
  const rows = result.timeToTarget || [];

  if (rows.length === 0) {
    return (
      <Panel title="Profit targets">
        <div className="sx-note">Add profit targets in the setup panel to see how likely and how fast each one is reached.</div>
      </Panel>
    );
  }

  return (
    <Panel
      title="Profit targets"
      note="Chance of touching each target at any point, and how many trades it usually takes."
    >
      <div className="sx-targets">
        {rows.map((t) => (
          <div key={t.target} className="sx-target">
            <div className="sx-target-top">
              <span className="sx-target-name">{fmtUnit(t.target, isMoney, { sign: true })}</span>
              <span className="sx-target-pct">{fmtPct(t.successPct)}</span>
            </div>
            <div className="sx-bar" role="img" aria-label={`${t.successPct.toFixed(1)} percent of runs reach this target`}>
              <span style={{ width: `${Math.min(100, t.successPct)}%` }} />
            </div>
            <dl className="sx-target-stats">
              <div>
                <dt>Ends above target</dt>
                <dd>{fmtPct(t.finalPct)}</dd>
              </div>
              <div>
                <dt>Median trades to hit</dt>
                <dd>{t.medianTrades == null ? '--' : fmtInt(t.medianTrades)}</dd>
              </div>
              <div>
                <dt>Fast / slow (25th / 75th)</dt>
                <dd>{t.p25Trades == null ? '--' : `${fmtInt(t.p25Trades)} / ${fmtInt(t.p75Trades)}`}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </Panel>
  );
}
