// src/components/dashboard/RRCompareChart.jsx
import { Bar } from 'react-chartjs-2';
import { useStats } from '../../hooks/useStats';
import { computeStats } from '../../utils/statsEngine';

const RR_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8];
const COLORS = {
  win: '#35C4A1',
  loss: '#FF5C5C',
  amber: '#FFB020',
  text: '#8892A3',
  grid: '#1A2029',
};

export default function RRCompareChart() {
  const { filteredTrades } = useStats();

  // Compute stats for each RR level
  const statsData = RR_LEVELS.map(r => computeStats(filteredTrades, r));

  const totalRData = statsData.map(s => s.totalR);
  const winRateData = statsData.map(s => +s.winRate.toFixed(1));
  const barColors = totalRData.map(v => v >= 0 ? COLORS.win : COLORS.loss);

  const chartData = {
    labels: RR_LEVELS.map(r => `1:${r}`),
    datasets: [
      {
        type: 'bar',
        label: 'Total R',
        data: totalRData,
        backgroundColor: barColors,
        borderRadius: 5,
        yAxisID: 'y',
        order: 2,
        barPercentage: 0.55,
      },
      {
        type: 'line',
        label: 'Win Rate %',
        data: winRateData,
        borderColor: COLORS.amber,
        backgroundColor: COLORS.amber,
        yAxisID: 'y1',
        tension: 0.3,
        pointRadius: 4,
        pointBackgroundColor: COLORS.amber,
        order: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        labels: { color: COLORS.text },
      },
      tooltip: {
        callbacks: {
          label: (item) => {
            if (item.dataset.label === 'Total R') {
              const val = item.parsed.y;
              return `Total R: ${(val >= 0 ? '+' : '') + val.toFixed(2)}R`;
            }
            return `Win Rate: ${item.parsed.y}%`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { color: COLORS.grid },
      },
      y: {
        position: 'left',
        grid: { color: COLORS.grid },
        title: {
          display: true,
          text: 'Total R',
          color: COLORS.text,
        },
        ticks: { color: COLORS.text },
      },
      y1: {
        position: 'right',
        grid: { display: false },
        min: 0,
        max: 100,
        title: {
          display: true,
          text: 'Win Rate %',
          color: COLORS.amber,
        },
        ticks: { color: COLORS.amber },
      },
    },
  };

  return (
    <div className="rr-compare-container">
      <div className="chart-box">
        <Bar data={chartData} options={options} />
      </div>
    </div>
  );
}