// src/components/dashboard/TimeChart.jsx
import { useMemo, useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { useStats } from '../../../hooks/useStats';

const COLORS = {
  blue: '#4C8BF5',
  blueHover: '#609AF8',
  amber: '#FFB020',
  amberHover: '#FFC04D',
  text: '#8892A3',
  textMuted: '#545E6E',
  textLight: '#E7E9EE',
  grid: '#1A2029',
  tooltipBg: '#11151F',
  tooltipBorder: '#212836',
};

// Hook to dynamically derive bar dimensions based on screen width
function useResponsiveBarConfig() {
  const [config, setConfig] = useState({ maxBarThickness: 48, barPercentage: 0.75, categoryPercentage: 0.85 });

  useEffect(() => {
    const updateConfig = () => {
      const width = window.innerWidth;
      if (width >= 1200) {
        // Desktop: Bold, full-sized bars
        setConfig({ maxBarThickness: 52, barPercentage: 0.75, categoryPercentage: 0.85 });
      } else if (width >= 768) {
        // Tablet: Balanced width
        setConfig({ maxBarThickness: 32, barPercentage: 0.65, categoryPercentage: 0.8 });
      } else {
        // Mobile: Slim bars to prevent clipping
        setConfig({ maxBarThickness: 18, barPercentage: 0.55, categoryPercentage: 0.75 });
      }
    };

    updateConfig();
    window.addEventListener('resize', updateConfig);
    return () => window.removeEventListener('resize', updateConfig);
  }, []);

  return config;
}

export default function TimeChart() {
  const { stats, groupBy } = useStats();
  const barConfig = useResponsiveBarConfig();

  // Get time buckets in sorted order
  const timeData = useMemo(() => {
    if (!stats || !stats.outcomes || stats.outcomes.length === 0) return [];

    const buckets = [...new Set(stats.outcomes.map(o => o.bucket))].sort();
    return groupBy ? groupBy(o => o.bucket, buckets) : [];
  }, [stats, groupBy]);

  const chartData = useMemo(() => {
    if (!timeData || timeData.length === 0) return null;

    return {
      labels: timeData.map(d => d.label),
      datasets: [
        {
          type: 'line',
          label: 'Win Rate %',
          data: timeData.map(d => +d.winRate.toFixed(1)),
          borderColor: COLORS.amber,
          backgroundColor: COLORS.amber,
          pointBackgroundColor: COLORS.amber,
          pointBorderColor: '#0D1117',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: COLORS.amberHover,
          tension: 0.3,
          yAxisID: 'y1',
          order: 1,
        },
        {
          type: 'bar',
          label: 'Trades',
          data: timeData.map(d => d.n),
          backgroundColor: 'rgba(76, 139, 245, 0.65)',
          hoverBackgroundColor: COLORS.blueHover,
          borderRadius: 6,
          borderSkipped: false,
          maxBarThickness: barConfig.maxBarThickness,
          barPercentage: barConfig.barPercentage,
          categoryPercentage: barConfig.categoryPercentage,
          yAxisID: 'y',
          order: 2,
        },
      ],
    };
  }, [timeData, barConfig]);

  const options = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      animation: {
        duration: 300,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
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
          titleColor: COLORS.textLight,
          titleFont: { family: "'Space Grotesk', sans-serif", size: 12, weight: '600' },
          bodyColor: COLORS.text,
          bodyFont: { family: "'IBM Plex Mono', monospace", size: 11 },
          bodySpacing: 4,
          callbacks: {
            title: (items) => items[0]?.label || '',
            label: (item) => {
              if (item.dataset.label === 'Trades') {
                return `Trades    : ${item.parsed.y}`;
              }
              return `Win Rate  : ${item.parsed.y.toFixed(1)}%`;
            },
            afterLabel: (item) => {
              if (item.dataset.label === 'Trades') {
                const d = timeData[item.dataIndex];
                if (!d) return '';
                const totalR = (d.totalR >= 0 ? '+' : '') + d.totalR.toFixed(2);
                return `Total R   : ${totalR}R`;
              }
              return '';
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: COLORS.textLight,
            font: { family: "'Inter', sans-serif", size: 10, weight: 500 },
            maxRotation: 45,
            minRotation: 0,
          },
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: {
            color: COLORS.grid,
            drawBorder: false,
          },
          title: {
            display: true,
            text: 'Trade Count',
            color: COLORS.text,
            font: { family: "'Inter', sans-serif", size: 10, weight: '600' },
          },
          ticks: {
            color: COLORS.text,
            precision: 0,
            font: { family: "'IBM Plex Mono', monospace", size: 10 },
          },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { display: false },
          min: 0,
          max: 100,
          title: {
            display: true,
            text: 'Win %',
            color: COLORS.amber,
            font: { family: "'Inter', sans-serif", size: 10, weight: '600' },
          },
          ticks: {
            color: COLORS.amber,
            font: { family: "'IBM Plex Mono', monospace", size: 10 },
            callback: (v) => `${v}%`,
          },
        },
      },
    };
  }, [timeData]);

  if (!timeData || timeData.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: '220px',
          color: COLORS.textMuted,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '12px',
          border: `1px dashed ${COLORS.grid}`,
          borderRadius: '10px',
          background: 'rgba(17, 21, 31, 0.4)',
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          style={{ marginBottom: '8px', opacity: 0.6 }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
          />
        </svg>
        <span>No time distribution data available</span>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '220px' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}