import { fmtPct, toneOf } from '@/features/dashboard/components/viz/format';
import { fmtDuration, fmtPF } from './Card';

export function KpiStrip({ stats, fmt }) {
  const payoff = Math.abs(stats.avgLoss) > 0 ? stats.avgWin / Math.abs(stats.avgLoss) : 0;
  const pf = stats.profitFactor;

  const tiles = [
    {
      label: 'Net result',
      value: fmt(stats.total),
      tone: toneOf(stats.total),
      sub: `${stats.n} ${stats.n === 1 ? 'trade' : 'trades'}`,
    },
    {
      label: 'Win rate',
      value: fmtPct(stats.winRate),
      sub: `${stats.wins.length} wins, ${stats.losses.length} losses`,
    },
    {
      label: 'Profit factor',
      value: fmtPF(pf),
      tone: pf >= 1 ? 'pos' : 'neg',
      sub: 'Gross profit / gross loss',
    },
    {
      label: 'Expectancy',
      value: fmt(stats.expectancy),
      tone: toneOf(stats.expectancy),
      sub: 'Average per trade',
    },
    {
      label: 'Payoff ratio',
      value: payoff ? `${payoff.toFixed(2)}:1` : '-',
      sub: `Avg win ${fmt(stats.avgWin)}, avg loss ${fmt(stats.avgLoss)}`,
    },
    {
      label: 'Max drawdown',
      value: fmt(stats.maxDD),
      tone: stats.maxDD < 0 ? 'neg' : 'flat',
      sub: `Average ${fmt(stats.avgDD)}`,
    },
    {
      label: 'Average hold',
      value: fmtDuration(stats.avgDuration),
      sub: `Win ${fmtDuration(stats.avgWinDuration)}, loss ${fmtDuration(stats.avgLossDuration)}`,
    },
    {
      label: 'Streaks',
      value: `${stats.bestWinStreak}W / ${stats.worstLossStreak}L`,
      sub: 'Best win, worst loss',
    },
  ];

  return (
    <div className="ax-kpis">
      {tiles.map((t) => (
        <div key={t.label} className="ax-kpi" data-tone={t.tone || 'flat'}>
          <span className="ax-kpi-label">{t.label}</span>
          <span className="ax-kpi-value">{t.value}</span>
          <span className="ax-kpi-sub" title={t.sub}>{t.sub}</span>
        </div>
      ))}
    </div>
  );
}

export function InsightGrid({ insights }) {
  if (!insights.length) return null;
  return (
    <div className="ax-insights">
      {insights.map((c) => (
        <article key={c.id} className="ax-insight" data-tone={c.tone}>
          <span className="ax-insight-kicker">{c.kicker}</span>
          <h3 className="ax-insight-head">{c.headline}</h3>
          <p className="ax-insight-body">{c.body}</p>
        </article>
      ))}
    </div>
  );
}
