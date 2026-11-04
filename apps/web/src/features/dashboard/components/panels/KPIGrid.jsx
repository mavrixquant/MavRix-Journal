// "kpiGrid" panel = the metric ribbon: six hero tiles, each with a micro-visual.
import { useMemo } from 'react';
import { useStats } from '@/features/dashboard/hooks/useStats';
import Sparkline from '@/features/dashboard/components/viz/Sparkline';
import { summarize } from '@/features/dashboard/components/viz/analytics';
import { makeFmt, fmtPct, nf } from '@/features/dashboard/components/viz/format';
import PanelChrome, { PanelEmpty } from './PanelChrome';

function Dots({ results }) {
  return (
    <div className="rb-dots" aria-label="Last 20 trades">
      {results.map((r, i) => (
        <i key={i} className={r === 'win' ? 'w' : r === 'loss' ? 'l' : 'b'} />
      ))}
    </div>
  );
}

function Columns({ scores }) {
  const max = Math.max(...scores.map((s) => Math.abs(s)), 1e-9);
  return (
    <div className="rb-cols" aria-label="Recent trades">
      {scores.map((s, i) => (
        <i key={i} className={s >= 0 ? 'w' : 'l'} style={{ height: `${Math.max(12, (Math.abs(s) / max) * 100)}%` }} />
      ))}
    </div>
  );
}

function Split({ a, b }) {
  const total = a + b || 1;
  return (
    <div className="rb-split">
      <i className="w" style={{ width: `${(a / total) * 100}%` }} />
      <i className="l" style={{ width: `${(b / total) * 100}%` }} />
    </div>
  );
}

function Tile({ label, value, sub, tone = 'flat', children }) {
  return (
    <div className="rb-tile" data-tone={tone}>
      <div className="rb-label">{label}</div>
      <div className="rb-value">{value}</div>
      <div className="rb-sub">{sub}</div>
      <div className="rb-viz">{children}</div>
    </div>
  );
}

export default function KPIGrid() {
  const { stats, metric, currentR } = useStats();
  const isMoney = metric === '$';
  const fmt = makeFmt(isMoney);
  const s = useMemo(() => (stats?.n ? summarize(stats) : null), [stats]);

  if (!stats || stats.n === 0 || !s) {
    return (
      <PanelChrome title="Performance">
        <PanelEmpty title="No trading data" hint="Log trades to see your metrics" />
      </PanelChrome>
    );
  }

  const total = isMoney ? stats.total : stats.totalR;
  const pf = Number.isFinite(stats.profitFactor) ? nf(stats.profitFactor) : '∞';
  const wins = stats.wins?.length ?? 0;
  const losses = stats.losses?.length ?? 0;
  const avgWin = isMoney ? s.avgWin : s.avgWin || currentR;
  const avgLoss = isMoney ? s.avgLoss : s.avgLoss || 1;
  const streakLabel = s.streak.type ? `${s.streak.type === 'win' ? 'W' : 'L'}${s.streak.n}` : '—';

  return (
    <div className="rb">
      <Tile
        label={isMoney ? 'Net P&L' : 'Total R'}
        value={fmt(total)}
        sub={`${stats.n} trades`}
        tone={total >= 0 ? 'pos' : 'neg'}
      >
        <Sparkline values={s.equity.slice(-60).map((p) => p.y)} tone={total >= 0 ? 'var(--d-win)' : 'var(--d-loss)'} />
      </Tile>

      <Tile
        label="Win rate"
        value={fmtPct(stats.winRate)}
        sub={`${wins}W · ${losses}L`}
        tone={stats.winRate >= 50 ? 'pos' : 'neg'}
      >
        <Dots results={s.recentResults} />
      </Tile>

      <Tile label="Profit factor" value={pf} sub={`payoff ${s.payoff ? nf(s.payoff) : '—'}×`} tone="accent">
        <Split a={s.grossWin} b={s.grossLoss} />
      </Tile>

      <Tile
        label="Expectancy"
        value={fmt(stats.expectancy)}
        sub={`avg ${fmt(avgWin, { sign: false })} / ${fmt(-avgLoss, { sign: false })}`}
        tone={stats.expectancy >= 0 ? 'pos' : 'neg'}
      >
        <Columns scores={s.recentScores} />
      </Tile>

      <Tile
        label="Max drawdown"
        value={s.maxDD ? fmt(-s.maxDD, { sign: false }) : '—'}
        sub={s.curDD > 0 ? `now ${fmt(-s.curDD, { sign: false })}` : 'at equity high'}
        tone="neg"
      >
        <div className="rb-meter">
          <i style={{ width: `${s.maxDD ? Math.min(100, (s.curDD / s.maxDD) * 100) : 0}%` }} />
        </div>
      </Tile>

      <Tile
        label="Streak"
        value={streakLabel}
        sub={`best W${stats.bestWinStreak ?? 0} · worst L${stats.worstLossStreak ?? 0}`}
        tone={s.streak.type === 'win' ? 'pos' : s.streak.type === 'loss' ? 'neg' : 'flat'}
      >
        <Dots results={s.recentResults.slice(-10)} />
      </Tile>
    </div>
  );
}
