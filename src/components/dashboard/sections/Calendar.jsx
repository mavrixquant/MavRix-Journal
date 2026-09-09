// src/components/dashboard/sections/Calendar.jsx
import { useState, useMemo, useEffect, Fragment } from 'react';
import { useStats } from '../../../hooks/useStats';

const formatR = (v) => (v >= 0 ? '+' : '') + v.toFixed(2) + 'R';
const colorForR = (v) => (v > 0 ? 'var(--win, #20c997)' : v < 0 ? 'var(--loss, #ff4d4d)' : 'var(--be, #8f9bba)');

export default function Calendar() {
  const { stats } = useStats();
  const [selectedMonth, setSelectedMonth] = useState(null);

  const months = useMemo(() => {
    if (!stats || !stats.outcomes || stats.outcomes.length === 0) return [];
    const uniqueMonths = [...new Set(stats.outcomes.map(o => o.date?.slice(0, 7)))].filter(Boolean).sort();
    return uniqueMonths;
  }, [stats]);

  useEffect(() => {
    if (months.length > 0 && (selectedMonth === null || !months.includes(selectedMonth))) {
      setSelectedMonth(months[months.length - 1]);
    }
  }, [months, selectedMonth]);

  const byDate = useMemo(() => {
    if (!stats || !stats.outcomes) return new Map();
    const map = new Map();
    stats.outcomes.forEach(o => {
      if (!o.date) return;
      if (!map.has(o.date)) map.set(o.date, { r: 0, n: 0 });
      const d = map.get(o.date);
      d.r += o.r || 0;
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

    const maxAbs = Math.max(1, ...[...byDate.values()].map(d => Math.abs(d.r)));

    const days = [];
    let weekR = 0, weekN = 0;
    const weeks = [];

    for (let i = 0; i < startOffset; i++) {
      days.push({ date: null, empty: true });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const info = byDate.get(dateStr);
      let r = 0, n = 0;
      if (info) {
        r = info.r;
        n = info.n;
        weekR += r;
        weekN += n;
      }
      days.push({ date: dateStr, day: d, r, n, empty: false });

      const dow = (startOffset + d - 1) % 7;
      if (dow === 6 || d === daysInMonth) {
        weeks.push({ weekR, weekN });
        weekR = 0;
        weekN = 0;
      }
    }

    const cells = [];
    let dayIndex = 0;
    for (let w = 0; w < weeks.length; w++) {
      const week = weeks[w];
      const weekRow = [];
      for (let i = 0; i < 7; i++) {
        const dayData = days[dayIndex] || { empty: true };
        weekRow.push(dayData);
        dayIndex++;
      }
      cells.push({ days: weekRow, weekR: week.weekR, weekN: week.weekN });
    }

    return { cells, maxAbs };
  }, [selectedMonth, byDate]);

  if (!stats || !stats.outcomes || stats.outcomes.length === 0 || months.length === 0 || !calendarData) {
    return (
      <div style={{
        padding: '40px 16px',
        textAlign: 'center',
        color: 'var(--text-dim, #8f9bba)',
        fontFamily: 'var(--mono, monospace)',
        fontSize: '12px',
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: '8px',
        border: '1px dashed var(--border-soft, rgba(255, 255, 255, 0.08))'
      }}>
        No calendar performance data available.
      </div>
    );
  }

  const { cells, maxAbs } = calendarData;

  return (
    <div style={{ width: '100%', overflow: 'hidden' }}>
      {/* Month Selection Tabs */}
      <div 
        className="cal-tabs"
        style={{
          display: 'flex',
          gap: '6px',
          overflowX: 'auto',
          paddingBottom: '8px',
          marginBottom: '12px',
          WebkitOverflowScrolling: 'touch'
        }}
      >
        {months.map(m => {
          const [y, mo] = m.split('-');
          const label = new Date(y, mo - 1, 1).toLocaleString('en-US', { month: 'short', year: '2-digit' });
          const isActive = m === selectedMonth;
          return (
            <button
              key={m}
              className={`cal-tab ${isActive ? 'active' : ''}`}
              onClick={() => setSelectedMonth(m)}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                border: isActive ? '1px solid var(--amber, #ffb020)' : '1px solid var(--border-soft, rgba(255,255,255,0.08))',
                background: isActive ? 'rgba(255, 176, 32, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                color: isActive ? 'var(--amber, #ffb020)' : 'var(--text-dim, #8f9bba)',
                fontSize: '11px',
                fontFamily: 'var(--mono, monospace)',
                fontWeight: isActive ? '600' : '400',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Horizontal Scroll Wrapper to preserve grid readability on small mobile screens */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
        <div 
          className="cal-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(8, minmax(0, 1fr))',
            gap: '4px',
            fontSize: '11px',
            minWidth: '580px'
          }}
        >
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div 
              key={d} 
              className="cal-dow"
              style={{
                textAlign: 'center',
                padding: '4px 0',
                fontSize: '10px',
                fontWeight: '600',
                color: 'var(--text-dim, #8f9bba)',
                textTransform: 'uppercase'
              }}
            >
              {d}
            </div>
          ))}
          <div 
            className="cal-dow cal-dow-week"
            style={{
              textAlign: 'center',
              padding: '4px 0',
              fontSize: '10px',
              fontWeight: '700',
              color: 'var(--amber, #ffb020)',
              textTransform: 'uppercase',
              borderLeft: '1px solid var(--border-soft, rgba(255,255,255,0.08))'
            }}
          >
            Week
          </div>

          {cells.map((cell, idx) => {
            const { days: dayCells, weekR, weekN } = cell;
            const weekBg = !weekN ? 'rgba(255, 255, 255, 0.01)' :
              weekR > 0 ? 'rgba(32, 201, 151, 0.12)' :
              weekR < 0 ? 'rgba(255, 77, 77, 0.12)' :
              'rgba(143, 155, 186, 0.1)';
            const weekColor = weekN ? colorForR(weekR) : 'var(--text-dim, #8f9bba)';

            return (
              <Fragment key={`week-row-${idx}`}>
                {dayCells.map((day, i) => {
                  if (day.empty) {
                    return (
                      <div 
                        key={`empty-${idx}-${i}`} 
                        className="cal-cell empty"
                        style={{
                          minHeight: '56px',
                          borderRadius: '5px',
                          background: 'rgba(255, 255, 255, 0.01)',
                        }}
                      />
                    );
                  }

                  const intensity = day.n ? Math.min(1, Math.abs(day.r) / maxAbs) : 0;
                  const alpha = 0.08 + intensity * 0.42;
                  const bg = day.r > 0 ? `rgba(32, 201, 151, ${alpha})` :
                             day.r < 0 ? `rgba(255, 77, 77, ${alpha})` :
                             `rgba(143, 155, 186, ${alpha})`;
                  const dayColor = day.n ? colorForR(day.r) : 'var(--text-dim, #8f9bba)';

                  return (
                    <div 
                      key={`day-${day.date || i}`} 
                      className="cal-cell" 
                      style={{ 
                        background: day.n ? bg : 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-soft, rgba(255, 255, 255, 0.05))',
                        borderRadius: '5px',
                        padding: '4px 6px',
                        minHeight: '56px',
                        display: 'flex',
                        flexDirection: 'column',
                        justify: 'space-between',
                        boxSizing: 'border-box'
                      }}
                    >
                      <div 
                        className="cal-date"
                        style={{
                          fontSize: '10px',
                          fontFamily: 'var(--mono, monospace)',
                          color: 'var(--text-dim, #8f9bba)',
                          fontWeight: '500'
                        }}
                      >
                        {day.day}
                      </div>

                      {day.n > 0 && (
                        <div style={{ marginTop: 'auto' }}>
                          <div 
                            className="cal-r" 
                            style={{ 
                              color: dayColor, 
                              fontWeight: '700', 
                              fontSize: '11px',
                              fontFamily: 'var(--mono, monospace)' 
                            }}
                          >
                            {formatR(day.r)}
                          </div>
                          <div 
                            className="cal-n"
                            style={{
                              fontSize: '9px',
                              color: 'var(--text-dim, #8f9bba)',
                              opacity: 0.8
                            }}
                          >
                            {day.n}t
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Week Summary Column */}
                <div 
                  className="cal-week-cell" 
                  style={{ 
                    background: weekBg,
                    border: '1px solid var(--border-soft, rgba(255, 255, 255, 0.08))',
                    borderRadius: '5px',
                    padding: '4px 6px',
                    minHeight: '56px',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between',
                    boxSizing: 'border-box',
                    borderLeft: '2px solid var(--amber, #ffb020)'
                  }}
                >
                  <div 
                    className="cal-week-label"
                    style={{
                      fontSize: '9px',
                      fontWeight: '600',
                      textTransform: 'uppercase',
                      color: 'var(--amber, #ffb020)',
                    }}
                  >
                    W{idx + 1}
                  </div>

                  <div style={{ marginTop: 'auto' }}>
                    <div 
                      className="cal-r" 
                      style={{ 
                        color: weekColor, 
                        fontWeight: '700', 
                        fontSize: '11px',
                        fontFamily: 'var(--mono, monospace)' 
                      }}
                    >
                      {weekN ? formatR(weekR) : '—'}
                    </div>
                    {weekN > 0 && (
                      <div 
                        className="cal-n"
                        style={{
                          fontSize: '9px',
                          color: 'var(--text-dim, #8f9bba)',
                          opacity: 0.8
                        }}
                      >
                        {weekN}t
                      </div>
                    )}
                  </div>
                </div>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}