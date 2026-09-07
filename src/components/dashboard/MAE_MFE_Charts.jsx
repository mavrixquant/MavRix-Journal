// src/components/dashboard/MAE_MFE_Charts.jsx
import { Bar } from 'react-chartjs-2';
import { useMemo } from 'react';
import { useStats } from '../../hooks/useStats';

const SL = 12.5;
const COLORS = {
  win: '#35C4A1',
  loss: '#FF5C5C',
  blue: '#4C8BF5',
  text: '#8892A3',
  grid: '#1A2029',
};

export function MAEChart() {
  const { filteredTrades } = useStats();

  const data = useMemo(() => {
    if (!filteredTrades || filteredTrades.length === 0) return null;

    const buckets = ['0', '0-2', '2-4', '4-6', '6-8', '8-10', '10-12.5', '≥12.5'];
    const counts = new Array(buckets.length).fill(0);

    filteredTrades.forEach(t => {
      const v = t.mae;
      if (v === 0) counts[0]++;
      else if (v < 2) counts[1]++;
      else if (v < 4) counts[2]++;
      else if (v < 6) counts[3]++;
      else if (v < 8) counts[4]++;
      else if (v < 10) counts[5]++;
      else if (v < 12.5) counts[6]++;
      else counts[7]++;
    });

    return { labels: buckets, counts };
  }, [filteredTrades]);

  if (!data) {
    return (
      <div style={{ color: 'var(--text-faint)', textAlign: 'center', padding: '30px', height: '100%' }}>
        No data
      </div>
    );
  }

  const chartData = {
    labels: data.labels,
    datasets: [
      {
        data: data.counts,
        backgroundColor: data.labels.map((_, i) => 
          i === 0 || i === data.labels.length - 1 ? COLORS.loss : COLORS.blue + 'aa'
        ),
        borderRadius: 4,
        barPercentage: 0.8,
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
          label: (item) => `${item.parsed.y} trades`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: COLORS.text },
        title: {
          display: true,
          text: 'MAE (points) — SL at 12.5',
          color: COLORS.text,
        },
      },
      y: {
        grid: { color: COLORS.grid },
        ticks: { color: COLORS.text, precision: 0 },
        beginAtZero: true,
      },
    },
  };

  return <Bar data={chartData} options={options} />;
}

export function MFEChart() {
  const { filteredTrades } = useStats();

  const data = useMemo(() => {
    if (!filteredTrades || filteredTrades.length === 0) return null;

    const nonSL = filteredTrades.filter(t => !t.slHit);
    if (nonSL.length === 0) {
      return { labels: ['0-1R', '1-2R', '2-3R', '3-4R', '4-5R', '5R+'], counts: [0,0,0,0,0,0] };
    }

    const buckets = ['0-1R', '1-2R', '2-3R', '3-4R', '4-5R', '5R+'];
    const counts = new Array(buckets.length).fill(0);

    nonSL.forEach(t => {
      const r = t.rAchieved;
      if (r < 1) counts[0]++;
      else if (r < 2) counts[1]++;
      else if (r < 3) counts[2]++;
      else if (r < 4) counts[3]++;
      else if (r < 5) counts[4]++;
      else counts[5]++;
    });

    return { labels: buckets, counts };
  }, [filteredTrades]);

  if (!data) {
    return (
      <div style={{ color: 'var(--text-faint)', textAlign: 'center', padding: '30px', height: '100%' }}>
        No data
      </div>
    );
  }

  const chartData = {
    labels: data.labels,
    datasets: [
      {
        data: data.counts,
        backgroundColor: COLORS.win + 'cc',
        borderRadius: 4,
        barPercentage: 0.8,
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
          label: (item) => `${item.parsed.y} trades reached this R`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: COLORS.text },
        title: {
          display: true,
          text: 'Max favorable excursion, in R',
          color: COLORS.text,
        },
      },
      y: {
        grid: { color: COLORS.grid },
        ticks: { color: COLORS.text, precision: 0 },
        beginAtZero: true,
      },
    },
  };

  return <Bar data={chartData} options={options} />;
}