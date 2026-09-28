// apps/web/src/features/dashboard/components/charts/TimeChart.jsx
import { useMemo, useRef, useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { useStats } from '@/features/dashboard/hooks/useStats';
import {
  chartColors,
  baseTooltip,
  baseAxis,
  baseCategoryAxis,
  baseLegend,
  baseAnimation,
} from '@/lib/chartTheme';
import { ChartExportButton } from '@/components/ui/chart-export';

function useResponsiveBarConfig() {
  const [config, setConfig] = useState({
    maxBarThickness: 48,
    barPercentage: 0.75,
    categoryPercentage: 0.85,
  });
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w >= 1200)
        setConfig({ maxBarThickness: 52, barPercentage: 0.75, categoryPercentage: 0.85 });
      else if (w >= 768)
        setConfig({ maxBarThickness: 32, barPercentage: 0.65, categoryPercentage: 0.8 });
      else
        setConfig({ maxBarThickness: 18, barPercentage: 0.55, categoryPercentage: 0.75 });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return config;
}

export default function TimeChart() {
  const { stats, groupBy, metric } = useStats();
  const barConfig = useResponsiveBarConfig();
  const isMoney = metric === '$';
  const chartRef = useRef(null);

  const timeData = useMemo(() => {
    if (!stats || !stats.outcomes || stats.outcomes.length === 0) return [];
    const buckets = [...new Set(stats.outcomes.map((o) => o.bucket))].sort();
    return groupBy ? groupBy((o) => o.bucket, buckets) : [];
  }, [stats, groupBy]);

  const chartData = useMemo(() => {
    if (!timeData || timeData.length === 0) return null;
    return {
      labels: timeData.map((d) => d.label),
      datasets: [
        {
          type: 'line',
          label: 'Win Rate %',
          data: timeData.map((d) => +d.winRate.toFixed(1)),
          borderColor: chartColors.amber,
          backgroundColor: chartColors.amber,
          pointBackgroundColor: chartColors.amber,
          pointBorderColor: '#0D1117',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: chartColors.amberHover,
          tension: 0.3,
          yAxisID: 'y1',
          order: 1,
        },
        {
          type: 'bar',
          label: 'Trades',
          data: timeData.map((d) => d.n),
          backgroundColor: 'rgba(76,139,245,.65)',
          hoverBackgroundColor: chartColors.blueHover,
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

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      animation: baseAnimation,
      plugins: {
        legend: baseLegend(),
        tooltip: baseTooltip({
          displayColors: true,
          boxPadding: 4,
          callbacks: {
            title: (items) => items[0]?.label || '',
            label: (item) => {
              if (item.dataset.label === 'Trades')
                return `Trades    : ${item.parsed.y}`;
              return `Win Rate  : ${item.parsed.y.toFixed(1)}%`;
            },
            afterLabel: (item) => {
              if (item.dataset.label !== 'Trades') return '';
              const d = timeData[item.dataIndex];
              if (!d) return '';
              const total = d.total ?? d.totalR ?? 0;
              if (isMoney) {
                const sign = total >= 0 ? '+' : '-';
                return `Net P&L   : ${sign}$${Math.abs(total).toFixed(2)}`;
              }
              return `Total R   : ${(total >= 0 ? '+' : '') + total.toFixed(2)}R`;
            },
          },
        }),
      },
      scales: {
        x: baseCategoryAxis({
          ticks: {
            color: chartColors.textLight,
            font: { family: "'Inter', sans-serif", size: 10, weight: 500 },
            maxRotation: 45,
            minRotation: 0,
          },
        }),
        y: baseAxis({
          position: 'left',
          title: {
            display: true,
            text: 'Trade Count',
            color: chartColors.text,
            font: { family: "'Inter', sans-serif", size: 10, weight: '600' },
          },
          ticks: {
            color: chartColors.text,
            precision: 0,
            font: { family: "'IBM Plex Mono', monospace", size: 10 },
          },
        }),
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
            color: chartColors.amber,
            font: { family: "'Inter', sans-serif", size: 10, weight: '600' },
          },
          ticks: {
            color: chartColors.amber,
            font: { family: "'IBM Plex Mono', monospace", size: 10 },
            callback: (v) => `${v}%`,
          },
        },
      },
    }),
    [timeData, isMoney]
  );

  if (!timeData || timeData.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 220,
          color: chartColors.textDim,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12,
          border: `1px dashed ${chartColors.grid}`,
          borderRadius: 10,
          background: 'rgba(17,21,31,.4)',
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          style={{ marginBottom: 8, opacity: 0.6 }}
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
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 220,
      }}
    >
      <ChartExportButton chartRef={chartRef} filename="time-of-day" />
      <Bar ref={chartRef} data={chartData} options={options} />
    </div>
  );
}