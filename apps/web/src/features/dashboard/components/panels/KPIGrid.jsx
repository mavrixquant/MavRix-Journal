import { useStats } from '@/features/dashboard/hooks/useStats';
import PanelChrome, { PanelEmpty } from './PanelChrome';

const formatR = (v) => (v != null && !Number.isNaN(v) ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}R` : '—');
const formatPct = (v) => (v != null && !Number.isNaN(v) ? `${v.toFixed(1)}%` : '—');
const formatMoney = (v) => {
  if (v == null || Number.isNaN(v)) return '—';
  const sign = v < 0 ? '-' : '+';
  return `${sign}$${Math.abs(v).toFixed(2)}`;
};

export default function KPIGrid() {
  const { stats, currentR, metric } = useStats();
  const isMoney = metric === '$';

  if (!stats || stats.n === 0) {
    return (
      <PanelChrome title="Performance">
        <PanelEmpty title="No trading data" hint="Log trades to display performance metrics" />
      </PanelChrome>
    );
  }

  const pf = Number.isFinite(stats.profitFactor) ? stats.profitFactor.toFixed(2) : '∞';
  const winTone = stats.winRate >= 50 ? 'pos' : 'neg';

  const kpis = isMoney
    ? [
        { label: 'Win Rate', value: formatPct(stats.winRate), tone: winTone, sub: `${stats.wins?.length ?? 0}W` },
        { label: 'Loss Rate', value: formatPct(stats.lossRate), tone: 'neg', sub: `${stats.losses?.length ?? 0}L` },
        { label: 'Net P&L', value: formatMoney(stats.total), tone: stats.total >= 0 ? 'pos' : 'neg', sub: `${stats.n} trades` },
        { label: 'Avg P&L', value: formatMoney(stats.expectancy), tone: stats.expectancy >= 0 ? 'pos' : 'neg', sub: 'per trade' },
        { label: 'Profit Factor', value: pf, tone: 'accent', sub: 'W / L' },
        { label: 'Avg Win', value: formatMoney(stats.avgWin), tone: 'pos', sub: 'per win' },
        { label: 'Avg Loss', value: formatMoney(stats.avgLoss), tone: 'neg', sub: 'per loss' },
        { label: 'Max DD', value: stats.maxDD != null ? formatMoney(stats.maxDD) : '—', tone: 'neg', sub: 'peak → trough' },
        { label: 'Win Streak', value: stats.bestWinStreak ?? 0, tone: 'pos', sub: 'best' },
        { label: 'Loss Streak', value: stats.worstLossStreak ?? 0, tone: 'neg', sub: 'worst' },
        { label: 'Best Trade', value: stats.bestTrade ? formatMoney(stats.bestTrade.score) : '—', tone: 'pos', sub: stats.bestTrade?.date ?? '' },
        { label: 'Worst Trade', value: stats.worstTrade ? formatMoney(stats.worstTrade.score) : '—', tone: 'neg', sub: stats.worstTrade?.date ?? '' },
      ]
    : [
        { label: 'Win Rate', value: formatPct(stats.winRate), tone: winTone, sub: `${stats.wins?.length ?? 0}W` },
        { label: 'Loss Rate', value: formatPct(stats.lossRate), tone: 'neg', sub: `${stats.losses?.length ?? 0}L` },
        { label: 'Total R', value: formatR(stats.totalR), tone: stats.totalR >= 0 ? 'pos' : 'neg', sub: `${stats.n} trades` },
        { label: 'Expectancy', value: formatR(stats.expectancy), tone: stats.expectancy >= 0 ? 'pos' : 'neg', sub: 'per trade' },
        { label: 'Profit Factor', value: pf, tone: 'accent', sub: 'W / L' },
        { label: 'Avg Win', value: formatR(currentR), tone: 'pos', sub: 'at target' },
        { label: 'Avg Loss', value: '-1.00R', tone: 'neg', sub: 'at stop' },
        { label: 'Max DD', value: stats.maxDD != null ? `${stats.maxDD.toFixed(2)}R` : '—', tone: 'neg', sub: 'peak → trough' },
        { label: 'Win Streak', value: stats.bestWinStreak ?? 0, tone: 'pos', sub: 'best' },
        { label: 'Loss Streak', value: stats.worstLossStreak ?? 0, tone: 'neg', sub: 'worst' },
        { label: 'Best Trade', value: stats.bestTrade ? formatR(stats.bestTrade.r) : '—', tone: 'pos', sub: stats.bestTrade?.date ?? '' },
        { label: 'Worst Trade', value: stats.worstTrade ? formatR(stats.worstTrade.r) : '—', tone: 'neg', sub: stats.worstTrade?.date ?? '' },
      ];

  return (
    <PanelChrome title="Performance" note={isMoney ? '$ mode' : `1:${currentR} target`} scrollable>
      <div className="kx">
        <div className="kx-grid">
          {kpis.map((k) => (
            <div key={k.label} className="kx-card" data-tone={k.tone}>
              <div className="kx-label">{k.label}</div>
              <div className="kx-value">{k.value}</div>
              <div className="kx-sub">{k.sub || '—'}</div>
            </div>
          ))}
        </div>
      </div>
    </PanelChrome>
  );
}
