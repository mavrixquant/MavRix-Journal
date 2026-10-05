// apps/web/src/features/utilities/gex/components/GexLevelChart.jsx
//
// Price-ladder list for a day's GEX / BL levels.
//
// Design rationale:
//   Levels are support/resistance prices — a *value* chart (line, bar) would
//   just show one dot per price with no useful shape. A sorted ladder is the
//   canonical GEX view: highest price at the top, lowest at the bottom, so
//   clustering and gaps are read instantly.
//
//   The 3-column layout (price / type chip / label) puts the numbers on a
//   fixed-width mono rail so the decimal points line up down the column —
//   the same trick trading terminals use for P&L columns.

import { useMemo } from 'react';

/* ------------------------------------------------------------------ */
/*  Type → color map (matches the admin form + user-facing legend)     */
/* ------------------------------------------------------------------ */
const TYPE_COLORS = {
  BL:    { fg: '#F59E0B', bg: 'rgba(245,158,11,.12)',  border: 'rgba(245,158,11,.40)' },
  GEX:   { fg: '#60A5FA', bg: 'rgba(96,165,250,.12)',  border: 'rgba(96,165,250,.40)' },
  OTHER: { fg: '#8892A3', bg: 'rgba(255,255,255,.05)', border: 'rgba(255,255,255,.15)' },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */
function formatPrice(n) {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function colorFor(type) {
  return TYPE_COLORS[type] || TYPE_COLORS.OTHER;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function GexLevelChart({ levels = [] }) {
  // Newest / highest-price first.
  const sorted = useMemo(
    () => [...levels].sort((a, b) => b.price - a.price),
    [levels]
  );

  const range = useMemo(() => {
    if (sorted.length === 0) return null;
    const prices = sorted.map((l) => l.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    return { min, max, spread: max - min };
  }, [sorted]);

  if (sorted.length === 0) {
    return (
      <div className="gxl-empty">
        No price levels recorded for this day.
      </div>
    );
  }

  return (
    <div className="gxl-root">

      {/* ---------- Range header ---------- */}
      <div className="gxl-head">
        <span className="gxl-head-label">Price range</span>
        <span className="gxl-head-range">
          <b>{formatPrice(range.min)}</b>
          <span className="gxl-head-arrow">→</span>
          <b>{formatPrice(range.max)}</b>
          {range.spread > 0 && (
            <span className="gxl-head-spread">
              ({formatPrice(range.spread)} spread)
            </span>
          )}
        </span>
      </div>

      {/* ---------- Ladder ---------- */}
      <ul className="gxl-list">
        {sorted.map((level, i) => {
          const c = colorFor(level.type);
          return (
            <li key={`${level.price}-${i}`} className="gxl-row">
              <span className="gxl-price">{formatPrice(level.price)}</span>
              <span
                className="gxl-chip"
                style={{
                  color: c.fg,
                  background: c.bg,
                  borderColor: c.border,
                }}
              >
                {level.type}
              </span>
              <span className="gxl-label" title={level.label}>
                {level.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}