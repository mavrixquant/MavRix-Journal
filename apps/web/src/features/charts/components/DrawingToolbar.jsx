// apps/web/src/features/charts/components/DrawingToolbar.jsx
//
// Drawing tool selector. When a tool is active, chart clicks create drawings.

import { MousePointer2, Minus, TrendingUp, Trash2 } from 'lucide-react';

const TOOLS = [
  { mode: 'none',      icon: MousePointer2, label: 'Pointer' },
  { mode: 'hline',     icon: Minus,         label: 'H-Line' },
  { mode: 'trendline', icon: TrendingUp,    label: 'Trendline' },
];

export default function DrawingToolbar({
  mode,
  onModeChange,
  onClearAll,
  drawingCount,
  pendingFirstPoint,
}) {
  return (
    <div className="dt-root">
      <span className="dt-label">Draw</span>

      {TOOLS.map(({ mode: m, icon: Icon, label }) => (
        <button
          key={m}
          type="button"
          className={`dt-tool${mode === m ? ' is-active' : ''}`}
          onClick={() => onModeChange(m)}
          title={label}
          aria-pressed={mode === m}
        >
          <Icon size={12} />
          <span>{label}</span>
        </button>
      ))}

      {pendingFirstPoint && (
        <span className="dt-hint">Click again to finish</span>
      )}

      <div className="dt-spacer" />

      <button
        type="button"
        className="dt-clear"
        onClick={onClearAll}
        disabled={drawingCount === 0}
        title={drawingCount === 0 ? 'No drawings to clear' : 'Clear all drawings'}
      >
        <Trash2 size={11} />
        <span>Clear {drawingCount > 0 ? `(${drawingCount})` : ''}</span>
      </button>
    </div>
  );
}