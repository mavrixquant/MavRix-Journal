import { useState, useMemo, useEffect, Fragment } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStats } from '@/features/dashboard/hooks/useStats';
import { PanelEmpty } from './PanelChrome';

const formatR = (v) => (v >= 0 ? '+' : '') + v.toFixed(2) + 'R';
const formatMoney = (v) => `${v >= 0 ? '+' : '-'}$${Math.abs(v).toFixed(2)}`;

const BASE_RGB = [15, 19, 28];
const WIN_RGB = [53, 196, 161];
const LOSS_RGB = [255, 92, 92];
const BE_RGB = [136, 146, 163];

const mixRgb = (a, b, t) => a.map((c, i) => Math.round(c + (b[i] - c) * t));
const rgbCss = (arr) => `rgb(${arr[0]}, ${arr[1]}, ${arr[2]})`;
const toneColor = (v) => (v > 0 ? '#35C4A1' : v < 0 ? '#FF5C5C' : '#8892A3');

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const CAL_CSS = `
  .cx { width: 100%; font-family: var(--d-sans); }

  .cx-bar {
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; flex-wrap: wrap; margin-bottom: 12px;
  }
  .cx-nav { display: flex; align-items: center; gap: 6px; }
  .cx-navbtn {
    display: inline-flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; border-radius: 8px;
    background: rgba(255,255,255,.035); border: 1px solid var(--d-line);
    color: var(--d-ink-2); cursor: pointer; transition: all .15s ease;
  }
  .cx-navbtn:hover:not(:disabled) { color: var(--d-ink); border-color: var(--d-line-strong); background: rgba(255,255,255,.07); }
  .cx-navbtn:disabled { opacity: .3; cursor: not-allowed; }
  .cx-month { font-size: 15px; font-weight: 700; letter-spacing: -.01em; min-width: 132px; text-align: center; color: var(--d-ink); }
  .cx-latest {
    margin-left: 4px; padding: 0 10px; height: 28px; border-radius: 8px;
    font-family: var(--d-mono); font-size: 10.5px; font-weight: 600;
    color: var(--accent); background: color-mix(in srgb, var(--accent) 8%, transparent);
    border: 1px solid var(--accent-soft2); cursor: pointer;
  }
  .cx-latest:hover { background: color-mix(in srgb, var(--accent) 16%, transparent); }

  .cx-stats { display: flex; gap: 6px; flex-wrap: wrap; }
  .cx-stat {
    display: inline-flex; align-items: baseline; gap: 6px;
    padding: 4px 10px; border-radius: 999px;
    background: rgba(255,255,255,.035); border: 1px solid var(--d-line);
    font-family: var(--d-mono); font-size: 10.5px; color: var(--d-ink-3);
  }
  .cx-stat b { font-size: 11.5px; font-weight: 700; color: var(--d-ink); }

  .cx-scroll { overflow-x: auto; width: 100%; padding-bottom: 4px; }
  .cx-scroll::-webkit-scrollbar { height: 6px; }
  .cx-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,.08); border-radius: 99px; }

  .cx-grid {
    display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)) minmax(78px, 1.05fr);
    gap: 6px; min-width: 600px;
  }

  .cx-dow {
    text-align: center; padding: 2px 0 6px;
    font-family: var(--d-mono); font-size: 9.5px; font-weight: 600;
    letter-spacing: .1em; text-transform: uppercase; color: var(--d-ink-3);
  }
  .cx-dow.is-week { color: var(--accent); }

  .cx-cell {
    position: relative; min-height: 62px; padding: 6px 8px;
    display: flex; flex-direction: column; justify-content: space-between;
    border-radius: 10px; border: 1px solid var(--d-line);
    transition: border-color .15s ease, transform .15s ease;
    cursor: default; box-sizing: border-box;
  }
  .cx-cell:not(.is-empty):hover { border-color: var(--d-line-strong); transform: translateY(-1px); }
  .cx-cell.is-empty { background: transparent; border: 1px dashed rgba(255,255,255,.04); }
  .cx-cell.is-today { box-shadow: 0 0 0 1.5px var(--accent) inset; }

  .cx-date { font-family: var(--d-mono); font-size: 10px; font-weight: 600; color: var(--d-ink-3); }
  .cx-cell.is-today .cx-date { color: var(--accent); }
  .cx-val { font-family: var(--d-mono); font-size: 11.5px; font-weight: 700; letter-spacing: -.01em; text-align: right; }
  .cx-n { font-family: var(--d-mono); font-size: 9px; color: var(--d-ink-2); opacity: .8; text-align: right; }

  .cx-week {
    min-height: 62px; padding: 6px 9px; display: flex; flex-direction: column; justify-content: space-between;
    border-radius: 10px; border: 1px solid var(--d-line); border-left: 3px solid var(--accent);
    box-sizing: border-box;
  }
  .cx-week-label {
    font-family: var(--d-mono); font-size: 9px; font-weight: 700;
    letter-spacing: .1em; text-transform: uppercase; color: var(--accent);
  }
`;

