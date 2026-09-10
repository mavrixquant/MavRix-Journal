// src/components/dashboard/sections/DurationWidget.jsx
import { useStats } from '../../../hooks/useStats';

const formatDuration = (mins) => {
  if (mins == null || Number.isNaN(mins) || mins <= 0) return '—';
  const m = Math.round(mins);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
};

const COLORS = {
  win: '#35C4A1',
  loss: '#FF5C5C',
  amber: '#FFB020',
  text: '#8892A3',
  textMuted: '#545E6E',
  textLight: '#E7E9EE',
  grid: '#1A2029',
};

export default function DurationWidget() {
  const { stats } = useStats();

  if (!stats || stats.n === 0) return null;

  const w = stats.avgWinDuration || 0;
  const l = stats.avgLossDuration || 0;
  const delta = stats.durationDelta || 0;
  const max = Math.max(w, l, 1);

  const wPct = (w / max) * 100;
  const lPct = (l / max) * 100;

  // Interpretation: 
  //   delta > 10  → winners held longer (healthy)
  //   delta < -10 → losers held longer (bad)
  //   else        → balanced
  const verdict =
    delta > 10  ? { text: 'Winners held longer — healthy', color: COLORS.win } :
    delta < -10 ? { text: 'Losers held longer — reduce exits', color: COLORS.loss } :
    { text: 'Held similar duration', color: COLORS.amber };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', fontWeight: '600', color: COLORS.text, letterSpacing: '0.02em', textTransform: 'uppercase' }}>
          Holding Time — Winners vs Losers
        </span>
      </div>

      {/* Bar comparison */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Winners bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', color: COLORS.text, minWidth: '60px', fontFamily: "'IBM Plex Mono', monospace" }}>Winners</span>
          <div style={{ flex: 1, height: '10px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '5px', overflow: 'hidden', position: 'relative' }}>
            <div style={{
              width: `${wPct}%`,
              height: '100%',
              background: COLORS.win,
              borderRadius: '5px',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <span style={{ fontSize: '11px', color: COLORS.win, minWidth: '56px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontWeight: '600' }}>
            {formatDuration(w)}
          </span>
        </div>

        {/* Losers bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '11px', color: COLORS.text, minWidth: '60px', fontFamily: "'IBM Plex Mono', monospace" }}>Losers</span>
          <div style={{ flex: 1, height: '10px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '5px', overflow: 'hidden', position: 'relative' }}>
            <div style={{
              width: `${lPct}%`,
              height: '100%',
              background: COLORS.loss,
              borderRadius: '5px',
              transition: 'width 0.3s ease',
            }} />
          </div>
          <span style={{ fontSize: '11px', color: COLORS.loss, minWidth: '56px', textAlign: 'right', fontFamily: "'IBM Plex Mono', monospace", fontWeight: '600' }}>
            {formatDuration(l)}
          </span>
        </div>
      </div>

      {/* Verdict */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '8px 12px', borderRadius: '8px',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: verdict.color, flexShrink: 0 }} />
        <span style={{ fontSize: '11px', color: verdict.color, fontWeight: '500', lineHeight: '1.4' }}>
          {verdict.text}
        </span>
      </div>
    </div>
  );
}