// apps/web/src/features/charts/components/IndicatorOverlay.jsx
//
// Toggle buttons for chart overlays.

const TOGGLES = [
  { key: 'ema20', label: 'EMA 20', color: '#F59E0B' },
  { key: 'ema50', label: 'EMA 50', color: '#4C8BF5' },
  { key: 'vwap',  label: 'VWAP',   color: '#A78BFA' },
  { key: 'bb',    label: 'BB (20,2)', color: '#8892A3' },
];

export default function IndicatorOverlay({ indicators, onToggle }) {
  return (
    <div className="ind-root">
      <span className="ind-label">Indicators</span>
      {TOGGLES.map((t) => {
        const active = indicators[t.key];
        return (
          <button
            key={t.key}
            type="button"
            className={`ind-toggle${active ? ' is-active' : ''}`}
            onClick={() => onToggle(t.key)}
            aria-pressed={active}
          >
            <span className="ind-dot" style={{ background: t.color }} />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}