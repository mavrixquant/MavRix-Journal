// src/components/dashboard/CategoryBarChart.jsx
import { Bar } from 'react-chartjs-2';
import { useMemo } from 'react';

const COLORS = {
  win: '#35C4A1',
  loss: '#FF5C5C',
  text: '#8892A3',
  grid: '#1A2029',
};

export default function CategoryBarChart({ data, label, horizontal = false }) {
  // data is an array of { label, totalR, n, winRate }
  // If no data, show placeholder
  if (!data || data.length === 0) {
    return (
      <div style={{ color: 'var(--text-faint)', textAlign: 'center', paddingTop: '30px', height: '100%' }}>
        No data
      </div>
    );
  }

  const chartData = {
    labels: data.map(d => d.label),
    datasets: [
      {
        data: data.map(d => d.totalR),
        backgroundColor: data.map(d => d.totalR >= 0 ? COLORS.win : COLORS.loss),
        borderRadius: 5,
        barPercentage: 0.7,
      },
    ],
  };

  const options = {
    indexAxis: horizontal ? 'y' : 'x',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          afterLabel: (item) => {
            const d = data[item.dataIndex];
            return `${d.n} trades · ${d.winRate.toFixed(1)}% win`;
          },
          label: (item) => {
            const val = item.parsed[horizontal ? 'x' : 'y'];
            return `Total R: ${(val >= 0 ? '+' : '') + val.toFixed(2)}R`;
          },
        },
      },
    },
    scales: horizontal
      ? {
          x: {
            grid: { color: COLORS.grid },
            ticks: { color: COLORS.text },
          },
          y: {
            grid: { display: false },
            ticks: { color: COLORS.text },
          },
        }
      : {
          x: {
            grid: { display: false },
            ticks: { color: COLORS.text },
          },
          y: {
            grid: { color: COLORS.grid },
            ticks: { color: COLORS.text },
          },
        },
  };

  return <Bar data={chartData} options={options} />;
}