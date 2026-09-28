// apps/web/src/features/simulator/components/charts/DistributionChart.jsx
import { useMemo, useRef } from 'react';
import { Bar } from 'react-chartjs-2';
import { buildHistogram } from '@/shared/trading/monteCarlo';
import { chartColors, baseTooltip, baseAxis, baseCategoryAxis, baseAnimation } from '@/shared/charts/theme';
import { ChartExportButton } from '@/components/ui/chart-export';

export default function DistributionChart({
  values,
  label = 'Runs',
  buckets = 12,
  color = chartColors.amber,
  tooltipSuffix = '',
  height = 220,
}) {
  const chartRef = useRef(null);
  const histogram = useMemo(() => buildHistogram(values, buckets), [values, buckets]);

  const chartData = useMemo(() => {
    if (!histogram) return null;
    return {
      labels: histogram.labels,
      datasets: [
        {
          label,
          data: histogram.counts,
          backgroundColor: color,
          hoverBackgroundColor: chartColors.amberHover,
          borderRadius: 4,
          borderSkipped: false,
          barPercentage: 0.9,
          categoryPercentage: 0.9,
        },
      ],
    };
  }, [histogram, label, color]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 800, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: baseTooltip({
          callbacks: {
            title: (items) => histogram?.labels?.[items[0]?.dataIndex] || '',
            label: (item) => {
              const total = values.length;
              const count = item.parsed.y;
              const pct = total ? ((count / total) * 100).toFixed(1) : '0';
              return `${count} runs (${pct}%)${tooltipSuffix ? ' ' + tooltipSuffix : ''}`;
            },
          },
        }),
      },
      scales: {
        x: baseCategoryAxis({
          ticks: {
            color: chartColors.textLight,
            font: { family: "'IBM Plex Mono', monospace", size: 9 },
            maxRotation: 45,
            minRotation: 45,
          },
        }),
        y: baseAxis({
          ticks: {
            color: chartColors.text,
            font: { family: "'IBM Plex Mono', monospace", size: 10 },
            precision: 0,
          },
        }),
      },
    }),
    [histogram, values.length, tooltipSuffix]
  );

  if (!chartData) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height,
          color: chartColors.text,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11,
          border: `1px dashed ${chartColors.grid}`,
          borderRadius: 8,
        }}
      >
        No data
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height,
        overflow: 'hidden',
      }}
    >
      <ChartExportButton chartRef={chartRef} filename="distribution" />
      <Bar ref={chartRef} data={chartData} options={options} />
    </div>
  );
}