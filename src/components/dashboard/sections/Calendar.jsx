// src/components/dashboard/sections/Calendar.jsx
import { useState, useMemo, useEffect, Fragment } from 'react';
import { useStats } from '../../../hooks/useStats';

/* ------------------------------------------------------------------ */
/*  Formatters                                                         */
/* ------------------------------------------------------------------ */
const formatR = (v) => (v >= 0 ? '+' : '') + v.toFixed(2) + 'R';
const formatMoney = (v) => {
  const sign = v >= 0 ? '+' : '-';
  return `${sign}$${Math.abs(v).toFixed(2)}`;
};

/* ------------------------------------------------------------------ */
/*  Solid color blending — KPI base #11151F mixed with win/loss tint   */
/* ------------------------------------------------------------------ */
const BASE_RGB = [17, 21, 31];       // #11151F  (same solid base as KPI cards)
const WIN_RGB  = [32, 201, 151];     // old calendar mint
const LOSS_RGB = [255, 77, 77];      // old calendar red
const BE_RGB   = [143, 155, 186];    // old calendar blue-gray

/* Returns an [r, g, b] array */
const mixRgb = (a, b, t) => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];
const rgbCss = (arr) => `rgb(${arr[0]}, ${arr[1]}, ${arr[2]})`;

const colorForR = (v) =>
  v > 0 ? rgbCss(WIN_RGB)
  : v < 0 ? rgbCss(LOSS_RGB)
  : rgbCss(BE_RGB);

