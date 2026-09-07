// src/components/dashboard/charts/EquityChart.jsx
import { Line } from 'react-chartjs-2';
import { useStats } from '../../../hooks/useStats';

const COLORS = {
  amber: '#FFB020',
  grid: '#1A2029',
  text: '#8892A3',
};

export default function EquityChart() {
  const { stats } = useStats();

  // If no trades, show a placeholder
  if (!stats || stats.equity.length === 0) {
    return <div style={{ color: 'var(--text-faint)', textAlign: 'center', paddingTop: '40px' }}>No data</div>;
  }

  const labels = stats.equity.map((_, i) => i + 1);
  const data = stats.equity.map(e => e.y);

  const chartData = {
    labels,
    datasets: [
      {
        data,
        borderColor: COLORS.amber,
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 220);
          gradient.addColorStop(0, 'rgba(255,176,32,0.35)');
          gradient.addColorStop(1, 'rgba(255,176,32,0.0)');
          return gradient;
        },
        fill: true,
        tension: 0.25,
        pointRadius: 0,
        pointHoverRadius: 4,
        borderWidth: 2,
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
          title: (items) => {
            const idx = items[0].dataIndex;
            return stats.equity[idx] ? stats.equity[idx].x : '';
          },
          label: (item) => {
            const val = item.parsed.y;
            return (val >= 0 ? '+' : '') + val.toFixed(2) + 'R';
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: COLORS.grid },
        ticks: { display: false },
      },
      y: {
        grid: { color: COLORS.grid },
        ticks: {
          color: COLORS.text,
          callback: (v) => v + 'R',
        },
      },
    },
  };

  return <Line data={chartData} options={options} />;
}