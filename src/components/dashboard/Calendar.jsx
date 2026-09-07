// src/components/dashboard/Calendar.jsx
import { useState, useMemo } from 'react';
import { useStats } from '../../hooks/useStats';

const formatR = (v) => (v >= 0 ? '+' : '') + v.toFixed(2) + 'R';
const colorForR = (v) => (v > 0 ? 'var(--win)' : v < 0 ? 'var(--loss)' : 'var(--be)');

export default function Calendar() {
  const { stats } = useStats();
  const [selectedMonth, setSelectedMonth] = useState(null);

  // Get all months from trades
  const months = useMemo(() => {
    if (!stats || stats.outcomes.length === 0) return [];
    const uniqueMonths = [...new Set(stats.outcomes.map(o => o.date.slice(0, 7)))].sort();
    return uniqueMonths;
  }, [stats]);

  // Set default month to latest if not set
  if (months.length > 0 && selectedMonth === null) {
    setSelectedMonth(months[months.length - 1]);
  }

  // Group outcomes by date
  const byDate = useMemo(() => {
    if (!stats) return new Map();
    const map = new Map();
    stats.outcomes.forEach(o => {
      if (!map.has(o.date)) map.set(o.date, { r: 0, n: 0 });
      const d = map.get(o.date);
      d.r += o.r;
      d.n += 1;
    });
    return map;
  }, [stats]);

  // Build calendar grid for selected month
  const calendarData = useMemo(() => {
    if (!selectedMonth || !byDate.size) return null;

    const [y, mo] = selectedMonth.split('-').map(Number);
    const firstDay = new Date(y, mo - 1, 1);
    const daysInMonth = new Date(y, mo, 0).getDate();
    const startOffset = firstDay.getDay(); // 0 = Sunday

    const maxAbs = Math.max(1, ...[...byDate.values()].map(d => Math.abs(d.r)));

    // Build array of day objects
    const days = [];
    let weekR = 0, weekN = 0;
    const weeks = [];

    // Fill initial empty cells
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

      // Check if end of week (Saturday) or end of month
      const dow = (startOffset + d - 1) % 7;
      if (dow === 6 || d === daysInMonth) {
        weeks.push({ weekR, weekN });
        weekR = 0;
        weekN = 0;
      }
    }

    // Fill remaining empty cells at end? We already have weeks array.

    // Ensure we have exactly as many weeks as needed
    // We'll pad the last week if needed (already done by push when dow===6 or end)
    // Now build week cells: each week has 7 day cells + 1 week summary cell

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

  // Handle month change
  const handleMonthChange = (month) => {
    setSelectedMonth(month);
  };

  if (!stats || stats.outcomes.length === 0 || months.length === 0 || !calendarData) {
    return <div style={{ color: 'var(--text-faint)', padding: '20px', textAlign: 'center' }}>No calendar data</div>;
  }

  const { cells, maxAbs } = calendarData;

  return (
    <div>
      {/* Month tabs */}
      <div className="cal-tabs">
        {months.map(m => {
          const [y, mo] = m.split('-');
          const label = new Date(y, mo - 1, 1).toLocaleString('en-US', { month: 'short', year: '2-digit' });
          return (
            <button
              key={m}
              className={`cal-tab ${m === selectedMonth ? 'active' : ''}`}
              onClick={() => handleMonthChange(m)}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Calendar grid */}
      <div className="cal-grid">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
          <div key={d} className="cal-dow">{d}</div>
        ))}
        <div className="cal-dow cal-dow-week">Week</div>

        {/* Render each week row */}
        {cells.map((cell, idx) => {
          const { days: dayCells, weekR, weekN } = cell;
          const weekBg = !weekN ? 'transparent' :
            weekR > 0 ? 'rgba(53,196,161,0.16)' :
            weekR < 0 ? 'rgba(255,92,92,0.16)' :
            'rgba(108,118,134,0.14)';
          const weekColor = weekN ? colorForR(weekR) : 'var(--text-faint)';

          return (
            <>
              {dayCells.map((day, i) => {
                if (day.empty) {
                  return <div key={`${idx}-${i}`} className="cal-cell empty"></div>;
                }
                const intensity = day.n ? Math.min(1, Math.abs(day.r) / maxAbs) : 0;
                const alpha = 0.12 + intensity * 0.55;
                const bg = day.r > 0 ? `rgba(53,196,161,${alpha})` :
                           day.r < 0 ? `rgba(255,92,92,${alpha})` :
                           `rgba(108,118,134,${alpha})`;
                const dayColor = day.n ? colorForR(day.r) : 'var(--text-faint)';
                return (
                  <div key={`${idx}-${i}`} className="cal-cell" style={{ background: bg }}>
                    <div className="cal-date">{day.day}</div>
                    {day.n > 0 && <div className="cal-r" style={{ color: dayColor }}>{formatR(day.r)}</div>}
                    {day.n > 0 && <div className="cal-n">{day.n} trade{day.n > 1 ? 's' : ''}</div>}
                  </div>
                );
              })}
              <div className="cal-week-cell" style={{ background: weekBg }}>
                <div className="cal-week-label">Week</div>
                <div className="cal-r" style={{ color: weekColor }}>{weekN ? formatR(weekR) : '—'}</div>
                {weekN > 0 && <div className="cal-n">{weekN} trade{weekN > 1 ? 's' : ''}</div>}
              </div>
            </>
          );
        })}
      </div>
    </div>
  );
}