export default function Calendar() {
  const { stats, metric } = useStats();
  const isMoney = metric === '$';
  const fmt = isMoney ? formatMoney : formatR;
  const [selectedMonth, setSelectedMonth] = useState(null);

  const months = useMemo(() => {
    if (!stats?.outcomes?.length) return [];
    return [...new Set(stats.outcomes.map((o) => o.date?.slice(0, 7)))].filter(Boolean).sort();
  }, [stats]);

  useEffect(() => {
    if (months.length > 0 && (selectedMonth === null || !months.includes(selectedMonth))) {
      setSelectedMonth(months[months.length - 1]);
    }
  }, [months, selectedMonth]);

  const byDate = useMemo(() => {
    const map = new Map();
    (stats?.outcomes || []).forEach((o) => {
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
    const startOffset = new Date(y, mo - 1, 1).getDay();
    const daysInMonth = new Date(y, mo, 0).getDate();
    const maxAbs = Math.max(1, ...[...byDate.values()].map((d) => Math.abs(d.v)));

    const days = [];
    const weeks = [];
    let weekV = 0;
    let weekN = 0;
    let monthV = 0;
    let monthN = 0;
    let greenDays = 0;
    let tradedDays = 0;

    for (let i = 0; i < startOffset; i++) days.push({ empty: true });

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const info = byDate.get(dateStr);
      let v = 0;
      let n = 0;
      if (info) {
        v = info.v;
        n = info.n;
        weekV += v;
        weekN += n;
        monthV += v;
        monthN += n;
        tradedDays += 1;
        if (v > 0) greenDays += 1;
      }
      days.push({ date: dateStr, day: d, v, n });
      const dow = (startOffset + d - 1) % 7;
      if (dow === 6 || d === daysInMonth) {
        weeks.push({ weekV, weekN });
        weekV = 0;
        weekN = 0;
      }
    }

    const rows = weeks.map((week, w) => ({
      days: Array.from({ length: 7 }, (_, i) => days[w * 7 + i] || { empty: true }),
      ...week,
    }));

    return { rows, maxAbs, monthV, monthN, greenDays, tradedDays };
  }, [selectedMonth, byDate]);

  if (!stats?.outcomes?.length || !months.length || !calendarData) {
    return <PanelEmpty title="No calendar data" hint="Trades will appear here by day" />;
  }

  const { rows, maxAbs, monthV, monthN, greenDays, tradedDays } = calendarData;
  const idx = months.indexOf(selectedMonth);
  const [yy, mm] = selectedMonth.split('-').map(Number);
  const monthLabel = new Date(yy, mm - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const today = todayStr();

  return (
    <>
      <style>{CAL_CSS}</style>
      <div className="cx">
        <div className="cx-bar">
          <div className="cx-nav">
            <button type="button" className="cx-navbtn" disabled={idx <= 0} onClick={() => setSelectedMonth(months[idx - 1])} aria-label="Previous month">
              <ChevronLeft size={15} />
            </button>
            <div className="cx-month">{monthLabel}</div>
            <button type="button" className="cx-navbtn" disabled={idx >= months.length - 1} onClick={() => setSelectedMonth(months[idx + 1])} aria-label="Next month">
              <ChevronRight size={15} />
            </button>
            {idx < months.length - 1 && (
              <button type="button" className="cx-latest" onClick={() => setSelectedMonth(months[months.length - 1])}>
                Latest
              </button>
            )}
          </div>

          <div className="cx-stats">
            <span className="cx-stat">
              Month <b style={{ color: toneColor(monthV) }}>{monthN ? fmt(monthV) : '—'}</b>
            </span>
            <span className="cx-stat">
              Green days <b>{greenDays}/{tradedDays}</b>
            </span>
            <span className="cx-stat">
              Trades <b>{monthN}</b>
            </span>
          </div>
        </div>

        <div className="cx-scroll">
          <div className="cx-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="cx-dow">{d}</div>
            ))}
            <div className="cx-dow is-week">Week</div>

            {rows.map((row, ri) => {
              const weekTint = !row.weekN
                ? BASE_RGB
                : mixRgb(BASE_RGB, row.weekV > 0 ? WIN_RGB : row.weekV < 0 ? LOSS_RGB : BE_RGB, 0.16);

              return (
                <Fragment key={`row-${ri}`}>
                  {row.days.map((day, i) => {
                    if (day.empty) return <div key={`e-${ri}-${i}`} className="cx-cell is-empty" />;

                    let bg = rgbCss(BASE_RGB);
                    if (day.n) {
                      const target = day.v > 0 ? WIN_RGB : day.v < 0 ? LOSS_RGB : BE_RGB;
                      bg = rgbCss(mixRgb(BASE_RGB, target, 0.08 + Math.min(1, Math.abs(day.v) / maxAbs) * 0.3));
                    }

                    return (
                      <div
                        key={day.date}
                        className={`cx-cell${day.date === today ? ' is-today' : ''}`}
                        style={{ backgroundColor: bg }}
                      >
                        <div className="cx-date">{day.day}</div>
                        {day.n > 0 && (
                          <div>
                            <div className="cx-val" style={{ color: toneColor(day.v) }}>{fmt(day.v)}</div>
                            <div className="cx-n">{day.n} trade{day.n > 1 ? 's' : ''}</div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="cx-week" style={{ backgroundColor: rgbCss(weekTint) }}>
                    <div className="cx-week-label">W{ri + 1}</div>
                    <div>
                      <div className="cx-val" style={{ color: row.weekN ? toneColor(row.weekV) : '#8892A3' }}>
                        {row.weekN ? fmt(row.weekV) : '—'}
                      </div>
                      {row.weekN > 0 && <div className="cx-n">{row.weekN} trades</div>}
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
