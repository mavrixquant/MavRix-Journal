import { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import '@/shared/charts/register';
import { chartColors, baseTooltip, baseAxis, baseCategoryAxis } from '@/shared/charts/theme';
import { buildHistogram } from '@/shared/trading/monteCarlo';
import { intHistogram } from '../../lib/stats';

function BarBase({ labels, counts, colors, titles, total, height }) {
  const data = useMemo(
    () => ({
      labels,
      datasets: [
        {
          data: counts,
          backgroundColor: colors,
          borderRadius: 3,
          borderSkipped: false,
          categoryPercentage: 1,
          barPercentage: 0.94,
        },
      ],
    }),
    [labels, counts, colors]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      plugins: {
        legend: { display: false },
        tooltip: baseTooltip({
          callbacks: {
            title: (items) => titles[items[0].dataIndex],
            label: (ctx) => {
              const c = ctx.parsed.y;
              return `${c.toLocaleString('en-US')} runs (${((c / total) * 100).toFixed(1)}%)`;
            },
          },
        }),
      },
      scales: {
        x: baseCategoryAxis({
          ticks: { maxTicksLimit: 8, autoSkip: true, maxRotation: 0, color: chartColors.text, font: { size: 10 } },
        }),
        y: baseAxis({
          beginAtZero: true,
          ticks: { precision: 0, maxTicksLimit: 5, color: chartColors.text, font: { size: 10 } },
        }),
      },
    }),
    [titles, total]
  );

  return (
    <div className="sx-chart" style={{ height }}>
      <Bar data={data} options={options} />
    </div>
  );
}

/**
 * Histogram of continuous values.
 * `fmt` formats an axis/tooltip value; `colorFor(mid)` picks a bar colour.
 */
export default function HistogramChart({ values, buckets = 28, fmt, colorFor, height = 220 }) {
  const hist = useMemo(() => buildHistogram(values, buckets), [values, buckets]);

  const prepared = useMemo(() => {
    if (!hist) return null;
    const mids = hist.counts.map((_, i) => hist.min + (i + 0.5) * hist.bucketSize);
    return {
      labels: mids.map((m) => fmt(m)),
      titles: hist.counts.map((_, i) => `${fmt(hist.min + i * hist.bucketSize)} to ${fmt(hist.min + (i + 1) * hist.bucketSize)}`),
      colors: mids.map((m) => (colorFor ? colorFor(m) : chartColors.amber)),
    };
  }, [hist, fmt, colorFor]);

  if (!hist || !prepared) return null;
  return (
    <BarBase
      labels={prepared.labels}
      counts={hist.counts}
      colors={prepared.colors}
      titles={prepared.titles}
      total={values.length}
      height={height}
    />
  );
}

/** Histogram of small integers (streak lengths). */
export function IntHistogramChart({ values, color = chartColors.amber, height = 200 }) {
  const hist = useMemo(() => intHistogram(values), [values]);
  const titles = useMemo(() => (hist ? hist.labels.map((l) => `${l} in a row`) : []), [hist]);
  const colors = useMemo(() => (hist ? hist.labels.map(() => color) : []), [hist, color]);
  if (!hist) return null;
  return <BarBase labels={hist.labels} counts={hist.counts} colors={colors} titles={titles} total={values.length} height={height} />;
}
