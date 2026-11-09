// "durationWidget" panel = habits: holding time, payoff, extremes.
import { useMemo } from 'react';
import { useStats } from '@/features/dashboard/hooks/useStats';
import { summarize } from '@/features/dashboard/components/viz/analytics';
import { makeFmt, nf, shortDate } from '@/features/dashboard/components/viz/format';
import PanelChrome, { PanelEmpty } from './PanelChrome';

const duration = (mins) => {
  if (mins == null || Number.isNaN(mins) || mins <= 0) return '—';
  const m = Math.round(mins);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h}h ${m % 60}m` : `${h}h`;
};

function Pair({ label, a, b, aText, bText, aLabel, bLabel }) {
  const max = Math.max(a, b, 1e-9);
  return (
    <div className="hb-block">
      <div className="hb-head">{label}</div>
      <div className="hb-line">
        <span>{aLabel}</span>
        <div className="hb-track"><i className="w" style={{ width: `${(a / max) * 100}%` }} /></div>
        <b className="pos">{aText}</b>
      </div>
      <div className="hb-line">
        <span>{bLabel}</span>
        <div className="hb-track"><i className="l" style={{ width: `${(b / max) * 100}%` }} /></div>
        <b className="neg">{bText}</b>
      </div>
    </div>
  );
}

export default function DurationWidget() {
  const { stats, metric, currentR } = useStats();
  const isMoney = metric === '$';
  const fmt = makeFmt(isMoney);
  const s = useMemo(() => (stats?.n ? summarize(stats) : null), [stats]);

  if (!stats || stats.n === 0 || !s) {
    return (
      <PanelChrome title="Habits">
        <PanelEmpty title="No data yet" />
      </PanelChrome>
    );
  }

  const w = stats.avgWinDuration || 0;
  const l = stats.avgLossDuration || 0;
  const delta = stats.durationDelta || 0;
  const verdict =
    delta > 10 ? { t: 'Winners held longer — healthy', c: 'var(--d-win)' }
    : delta < -10 ? { t: 'Losers held longer — tighten exits', c: 'var(--d-loss)' }
    : { t: 'Similar hold time on wins and losses', c: 'var(--accent)' };

  const avgWin = s.avgWin || (isMoney ? 0 : currentR);
  const avgLoss = s.avgLoss || (isMoney ? 0 : 1);

  return (
    <PanelChrome title="Habits & payoff" scrollable>
      <div className="hb">
        <Pair label="Holding time" a={w} b={l} aLabel="Wins" bLabel="Losses" aText={duration(w)} bText={duration(l)} />
        <Pair
          label={`Payoff${s.payoff ? ` · ${nf(s.payoff)}×` : ''}`}
          a={avgWin}
          b={avgLoss}
          aLabel="Avg win"
          bLabel="Avg loss"
          aText={fmt(avgWin, { sign: false })}
          bText={fmt(-avgLoss, { sign: false })}
        />
        <div className="hb-verdict" style={{ color: verdict.c }}><i style={{ background: verdict.c }} />{verdict.t}</div>
        <div className="hb-extremes">
          <div>
            <span>Best trade</span>
            <b className="pos">{s.best ? fmt(s.best.score) : '—'}</b>
            <em>{s.best ? shortDate(s.best.date) : ''}</em>
          </div>
          <div>
            <span>Worst trade</span>
            <b className="neg">{s.worst ? fmt(s.worst.score) : '—'}</b>
            <em>{s.worst ? shortDate(s.worst.date) : ''}</em>
          </div>
        </div>
      </div>
    </PanelChrome>
  );
}
