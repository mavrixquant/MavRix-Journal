// src/components/dashboard/WeeklyChart.jsx
import { Bar } from 'react-chartjs-2';
import { useMemo } from 'react';
import { useStats } from '../../../hooks/useStats';
import { getWeekStart } from '../../../utils/timeHelpers';

const COLORS = {
  win: '#35C4A1',
  loss: '#FF5C5C',
  text: '#8892A3',
  grid: '#1A2029',
};

const formatR = (v) => (v >= 0 ? '+' : '') + v.toFixed(2) + 'R';

export default function WeeklyChart() {
  const { stats } = useStats();

  const weeklyData = useMemo(() => {
    if (!stats || stats.outcomes.length === 0) return null;

    const map = new Map();
    stats.outcomes.forEach(o => {
      const wk = getWeekStart(o.date);
      if (!map.has(wk)) map.set(wk, { r: 0, n: 0, wins: 0 });
      const entry = map.get(wk);
      entry.r += o.r;
      entry.n += 1;
      if (o.result === 'win') entry.wins++;
    });

    const weeks = [...map.keys()].sort();
    const data = weeks.map(w => +map.get(w).r.toFixed(2));
    const labels = weeks.map(w => 'Wk of ' + w.slice(5));

    return { weeks, data, labels, map };
  }, [stats]);

  if (!weeklyData || weeklyData.weeks.length === 0) {
    return <div style={{ color: 'var(--text-faint)', textAlign: 'center', padding: '20px' }}></div>;
  }

  const { weeks, data, labels, map } = weeklyData;

  // Compute summary stats
  const totalWeeks = weeks.length;
  const posWeeks = weeks.filter(w => map.get(w).r > 0).length;
  let bestWeek = null, worstWeek = null;
  weeks.forEach(w => {
    const r = map.get(w).r;
    if (!bestWeek || r > map.get(bestWeek).r) bestWeek = w;
    if (!worstWeek || r < map.get(worstWeek).r) worstWeek = w;
  });

  const chartData = {
    labels,
    datasets: [
      {
        data,
        backgroundColor: data.map(v => v >= 0 ? COLORS.win : COLORS.loss),
        borderRadius: 5,
        barPercentage: 0.7,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (item) => {
            const wk = weeks[item.dataIndex];
            const e = map.get(wk);
            return [`Total R: ${formatR(e.r)}`, `${e.n} trades · ${(e.wins / e.n * 100).toFixed(1)}% win`];
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: COLORS.text,
          maxRotation: 45,
          minRotation: 45,
          font: { size: 9 },
        },
      },
      y: {
        grid: { color: COLORS.grid },
        ticks: {
          color: COLORS.text,
          callback: v => v + 'R',
        },
      },
    },
  };

  return (
    <div>
      {/* <div className="chart-box" style={{ height: '180px' }}>
        <Bar data={chartData} options={options} />
      </div> */}
      <div className="week-summary">
        <div className="week-chip">
          <div className="wk-label">Best Week</div>
          <div className="wk-val" style={{ color: COLORS.win }}>{bestWeek ? formatR(map.get(bestWeek).r) : '—'}</div>
        </div>
        <div className="week-chip">
          <div className="wk-label">Worst Week</div>
          <div className="wk-val" style={{ color: COLORS.loss }}>{worstWeek ? formatR(map.get(worstWeek).r) : '—'}</div>
        </div>
        <div className="week-chip">
          <div className="wk-label">Green Weeks</div>
          <div className="wk-val">{posWeeks} / {totalWeeks}</div>
        </div>
        <div className="week-chip">
          <div className="wk-label">Avg / Week</div>
          <div className="wk-val">{totalWeeks ? formatR(stats.totalR / totalWeeks) : '—'}</div>
        </div>
      </div>
    </div>
  );
}