/* ------------------------------------------------------------------ */
/*  Scoped CSS                                                         */
/* ------------------------------------------------------------------ */
const CAL_CSS = `
  .cal-root {
    --accent: #F59E0B;
    --accent-2: #FDE68A;
    --accent-soft: rgba(245,158,11,.10);
    --accent-soft2: rgba(245,158,11,.28);
    width: 100%;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
  }

  /* ---------- Month tabs ---------- */
  .cal-tabs {
    display: flex;
    gap: 6px;
    overflow-x: auto;
    padding-bottom: 8px;
    margin-bottom: 14px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .cal-tabs::-webkit-scrollbar { display: none; }

  .cal-tab {
    padding: 6px 13px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,.08);
    background: rgba(255,255,255,.025);
    color: #8892A3;
    font-size: 11px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-weight: 500;
    letter-spacing: .02em;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: all .22s cubic-bezier(.2,.8,.25,1);
  }
  .cal-tab:hover {
    color: #E7E9EE;
    background: rgba(255,255,255,.05);
    border-color: rgba(255,255,255,.16);
  }
  .cal-tab.active {
    background: linear-gradient(135deg, var(--accent), var(--accent-2));
    color: #0D1117;
    border-color: transparent;
    font-weight: 700;
    box-shadow:
      0 8px 20px -10px rgba(245,158,11,.6),
      inset 0 1px 0 rgba(255,255,255,.4);
  }

  /* ---------- Grid ---------- */
  .cal-scroll {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    width: 100%;
    padding-bottom: 4px;
  }
  .cal-scroll::-webkit-scrollbar { height: 6px; }
  .cal-scroll::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,.08);
    border-radius: 99px;
  }
  .cal-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(245,158,11,.35);
  }

  .cal-grid {
    display: grid;
    grid-template-columns: repeat(8, minmax(0, 1fr));
    gap: 5px;
    min-width: 620px;
  }

  .cal-dow {
    text-align: center;
    padding: 4px 0 6px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: .08em;
    color: #545E6E;
    text-transform: uppercase;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
  }
  .cal-dow-week {
    color: var(--accent);
    font-weight: 700;
    border-left: 2px solid var(--accent-soft2);
    padding-left: 4px;
  }

  /* ---------- Day cells — solid KPI-card look ---------- */
  .cal-cell {
    min-height: 60px;
    border-radius: 8px;
    padding: 5px 7px;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    border: 1px solid #212836;
    transition: border-color .15s ease;
    cursor: default;
  }
  .cal-cell:not(.cal-cell-empty):hover {
    border-color: #3A4456;
  }
  .cal-cell-empty {
    background: transparent;
    border: 1px dashed rgba(255,255,255,.04);
    min-height: 60px;
  }

  .cal-date {
    font-size: 10px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    color: #545E6E;
    font-weight: 500;
    letter-spacing: .02em;
  }

  .cal-r {
    color: inherit;
    font-weight: 700;
    font-size: 11.5px;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    letter-spacing: -.01em;
  }

  .cal-n {
    font-size: 9px;
    color: #8892A3;
    opacity: .75;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    letter-spacing: .02em;
  }

  /* ---------- Weekly summary cell ---------- */
  .cal-week-cell {
    min-height: 60px;
    border-radius: 8px;
    padding: 5px 7px;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    border: 1px solid #212836;
    border-left: 3px solid var(--accent);
    transition: border-color .15s ease;
    cursor: default;
  }
  .cal-week-cell:hover {
    border-color: #3A4456;
    border-left-color: var(--accent);
  }
  .cal-week-label {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--accent);
    letter-spacing: .08em;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
  }

  /* ---------- Empty state ---------- */
  .cal-empty {
    padding: 44px 20px;
    text-align: center;
    color: #545E6E;
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 12px;
    background: linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,.005));
    border-radius: 14px;
    border: 1px dashed rgba(255,255,255,.08);
    letter-spacing: .02em;
  }
  .cal-empty-icon {
    font-size: 22px;
    margin-bottom: 8px;
    opacity: .6;
  }
`;

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function Calendar() {
  const { stats, metric } = useStats();
  const isMoney = metric === '$';
  const fmt = isMoney ? formatMoney : formatR;
  const [selectedMonth, setSelectedMonth] = useState(null);

  const months = useMemo(() => {
    if (!stats || !stats.outcomes || stats.outcomes.length === 0) return [];
    return [...new Set(stats.outcomes.map((o) => o.date?.slice(0, 7)))]
      .filter(Boolean)
      .sort();
  }, [stats]);

  useEffect(() => {
    if (months.length > 0 && (selectedMonth === null || !months.includes(selectedMonth))) {
      setSelectedMonth(months[months.length - 1]);
    }
  }, [months, selectedMonth]);

  const byDate = useMemo(() => {
    if (!stats || !stats.outcomes) return new Map();
    const map = new Map();
    stats.outcomes.forEach((o) => {
      if (!o.date) return;
      if (!map.has(o.date)) map.set(o.date, { v: 0, n: 0 });
      const d = map.get(o.date);
      d.v += o.score ?? 0;
      d.n += 1;
    });
    return map;
  }, [stats]);

  const calendarData = useMemo(() => {
    if (!selectedMonth || !byDate.size) return null;
    const [y, mo] = selectedMonth.split('-').map(Number);
    const firstDay = new Date(y, mo - 1, 1);
    const daysInMonth = new Date(y, mo, 0).getDate();
    const startOffset = firstDay.getDay();
    const maxAbs = Math.max(1, ...[...byDate.values()].map((d) => Math.abs(d.v)));

    const days = [];
    let weekV = 0, weekN = 0;
    const weeks = [];

    for (let i = 0; i < startOffset; i++) days.push({ date: null, empty: true });

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const info = byDate.get(dateStr);
      let v = 0, n = 0;
      if (info) { v = info.v; n = info.n; weekV += v; weekN += n; }
      days.push({ date: dateStr, day: d, v, n, empty: false });
      const dow = (startOffset + d - 1) % 7;
      if (dow === 6 || d === daysInMonth) {
        weeks.push({ weekV, weekN });
        weekV = 0; weekN = 0;
      }
    }

    const cells = [];
    let dayIndex = 0;
    for (let w = 0; w < weeks.length; w++) {
      const week = weeks[w];
      const weekRow = [];
      for (let i = 0; i < 7; i++) {
        weekRow.push(days[dayIndex] || { empty: true });
        dayIndex++;
      }
      cells.push({ days: weekRow, weekV: week.weekV, weekN: week.weekN });
    }
    return { cells, maxAbs };
  }, [selectedMonth, byDate]);

  if (!stats || !stats.outcomes || stats.outcomes.length === 0 || months.length === 0 || !calendarData) {
    return (
      <>
        <style>{CAL_CSS}</style>
        <div className="cal-root">
          <div className="cal-empty">
            <div className="cal-empty-icon">📅</div>
            No calendar performance data available.
          </div>
        </div>
      </>
    );
  }

  const { cells, maxAbs } = calendarData;

  return (
    <>
      <style>{CAL_CSS}</style>
      <div className="cal-root">
        {/* Month tabs */}
        <div className="cal-tabs">
          {months.map((m) => {
            const [y, mo] = m.split('-');
            const label = new Date(y, mo - 1, 1).toLocaleString('en-US', {
              month: 'short',
              year: '2-digit',
            });
            const isActive = m === selectedMonth;
            return (
              <button
                key={m}
                className={`cal-tab ${isActive ? 'active' : ''}`}
                onClick={() => setSelectedMonth(m)}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Grid */}
        <div className="cal-scroll">
          <div className="cal-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="cal-dow">{d}</div>
            ))}
            <div className="cal-dow cal-dow-week">Week</div>

            {cells.map((cell, idx) => {
              const { days: dayCells, weekV, weekN } = cell;

              /* Weekly cell — solid tint, matching KPI opacity */
              const weekTint = !weekN
                ? BASE_RGB
                : weekV > 0
                  ? mixRgb(BASE_RGB, WIN_RGB, 0.22)
                  : weekV < 0
                    ? mixRgb(BASE_RGB, LOSS_RGB, 0.22)
                    : mixRgb(BASE_RGB, BE_RGB, 0.16);
              const weekBg = rgbCss(weekTint);
              const weekColor = weekN ? colorForR(weekV) : '#8892A3';

              return (
                <Fragment key={`week-row-${idx}`}>
                  {dayCells.map((day, i) => {
                    if (day.empty) {
                      return (
                        <div
                          key={`empty-${idx}-${i}`}
                          className="cal-cell cal-cell-empty"
                        />
                      );
                    }

                    const intensity = day.n ? Math.min(1, Math.abs(day.v) / maxAbs) : 0;

                    /* Solid tint from base #11151F toward win/loss */
                    let cellBg = rgbCss(BASE_RGB);
                    if (day.n) {
                      const target = day.v > 0 ? WIN_RGB : day.v < 0 ? LOSS_RGB : BE_RGB;
                      const ratio = 0.06 + intensity * 0.24;  /* 0.06 → 0.30 */
                      cellBg = rgbCss(mixRgb(BASE_RGB, target, ratio));
                    }
                    const dayColor = day.n ? colorForR(day.v) : '#8892A3';

                    return (
                      <div
                        key={`day-${day.date || i}`}
                        className="cal-cell"
                        style={{ backgroundColor: cellBg }}
                      >
                        <div className="cal-date">{day.day}</div>
                        {day.n > 0 && (
                          <div style={{ marginTop: 'auto' }}>
                            <div className="cal-r" style={{ color: dayColor }}>
                              {fmt(day.v)}
                            </div>
                            <div className="cal-n">{day.n}t</div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div
                    className="cal-week-cell"
                    style={{ backgroundColor: weekBg }}
                  >
                    <div className="cal-week-label">W{idx + 1}</div>
                    <div style={{ marginTop: 'auto' }}>
                      <div className="cal-r" style={{ color: weekColor }}>
                        {weekN ? fmt(weekV) : '—'}
                      </div>
                      {weekN > 0 && <div className="cal-n">{weekN}t</div>}
                    </div>
                  </div>
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}