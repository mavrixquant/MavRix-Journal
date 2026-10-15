// apps/web/src/features/simulator/components/charts/DistributionChart.jsx
import { useMemo, useRef } from 'react';
import { Bar } from 'react-chartjs-2';
import { buildHistogram } from '@/shared/trading/monteCarlo';
import { chartColors, baseTooltip, baseAxis, baseCategoryAxis } from '@/shared/charts/theme';
import { useChartColors } from '@/shared/charts';
import { ChartExportButton } from '@/shared/ui/chart-export';

export default function DistributionChart({
  values,
  label = 'Runs',
  buckets = 12,
  color = chartColors.amber,
  tooltipSuffix = '',
  height = 220,
}) {
  const chartRef = useRef(null);
  const colors = useChartColors();

  // Resolve the accent prop. Callers may pass:
  //   'var(--accent)'     -> resolve to the live accent hex
  //   chartColors.amber   -> same, but the legacy pinned default
  //   '#ef4444' / '#22c55e' -> semantic colors, pass through unchanged
  //
  // Canvas 2D cannot resolve var() or color-mix(), so any CSS-var string
  // would be silently rejected and the previous fillStyle retained.
  const resolvedColor = useMemo(() => {
    if (color === 'var(--accent)' || color === chartColors.amber) {
      return colors.accent;
    }
    return color;
  }, [color, colors]);
  const histogram = useMemo(() => buildHistogram(values, buckets), [values, buckets]);

  const chartData = useMemo(() => {
    if (!histogram) return null;
    return {
      labels: histogram.labels,
      datasets: [
        {
          label,
          data: histogram.counts,
          backgroundColor: resolvedColor,
          hoverBackgroundColor: colors.amberHover,
          borderRadius: 4,
          borderSkipped: false,
          barPercentage: 0.9,
          categoryPercentage: 0.9,
        },
      ],
    };
  }, [histogram, label, resolvedColor]);

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