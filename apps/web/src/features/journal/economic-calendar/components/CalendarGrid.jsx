// apps/web/src/features/journal/economic-calendar/components/CalendarGrid.jsx
//
// Month view: 7-column grid of day cells, each showing up to 4 impact-colored
// dots. Clicking a day calls onDayClick(dateString), which the page uses to
// jump to List view scoped to that single day.
//
// Navigates months with left/right buttons. Never fetches — reads events
// passed in via props, which are already filtered by the filter bar.

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Scoped CSS                                                         */
/* ------------------------------------------------------------------ */

const CSS = `
  .cg-root {
    --accent: #F59E0B;
    --accent-2: #FDE68A;
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;
    --impact-high: #F59E0B;
    --impact-medium: #60A5FA;
    --impact-low: #545E6E;
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
  }
  .cg-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
  }
  .cg-month {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--ink-1);
  }
  .cg-nav {
    display: inline-flex;
    gap: 4px;
  }
  .cg-nav-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,.1);
    background: rgba(255,255,255,.03);
    color: var(--ink-2);
    cursor: pointer;
    transition: all .18s;
  }
  .cg-nav-btn:hover {
    color: var(--accent);
    border-color: rgba(245,158,11,.35);
    background: rgba(245,158,11,.06);
  }
  .cg-dow-row {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
    margin-bottom: 6px;
  }
  .cg-dow {
    text-align: center;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9.5px;
    font-weight: 700;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--ink-3);
    padding: 4px 0;
  }
  .cg-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px;
  }
  .cg-cell {
    aspect-ratio: 1 / 1;
    border-radius: 10px;
    border: 1px solid var(--line-soft);
    background: rgba(255,255,255,.015);
    padding: 7px 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    cursor: pointer;
    transition: all .18s cubic-bezier(.2,.8,.25,1);
    position: relative;
    overflow: hidden;
    text-align: left;
  }
  .cg-cell:hover {
    border-color: rgba(245,158,11,.35);
    background: rgba(245,158,11,.04);
    transform: translateY(-1px);
  }
  .cg-cell.is-today {
    border-color: rgba(245,158,11,.55);
    box-shadow: 0 0 0 1px rgba(245,158,11,.35);
  }
  .cg-cell.is-outside {
    opacity: .35;
    cursor: default;
  }
  .cg-cell.is-outside:hover {
    border-color: var(--line-soft);
    background: rgba(255,255,255,.015);
    transform: none;
  }
  .cg-day-num {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    font-weight: 700;
    color: var(--ink-1);
    line-height: 1;
  }
  .cg-cell.is-today .cg-day-num {
    color: var(--accent);
  }
  .cg-dots {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    margin-top: auto;
  }
  .cg-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .cg-dot.high   { background: var(--impact-high);   box-shadow: 0 0 6px rgba(245,158,11,.55); }
  .cg-dot.medium { background: var(--impact-medium); }
  .cg-dot.low    { background: var(--impact-low); }
  .cg-more {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9px;
    color: var(--ink-2);
    line-height: 1;
    margin-left: 2px;
  }
  .cg-count {
    position: absolute;
    top: 5px;
    right: 6px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 9px;
    font-weight: 600;
    color: var(--ink-3);
  }
  @media (prefers-reduced-motion: reduce) {
    .cg-cell { transition: none !important; }
  }
`;

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const IMPACT_ORDER = { high: 0, medium: 1, low: 2 };
const MAX_DOTS = 4;

/* ------------------------------------------------------------------ */
/*  Date utilities                                                     */
/* ------------------------------------------------------------------ */

function toIsoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function sameDayIso(a, b) {
  return toIsoDate(a) === toIsoDate(b);
}

function buildMonthMatrix(year, month) {
  // Returns an array of 35 or 42 { date, iso, isOutside } cells.
  // First cell is the Sunday on/before the 1st of the month.
  const first = new Date(year, month, 1);
  const startOffset = first.getDay(); // 0..6, 0 = Sunday
  const cells = [];

  const gridStart = new Date(year, month, 1 - startOffset);

  // Determine how many weeks to show (5 or 6)
  const lastOfMonth = new Date(year, month + 1, 0);
  const totalDays = startOffset + lastOfMonth.getDate();
  const weeks = Math.ceil(totalDays / 7);
  const cellCount = weeks * 7;

  for (let i = 0; i < cellCount; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push({
      date: d,
      iso: toIsoDate(d),
      isOutside: d.getMonth() !== month,
    });
  }
  return cells;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CalendarGrid({ events = [], onDayClick }) {
  // Anchor for the currently visible month. Defaults to today.
  const [anchor, setAnchor] = useState(() => new Date());

  const today = useMemo(() => new Date(), []);

  // Group events by ISO date, keeping only their impact for the dots.
  const byDate = useMemo(() => {
    const map = new Map();
    for (const e of events) {
      if (!e.date) continue;
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date).push(e);
    }
    return map;
  }, [events]);

  const cells = useMemo(
    () => buildMonthMatrix(anchor.getFullYear(), anchor.getMonth()),
    [anchor]
  );

  const monthLabel = anchor.toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const goPrev = () => {
    setAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const goNext = () => {
    setAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="cg-root">
        <div className="cg-head">
          <div className="cg-month">{monthLabel}</div>
          <div className="cg-nav">
            <button
              type="button"
              className="cg-nav-btn"
              onClick={goPrev}
              aria-label="Previous month"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              className="cg-nav-btn"
              onClick={goNext}
              aria-label="Next month"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div className="cg-dow-row">
          {DOW_LABELS.map((d) => (
            <div key={d} className="cg-dow">{d}</div>
          ))}
        </div>

        <div className="cg-grid">
          {cells.map((cell) => {
            const dayEvents = byDate.get(cell.iso) || [];

            // Sort by impact so high-impact dots appear first when the day
            // has more events than we can display.
            const sorted = [...dayEvents].sort((a, b) => {
              const ra = IMPACT_ORDER[a.impact] ?? 99;
              const rb = IMPACT_ORDER[b.impact] ?? 99;
              return ra - rb;
            });

            const visible = sorted.slice(0, MAX_DOTS);
            const overflow = sorted.length - visible.length;

            const isToday = sameDayIso(cell.date, today);
            const classNames = [
              'cg-cell',
              cell.isOutside ? 'is-outside' : '',
              isToday ? 'is-today' : '',
            ]
              .filter(Boolean)
              .join(' ');

            return (
              <button
                key={cell.iso}
                type="button"
                className={classNames}
                onClick={() => {
                  if (!cell.isOutside && onDayClick) onDayClick(cell.iso);
                }}
                disabled={cell.isOutside}
              >
                <div className="cg-day-num">{cell.date.getDate()}</div>
                {dayEvents.length > 0 && (
                  <div className="cg-count">{dayEvents.length}</div>
                )}
                <div className="cg-dots">
                  {visible.map((e) => (
                    <span
                      key={e.id}
                      className={`cg-dot ${e.impact}`}
                    />
                  ))}
                  {overflow > 0 && (
                    <span className="cg-more">+{overflow}</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}