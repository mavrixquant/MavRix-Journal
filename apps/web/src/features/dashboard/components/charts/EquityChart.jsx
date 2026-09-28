// apps/web/src/features/dashboard/components/charts/EquityChart.jsx
import { useMemo, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { useStats } from '@/features/dashboard/hooks/useStats';
import {
  chartColors,
  baseTooltip,
  baseAxis,
  decimationConfig,
  baseAnimation,
} from '@/shared/charts/theme';
import { ChartExportButton } from '@/components/ui/chart-export';

export default function EquityChart() {
  const { stats, metric } = useStats();
  const equityData = stats?.equity;
  const isMoney = metric === '$';
  const chartRef = useRef(null);

  const chartData = useMemo(() => {
    if (!equityData || equityData.length === 0) return null;
    return {
      labels: equityData.map((_, i) => `Trade #${i + 1}`),
      datasets: [
        {
          label: isMoney ? 'Cumulative Net P&L' : 'Cumulative R',
          data: equityData.map((e) => e.y),
          borderColor: chartColors.amber,
          borderWidth: 2,
          fill: true,
          tension: 0.2,
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 240);
            gradient.addColorStop(0, chartColors.amberFill);
            gradient.addColorStop(0.8, 'rgba(255,176,32,.02)');
            gradient.addColorStop(1, 'rgba(255,176,32,0)');
            return gradient;
          },
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: chartColors.amber,
          pointHoverBorderColor: '#0D1117',
          pointHoverBorderWidth: 2,
        },
      ],
    };
  }, [equityData, isMoney]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      animation: baseAnimation,
      plugins: {
        legend: { display: false },
        decimation: decimationConfig,
        tooltip: baseTooltip({
          callbacks: {
            title: (items) => {
              const idx = items[0]?.dataIndex;
              const item = equityData?.[idx];
              return item?.x ? `${item.x} (Trade #${idx + 1})` : `Trade #${idx + 1}`;
            },
            label: (item) => {
              const val = item.parsed.y;
              if (isMoney) {
                const sign = val >= 0 ? '+' : '-';
                return `Equity: ${sign}$${Math.abs(val).toFixed(2)}`;
              }
              return `Equity: ${(val >= 0 ? '+' : '') + val.toFixed(2)}R`;
            },
          },
        }),
      },
      scales: {
        x: { grid: { display: false }, ticks: { display: false } },
        y: baseAxis({
          ticks: {
            color: chartColors.text,
            font: { family: "'IBM Plex Mono', monospace", size: 10 },
            callback: (v) =>
              isMoney ? `$${v}` : `${v > 0 ? '+' : ''}${v}R`,
          },
        }),
      },
    }),
    [equityData, isMoney]
  );

  if (!equityData || equityData.length === 0) {
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
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.25 18 9 11.25l4.306 4.306a1.194 1.194 0 0 0 1.581 0l6.363-6.364M22.5 10.5V15m0-4.5h-4.5"
          />
        </svg>
        <span>No equity curve data recorded</span>
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
      <ChartExportButton chartRef={chartRef} filename="equity-curve" />
      <Line ref={chartRef} data={chartData} options={options} />
    </div>
  );
}