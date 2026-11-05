import Panel from './Panel';
import { buildStatRows, formatStat } from '../lib/statRows';

const COLS = ['p5', 'p25', 'p50', 'p75', 'p95'];

export default function StatsTable({ result, isMoney }) {
  const rows = buildStatRows(result);
  return (
    <Panel
      title="Percentile table"
      note={`Distribution across ${result.runs.toLocaleString('en-US')} runs. p50 is the typical run; p5 and p95 are the tails.`}
    >
      <div className="sx-table-wrap">
        <table className="sx-table">
          <thead>
            <tr>
              <th scope="col">Metric</th>
              {COLS.map((c) => (
                <th key={c} scope="col" className={c === 'p50' ? 'is-mid' : ''}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <th scope="row">{r.label}</th>
                {r.values.map((v, i) => (
                  <td key={COLS[i]} className={COLS[i] === 'p50' ? 'is-mid' : ''}>
                    {formatStat(r.kind, v, isMoney)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result.infinitePfCount > 0 && (
        <div className="sx-note">
          {result.infinitePfCount.toLocaleString('en-US')} runs had no losing trades (infinite profit factor) and are excluded from the profit factor row.
        </div>
      )}
      <div className="sx-note">For P&amp;L and drawdown, p5 is the bad tail (lowest P&amp;L, deepest drawdown).</div>
    </Panel>
  );
}
