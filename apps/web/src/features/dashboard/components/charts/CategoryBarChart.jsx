// apps/web/src/features/dashboard/components/charts/CategoryBarChart.jsx
import { Bar } from 'react-chartjs-2';
import { useMemo, useRef } from 'react';
import { useStats } from '@/features/dashboard/hooks/useStats';
import { chartColors, baseTooltip, baseAxis, baseCategoryAxis, baseAnimation } from '@/shared/charts/theme';
import { ChartExportButton } from '@/components/ui/chart-export';

const valueOf = (d) => d.total ?? d.totalR ?? 0;

function EmptyState() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: 180,
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
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
        />
      </svg>
      <span>No category data available</span>
    </div>
  );
}

export default function CategoryBarChart({ data, label, horizontal = false }) {
  const { metric } = useStats();
  const isMoney = metric === '$';
  const isEmpty = !data || data.length === 0;
  const chartRef = useRef(null);

  const chartData = useMemo(() => {
    if (isEmpty) return null;
    return {
      labels: data.map((d) => d.label),
      datasets: [
        {
          label: label || (isMoney ? 'Net P&L' : 'Total R'),
          data: data.map(valueOf),
          backgroundColor: data.map((d) =>
            valueOf(d) >= 0 ? chartColors.win : chartColors.loss
          ),
          hoverBackgroundColor: data.map((d) =>
            valueOf(d) >= 0 ? chartColors.winHover : chartColors.lossHover
          ),
          borderRadius: {
            topLeft: 6,
            topRight: 6,
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
  }, [data, label, horizontal, isMoney, isEmpty]);

  const options = useMemo(() => {
    const valueAxisConfig = baseAxis({
      ticks: {
        color: chartColors.text,
        font: { family: "'IBM Plex Mono', monospace", size: 10 },
        callback: (val) =>
          isMoney ? `$${val}` : `${val > 0 ? '+' : ''}${val}R`,
      },
    });

    const categoryAxisConfig = baseCategoryAxis({
      ticks: {
        color: chartColors.textLight,
        font: { family: "'Inter', sans-serif", size: 11, weight: 500 },
      },
    });

    return {
      indexAxis: horizontal ? 'y' : 'x',
      responsive: true,
      maintainAspectRatio: false,
      animation: baseAnimation,
      plugins: {
        legend: { display: false },
        tooltip: baseTooltip({
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
              const d = data?.[item.dataIndex];
              if (!d) return '';
              return `Volume  : ${d.n} trades (${d.winRate.toFixed(1)}% win)`;
            },
          },
        }),
      },
      scales: {
        x: horizontal ? valueAxisConfig : categoryAxisConfig,
        y: horizontal ? categoryAxisConfig : valueAxisConfig,
      },
    };
  }, [data, horizontal, isMoney]);

  if (isEmpty) return <EmptyState />;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 180,
      }}
    >
      <ChartExportButton chartRef={chartRef} filename="category-chart" />
      <Bar ref={chartRef} data={chartData} options={options} />
    </div>
  );
}