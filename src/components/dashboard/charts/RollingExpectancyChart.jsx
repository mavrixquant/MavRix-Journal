// src/components/dashboard/charts/RollingExpectancyChart.jsx
import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { useStats } from '../../../hooks/useStats';

const COLORS = {
  amber: '#FFB020',
  text: '#8892A3',
  textMuted: '#545E6E',
  textLight: '#E7E9EE',
  grid: '#1A2029',
  tooltipBg: '#11151F',
  tooltipBorder: '#212836',
};

const WINDOW = 20;

export default function RollingExpectancyChart() {
  const { rollingExpectancy, metric, stats } = useStats();
  const isMoney = metric === '$';

  const chartData = useMemo(() => {
    if (!rollingExpectancy || rollingExpectancy.length === 0) return null;
    const values = rollingExpectancy.map(d => d.value);
    const zeroLine = values.map(() => 0);
    const meanLine = values.map(() => stats.expectancy);

    return {
      labels: rollingExpectancy.map(d => `#${d.idx}`),
      datasets: [
        // Zero reference
        {
          label: 'Zero',
          data: zeroLine,
          borderColor: 'rgba(255, 255, 255, 0.15)',
          borderWidth: 1,
          borderDash: [4, 4],
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          tension: 0,
          order: 3,
        },
        // Overall mean (static line)
        {
          label: 'Overall Mean',
          data: meanLine,
          borderColor: 'rgba(255, 176, 32, 0.35)',
          borderWidth: 1,
          borderDash: [2, 3],
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          tension: 0,
          order: 2,
        },
        // Rolling expectancy line
        {
          label: `Rolling ${WINDOW}-Trade Expectancy`,
          data: values,
          borderColor: COLORS.amber,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: COLORS.amber,
          pointHoverBorderColor: '#0D1117',
          pointHoverBorderWidth: 2,
          tension: 0.25,
          fill: true,
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 220);
            gradient.addColorStop(0, 'rgba(255, 176, 32, 0.18)');
            gradient.addColorStop(1, 'rgba(255, 176, 32, 0.0)');
            return gradient;
          },
          order: 1,
        },
      ],
    };
  }, [rollingExpectancy, stats.expectancy]);

  const options = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            filter: (item) => item.text === `Rolling ${WINDOW}-Trade Expectancy`,
            color: COLORS.text,
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
            pointStyle: 'circle',
            font: { family: "'Inter', sans-serif", size: 11, weight: '500' },
            padding: 16,
          },
        },
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
          filter: (item) => item.dataset.label === `Rolling ${WINDOW}-Trade Expectancy`,
          callbacks: {
            title: (items) => {
              const idx = items[0]?.dataIndex;
              const d = rollingExpectancy?.[idx];
              return d ? `${d.date} · Trade #${d.idx}` : '';
            },
            label: (item) => {
              const val = item.parsed.y;
              if (isMoney) {
                const sign = val >= 0 ? '+' : '-';
                return `Expectancy : ${sign}$${Math.abs(val).toFixed(2)}`;
              }
              return `Expectancy : ${(val >= 0 ? '+' : '') + val.toFixed(2)}R`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { display: false },
        },
        y: {
          grid: { color: COLORS.grid, drawBorder: false },
          ticks: {
            color: COLORS.text,
            font: { family: "'IBM Plex Mono', monospace", size: 10 },
            callback: (v) => isMoney ? `${v >= 0 ? '+' : ''}$${v}` : `${v > 0 ? '+' : ''}${v}R`,
          },
        },
      },
    };
  }, [rollingExpectancy, isMoney]);

  if (!rollingExpectancy || rollingExpectancy.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '200px', color: COLORS.textMuted, fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', border: `1px dashed ${COLORS.grid}`, borderRadius: '10px', background: 'rgba(17, 21, 31, 0.4)', textAlign: 'center', padding: '16px' }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '8px', opacity: 0.6 }}>
          <polyline points="3 17 9 11 13 15 21 7" />
          <polyline points="14 7 21 7 21 14" />
        </svg>
        <span>Not enough trades yet</span>
        <span style={{ fontSize: '10.5px', marginTop: '4px', opacity: 0.7 }}>Needs at least {WINDOW} trades</span>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '200px' }}>
      <Line data={chartData} options={options} />
    </div>
  );
}