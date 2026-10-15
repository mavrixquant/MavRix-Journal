// apps/web/src/features/journal/economic-calendar/components/CalendarGrid.jsx
//
// Month view: 7-column grid of day cells, each showing up to 4 impact-colored
// dots. Clicking a day jumps to List view scoped to that day.
//
// PHASE 2:
//   • Events are bucketed by their day in the user's preferred timezone, so
//     an event that happens "on Oct 15 IST" lands in the Oct 15 cell even if
//     it's Oct 14 UTC.
//   • The month grid is the internal scroll container inside the calendar
//     card; the month nav row stays pinned.

import { useMemo, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSettings } from '@/app/layout/Settings/SettingsProvider';
import { resolveTimezone, dayKey } from '@/shared/format/datetime';

/* ------------------------------------------------------------------ */
/*  Scoped CSS                                                         */
/* ------------------------------------------------------------------ */

const CSS = `
  .cg-root {
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .cg-head {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 18px 10px;
    border-bottom: 1px solid var(--line-soft);
  }
  .cg-month {
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: .06em;
    text-transform: uppercase;
    color: var(--ink-1);
  }
  .cg-nav { display: inline-flex; gap: 4px; }
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
    border-color: color-mix(in srgb, var(--accent) 35%, transparent);
    background: color-mix(in srgb, var(--accent) 6%, transparent);
  }

  .cg-scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    padding: 12px 18px 18px;
    overscroll-behavior: contain;
  }
  .cg-scroll::-webkit-scrollbar { width: 8px; }
  .cg-scroll::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08);
    border-radius: 99px;
  }
  .cg-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(255,255,255,.14);
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
    min-height: 68px;
    max-height: 130px;
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
  .cg-cell:hover:not(.is-outside) {
    border-color: color-mix(in srgb, var(--accent) 35%, transparent);
    background: color-mix(in srgb, var(--accent) 4%, transparent);
    transform: translateY(-1px);
  }
  .cg-cell.is-today {
    border-color: color-mix(in srgb, var(--accent) 55%, transparent);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent);
  }
  .cg-cell.is-outside { opacity: .35; cursor: default; }
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
  .cg-cell.is-today .cg-day-num { color: var(--accent); }
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
  .cg-dot.high   { background: var(--accent); box-shadow: 0 0 6px color-mix(in srgb, var(--accent) 55%, transparent); }
  .cg-dot.medium { background: #60A5FA; }
  .cg-dot.low    { background: #545E6E; }
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
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function buildMonthMatrix(year, month) {
  const first = new Date(year, month - 1, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells = [];
  const gridStart = new Date(year, month - 1, 1 - startOffset);

  const totalDays = startOffset + daysInMonth;
  const weeks = Math.ceil(totalDays / 7);
  const cellCount = weeks * 7;

  for (let i = 0; i < cellCount; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const y = d.getFullYear();
    const mo = d.getMonth() + 1;
    const day = d.getDate();
    cells.push({
      date: d,
      iso: `${y}-${String(mo).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      isOutside: d.getMonth() !== (month - 1),
    });
  }
  return cells;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CalendarGrid({ events = [], onDayClick }) {
  const { settings } = useSettings();
  const timezone = settings.preferences.timezone;
  const tz = useMemo(() => resolveTimezone(timezone), [timezone]);

  const todayKey = useMemo(
    () => dayKey(new Date().toISOString(), tz),
    [tz]
  );

  // Anchor month (year + 1-based month), initialized to the current month
  // in the user's timezone. Re-anchors whenever the tz changes.
  const [anchor, setAnchor] = useState(() => {
    const [y, m] = todayKey.split('-').map(Number);
    return { year: y, month: m };
  });

  useEffect(() => {
    const [y, m] = todayKey.split('-').map(Number);
    setAnchor({ year: y, month: m });
  }, [todayKey]);

  // Bucket events by their tz-day.
  const byDate = useMemo(() => {
    const map = new Map();
    for (const e of events) {
      if (!e.dateTimeUtc) continue;
      const key = dayKey(e.dateTimeUtc, tz);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(e);
    }
    return map;
  }, [events, tz]);

  const cells = useMemo(
    () => buildMonthMatrix(anchor.year, anchor.month),
    [anchor.year, anchor.month]
  );

  const monthLabel = new Date(anchor.year, anchor.month - 1, 1)
    .toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const goPrev = () => {
    setAnchor((prev) => {
      const m = prev.month - 1;
      return m < 1
        ? { year: prev.year - 1, month: 12 }
        : { year: prev.year, month: m };
    });
  };

  const goNext = () => {
    setAnchor((prev) => {
      const m = prev.month + 1;
      return m > 12
        ? { year: prev.year + 1, month: 1 }
        : { year: prev.year, month: m };
    });
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

        <div className="cg-scroll">
          <div className="cg-dow-row">
            {DOW_LABELS.map((d) => (
              <div key={d} className="cg-dow">{d}</div>
            ))}
          </div>

          <div className="cg-grid">
            {cells.map((cell) => {
              const dayEvents = byDate.get(cell.iso) || [];

              const sorted = [...dayEvents].sort((a, b) => {
                const ra = IMPACT_ORDER[a.impact] ?? 99;
                const rb = IMPACT_ORDER[b.impact] ?? 99;
                return ra - rb;
              });

              const visible = sorted.slice(0, MAX_DOTS);
              const overflow = sorted.length - visible.length;

              const isToday = cell.iso === todayKey;
              const classNames = [
                'cg-cell',
                cell.isOutside ? 'is-outside' : '',
                isToday ? 'is-today' : '',
              ].filter(Boolean).join(' ');

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
                      <span key={e.id} className={`cg-dot ${e.impact}`} />
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
      </div>
    </>
  );
}