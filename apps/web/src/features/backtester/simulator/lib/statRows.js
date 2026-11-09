import { quantiles } from './stats';
import { fmtUnit, fmtPct, fmtNum, fmtInt, fmtRatio } from './format';

/** One row per metric: five quantiles (p5, p25, p50, p75, p95). */
export function buildStatRows(result) {
  if (!result?._sorted) return [];
  const s = result._sorted;
  const hasCapital = (result.initialCapital ?? 0) > 0;

  const rows = [
    { key: 'final', label: 'Final P&L', kind: 'unit', values: quantiles(s.final) },
    { key: 'maxDD', label: 'Max drawdown', kind: 'unit', values: quantiles(s.maxDD) },
  ];

  if (hasCapital) {
    rows.push({
      key: 'maxDDPct',
      label: 'Max drawdown (% of capital)',
      kind: 'pct',
      values: quantiles(s.maxDDPct),
    });
  }

  rows.push(
    { key: 'expectancy', label: 'Expectancy per trade', kind: 'unit3', values: quantiles(s.expectancy) },
    {
      key: 'winRate',
      label: 'Win rate',
      kind: 'pct',
      values: quantiles(s.winRate).map((v) => (v == null ? v : v * 100)),
    },
    { key: 'sharpe', label: 'Sharpe (per trade)', kind: 'num', values: quantiles(s.sharpe) },
    { key: 'sortino', label: 'Sortino (per trade)', kind: 'num', values: quantiles(s.sortino) },
    {
      key: 'pf',
      label: 'Profit factor',
      kind: 'ratio',
      values: result._finitePfs?.length ? quantiles(result._finitePfs) : [null, null, null, null, null],
    },
    { key: 'winStreak', label: 'Longest win streak', kind: 'int', values: quantiles(s.winStreak) },
    { key: 'lossStreak', label: 'Longest loss streak', kind: 'int', values: quantiles(s.lossStreak) }
  );

  return rows;
}

export function formatStat(kind, v, isMoney) {
  switch (kind) {
    case 'unit':
      return fmtUnit(v, isMoney, { sign: true });
    case 'unit3':
      return fmtUnit(v, isMoney, { sign: true, dp: isMoney ? 2 : 3 });
    case 'pct':
      return fmtPct(v, 1);
    case 'int':
      return fmtInt(v);
    case 'ratio':
      return fmtRatio(v, 2);
    default:
      return fmtNum(v, 3);
  }
}
