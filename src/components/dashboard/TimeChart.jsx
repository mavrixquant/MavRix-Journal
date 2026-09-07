// src/components/dashboard/TimeChart.jsx
import { Bar } from 'react-chartjs-2';
import { useMemo } from 'react';
import { useStats } from '../../hooks/useStats';

const COLORS = {
  blue: '#4C8BF5',
  amber: '#FFB020',
  text: '#8892A3',
  grid: '#1A2029',
};

export default function TimeChart() {
  const { stats, groupBy } = useStats();

  // Get time buckets in sorted order
  const timeData = useMemo(() => {
    if (!stats || stats.outcomes.length === 0) return [];

    // Get all buckets from the outcomes
    const buckets = [...new Set(stats.outcomes.map(o => o.bucket))].sort();
    const data = groupBy(o => o.bucket, buckets);
    return data;
  }, [stats, groupBy]);

  if (!timeData || timeData.length === 0) {
    return (
      <div style={{ color: 'var(--text-faint)', textAlign: 'center', paddingTop: '40px', height: '100%' }}>
        No time data available
      </div>
    );
  }

  const chartData = {
    labels: timeData.map(d => d.label),
    datasets: [
      {
        type: 'bar',
        label: 'Trades',
        data: timeData.map(d => d.n),
        backgroundColor: COLORS.blue + '99',
        borderRadius: 4,
        yAxisID: 'y',
        order: 2,
        barPercentage: 0.8,
      },
      {
        type: 'line',
        label: 'Win Rate %',
        data: timeData.map(d => +d.winRate.toFixed(1)),
        borderColor: COLORS.amber,
        backgroundColor: COLORS.amber,
        yAxisID: 'y1',
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: COLORS.amber,
        order: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: COLORS.text },
      },
      tooltip: {
        callbacks: {
          afterLabel: (item) => {
            const d = timeData[item.dataIndex];
            return item.dataset.label === 'Trades' ? `Total R: ${(d.totalR >= 0 ? '+' : '') + d.totalR.toFixed(2)}R` : '';
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: COLORS.text,
          maxRotation: 60,
          minRotation: 60,
          font: { size: 9 },
        },
      },
      y: {
        position: 'left',
        grid: { color: COLORS.grid },
        title: {
          display: true,
          text: 'Trade Count',
          color: COLORS.text,
        },
        ticks: { color: COLORS.text, precision: 0 },
      },
      y1: {
        position: 'right',
        grid: { display: false },
        min: 0,
        max: 100,
        title: {
          display: true,
          text: 'Win %',
          color: COLORS.amber,
        },
        ticks: { color: COLORS.amber },
      },
    },
  };

  return <Bar data={chartData} options={options} />;
}