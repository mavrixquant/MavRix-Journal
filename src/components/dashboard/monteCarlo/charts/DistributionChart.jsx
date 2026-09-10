// src/components/dashboard/monteCarlo/charts/DistributionChart.jsx
import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { buildHistogram } from '../../../../utils/monteCarlo';

const COLORS = {
  amber: '#FFB020',
  win: '#35C4A1',
  loss: '#FF5C5C',
  text: '#8892A3',
  textLight: '#E7E9EE',
  grid: '#1A2029',
  tooltipBg: '#11151F',
  tooltipBorder: '#212836',
};

export default function DistributionChart({
  values,
  label = 'Runs',
  buckets = 12,
  color = COLORS.amber,
  tooltipSuffix = '',
  height = 220,
}) {
  const histogram = useMemo(() => buildHistogram(values, buckets), [values, buckets]);

  const chartData = useMemo(() => {
    if (!histogram) return null;
    return {
      labels: histogram.labels,
      datasets: [{
        label,
        data: histogram.counts,
        backgroundColor: color,
        hoverBackgroundColor: '#FFC04D',
        borderRadius: 4,
        borderSkipped: false,
        barPercentage: 0.9,
        categoryPercentage: 0.9,
      }],
    };
  }, [histogram, label, color]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 200 },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: COLORS.tooltipBg,
        borderColor: COLORS.tooltipBorder,
        borderWidth: 1, padding: 10, cornerRadius: 8,
        displayColors: false,
        titleColor: COLORS.textLight,
        titleFont: { family: "'Space Grotesk', sans-serif", size: 11, weight: '600' },
        bodyColor: COLORS.text,
        bodyFont: { family: "'IBM Plex Mono', monospace", size: 10 },
        callbacks: {
          title: (items) => histogram?.labels?.[items[0]?.dataIndex] || '',
          label: (item) => {
            const total = values.length;
            const count = item.parsed.y;
            const pct = total ? ((count / total) * 100).toFixed(1) : '0';
            return `${count} runs (${pct}%)${tooltipSuffix ? ' ' + tooltipSuffix : ''}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: COLORS.textLight,
          font: { family: "'IBM Plex Mono', monospace", size: 9 },
          maxRotation: 45, minRotation: 45,
        },
      },
      y: {
        grid: { color: COLORS.grid, drawBorder: false },
        ticks: { color: COLORS.text, font: { family: "'IBM Plex Mono', monospace", size: 10 }, precision: 0 },
      },
    },
  }), [histogram, values.length, tooltipSuffix]);

  if (!chartData) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: `${height}px`,                          // ← fixed
        color: COLORS.text,
        fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px',
        border: `1px dashed ${COLORS.grid}`, borderRadius: '8px',
      }}>
        No data
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: `${height}px`,                            // ← fixed, not '100%'
      overflow: 'hidden',                                // ← belt-and-suspenders
    }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}