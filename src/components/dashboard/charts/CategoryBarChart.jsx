// src/components/dashboard/charts/CategoryBarChart.jsx
import { Bar } from 'react-chartjs-2';
import { useMemo } from 'react';
import { useStats } from '../../../hooks/useStats';

const COLORS = {
  win: '#35C4A1',
  winHover: '#45D1AD',
  loss: '#FF5C5C',
  lossHover: '#FF7070',
  text: '#8892A3',
  textMuted: '#545E6E',
  textLight: '#E7E9EE',
  grid: '#1A2029',
  tooltipBg: '#11151F',
  tooltipBorder: '#212836',
};

export default function CategoryBarChart({ data, label, horizontal = false }) {
  const { metric } = useStats();
  const isMoney = metric === '$';

  if (!data || data.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '180px', color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', border: `1px dashed ${COLORS.grid}`, borderRadius: '10px', background: 'rgba(17, 21, 31, 0.4)' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '8px', opacity: 0.6 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
        </svg>
        <span>No category data available</span>
      </div>
    );
  }

  // Support both legacy `totalR` and new `total` field names.
  const valueOf = (d) => d.total ?? d.totalR ?? 0;

  const chartData = useMemo(() => {
    return {
      labels: data.map(d => d.label),
      datasets: [
        {
          label: label || (isMoney ? 'Net P&L' : 'Total R'),
          data: data.map(valueOf),
          backgroundColor: data.map(d => (valueOf(d) >= 0 ? COLORS.win : COLORS.loss)),
          hoverBackgroundColor: data.map(d => (valueOf(d) >= 0 ? COLORS.winHover : COLORS.lossHover)),
          borderRadius: {
            topLeft: 6, topRight: 6,
            bottomLeft: horizontal ? 0 : 6,
            bottomRight: horizontal ? 6 : 0,
          },
          borderSkipped: false,
          maxBarThickness: 32,
          barPercentage: 0.65,
          categoryPercentage: 0.8,
        },
      ],
    };
  }, [data, label, horizontal, isMoney]);

  const options = useMemo(() => {
    const valueAxisConfig = {
      grid: { color: COLORS.grid, drawBorder: false },
      ticks: {
        color: COLORS.text,
        font: { family: "'IBM Plex Mono', monospace", size: 10 },
        callback: (val) => isMoney ? `$${val}` : `${val > 0 ? '+' : ''}${val}R`,
      },
    };

    const categoryAxisConfig = {
      grid: { display: false },
      ticks: {
        color: COLORS.textLight,
        font: { family: "'Inter', sans-serif", size: 11, weight: 500 },
      },
    };

    return {
      indexAxis: horizontal ? 'y' : 'x',
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: COLORS.tooltipBg,
          borderColor: COLORS.tooltipBorder,
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          displayColors: false,
          titleColor: COLORS.textLight,
          titleFont: { family: "'Space Grotesk', sans-serif", size: 12, weight: '600' },
          bodyColor: COLORS.text,
          bodyFont: { family: "'IBM Plex Mono', monospace", size: 11 },
          bodySpacing: 4,
          callbacks: {
            title: (items) => items[0]?.label || '',
            label: (item) => {
              const val = item.parsed[horizontal ? 'x' : 'y'];
              if (isMoney) {
                const sign = val >= 0 ? '+' : '-';
                return `Net P&L : ${sign}$${Math.abs(val).toFixed(2)}`;
              }
              return `Total R : ${(val >= 0 ? '+' : '') + val.toFixed(2)}R`;
            },
            afterLabel: (item) => {
              const d = data[item.dataIndex];
              if (!d) return '';
              return `Volume  : ${d.n} trades (${d.winRate.toFixed(1)}% win)`;
            },
          },
        },
      },
      scales: {
        x: horizontal ? valueAxisConfig : categoryAxisConfig,
        y: horizontal ? categoryAxisConfig : valueAxisConfig,
      },
    };
  }, [data, horizontal, isMoney]);

  return <Bar data={chartData} options={options} />;
}