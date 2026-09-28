// apps/web/src/features/dashboard/components/charts/MonthlyChart.jsx
import { useMemo, useRef } from 'react';
import { Bar } from 'react-chartjs-2';
import { useStats } from '@/features/dashboard/hooks/useStats';
import { chartColors, baseTooltip, baseAxis, baseCategoryAxis, baseAnimation } from '@/shared/charts/theme';
import { ChartExportButton } from '@/components/ui/chart-export';

const monthLabel = (ym) => {
  const [y, m] = ym.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
};

export default function MonthlyChart() {
  const { monthlySeries, metric } = useStats();
  const isMoney = metric === '$';
  const chartRef = useRef(null);

  const chartData = useMemo(() => {
    if (!monthlySeries || monthlySeries.length === 0) return null;
    return {
      labels: monthlySeries.map((d) => monthLabel(d.month)),
      datasets: [
        {
          label: isMoney ? 'Net P&L' : 'Total R',
          data: monthlySeries.map((d) => d.total),
          backgroundColor: monthlySeries.map((d) =>
            d.total >= 0 ? chartColors.win : chartColors.loss
          ),
          hoverBackgroundColor: monthlySeries.map((d) =>
            d.total >= 0 ? chartColors.winHover : chartColors.lossHover
          ),
          borderRadius: 5,
          borderSkipped: false,
          maxBarThickness: 40,
          barPercentage: 0.7,
          categoryPercentage: 0.85,
        },
      ],
    };
  }, [monthlySeries, isMoney]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: baseAnimation,
      plugins: {
        legend: { display: false },
        tooltip: baseTooltip({
          callbacks: {
            title: (items) => {
              const idx = items[0]?.dataIndex;
              const m = monthlySeries?.[idx];
              if (!m) return '';
              const [y, mo] = m.month.split('-');
              const d = new Date(Number(y), Number(mo) - 1, 1);
              return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
            },
            label: (item) => {
              const val = item.parsed.y;
              if (isMoney) {
                const sign = val >= 0 ? '+' : '-';
                return `Net P&L  : ${sign}$${Math.abs(val).toFixed(2)}`;
              }
              return `Total R  : ${(val >= 0 ? '+' : '') + val.toFixed(2)}R`;
            },
            afterLabel: (item) => {
              const m = monthlySeries?.[item.dataIndex];
              if (!m) return '';
              return `${m.n} trades · ${m.winRate.toFixed(1)}% win`;
            },
          },
        }),
      },
      scales: {
        x: baseCategoryAxis({
          ticks: {
            color: chartColors.textLight,
            font: { family: "'IBM Plex Mono', monospace", size: 10, weight: 500 },
            maxRotation: 45,
            minRotation: 0,
          },
        }),
        y: baseAxis({
          ticks: {
            color: chartColors.text,
            font: { family: "'IBM Plex Mono', monospace", size: 10 },
            callback: (v) =>
              isMoney
                ? `${v >= 0 ? '+' : ''}$${v}`
                : `${v > 0 ? '+' : ''}${v}R`,
          },
        }),
      },
    }),
    [monthlySeries, isMoney]
  );

  if (!chartData) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 200,
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
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        <span>No monthly data available</span>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 200,
      }}
    >
      <ChartExportButton chartRef={chartRef} filename="monthly" />
      <Bar ref={chartRef} data={chartData} options={options} />
    </div>
  );
}