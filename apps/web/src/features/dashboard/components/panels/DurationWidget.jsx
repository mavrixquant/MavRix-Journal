import { useStats } from '@/features/dashboard/hooks/useStats';
import PanelChrome, { PanelEmpty } from './PanelChrome';

const formatDuration = (mins) => {
  if (mins == null || Number.isNaN(mins) || mins <= 0) return '—';
  const m = Math.round(mins);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
};

export default function DurationWidget() {
  const { stats } = useStats();

  if (!stats || stats.n === 0) {
    return (
      <PanelChrome title="Holding Time">
        <PanelEmpty title="No data yet" />
      </PanelChrome>
    );
  }

  const w = stats.avgWinDuration || 0;
  const l = stats.avgLossDuration || 0;
  const delta = stats.durationDelta || 0;
  const max = Math.max(w, l, 1);

  const verdict =
    delta > 10
      ? { text: 'Winners held longer — healthy', color: '#35C4A1' }
      : delta < -10
        ? { text: 'Losers held longer — tighten exits', color: '#FF5C5C' }
        : { text: 'Held for a similar duration', color: 'var(--accent)' };

  return (
    <PanelChrome title="Holding Time" note="winners vs losers">
      <div className="dr">
        <div className="dr-row">
          <span className="dr-label">Winners</span>
          <div className="dr-track">
            <div className="dr-fill win" style={{ width: `${(w / max) * 100}%` }} />
          </div>
          <span className="dr-val win">{formatDuration(w)}</span>
        </div>
        <div className="dr-row">
          <span className="dr-label">Losers</span>
          <div className="dr-track">
            <div className="dr-fill loss" style={{ width: `${(l / max) * 100}%` }} />
          </div>
          <span className="dr-val loss">{formatDuration(l)}</span>
        </div>
        <div className="dr-verdict" style={{ color: verdict.color }}>
          <i style={{ background: verdict.color }} />
          {verdict.text}
        </div>
      </div>
    </PanelChrome>
  );
}
