// apps/web/src/features/dashboard/components/charts/UnderwaterChart.jsx
import { useMemo, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { useStats } from '@/features/dashboard/hooks/useStats';
import {
  chartColors,
  baseTooltip,
  baseAxis,
  decimationConfig,
  baseAnimation,
} from '@/lib/chartTheme';
import { ChartExportButton } from '@/components/ui/chart-export';

export default function UnderwaterChart() {
  const { underwaterCurve, metric } = useStats();
  const isMoney = metric === '$';
  const chartRef = useRef(null);

  const chartData = useMemo(() => {
    if (!underwaterCurve || underwaterCurve.length === 0) return null;
    return {
      labels: underwaterCurve.map((d) => `#${d.idx}`),
      datasets: [
        {
          label: 'Drawdown',
          data: underwaterCurve.map((d) => d.y),
          borderColor: chartColors.loss,
          borderWidth: 1.5,
          fill: 'origin',
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 200);
            gradient.addColorStop(0, 'rgba(255,92,92,0)');
            gradient.addColorStop(1, 'rgba(255,92,92,.28)');
            return gradient;
          },
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: chartColors.loss,
          pointHoverBorderColor: '#0D1117',
          pointHoverBorderWidth: 2,
          tension: 0.2,
        },
      ],
    };
  }, [underwaterCurve]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: baseAnimation,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        decimation: decimationConfig,
        tooltip: baseTooltip({
          callbacks: {
            title: (items) => {
              const idx = items[0]?.dataIndex;
              const d = underwaterCurve?.[idx];
              return d ? `${d.date} · Trade #${d.idx}` : '';
            },
            label: (item) => {
              const val = item.parsed.y;
              const peak = underwaterCurve?.[item.dataIndex]?.peak ?? 0;
              const eq = underwaterCurve?.[item.dataIndex]?.equity ?? 0;
              if (isMoney) {
                return [
                  `Drawdown  : $${val.toFixed(2)}`,
                  `Equity    : $${eq.toFixed(2)}`,
                  `Peak      : $${peak.toFixed(2)}`,
                ];
              }
              return [
                `Drawdown  : ${val.toFixed(2)}R`,
                `Equity    : ${eq.toFixed(2)}R`,
                `Peak      : ${peak.toFixed(2)}R`,
              ];
            },
          },
        }),
      },
      scales: {
        x: { grid: { display: false }, ticks: { display: false } },
        y: baseAxis({
          max: 0,
          ticks: {
            color: chartColors.text,
            font: { family: "'IBM Plex Mono', monospace", size: 10 },
            callback: (v) => (isMoney ? `-$${Math.abs(v)}` : `${v}R`),
          },
        }),
      },
    }),
    [underwaterCurve, isMoney]
  );

  if (!underwaterCurve || underwaterCurve.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 160,
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
          <polyline points="3 7 9 13 13 9 21 15" />
          <polyline points="14 15 21 15 21 8" />
        </svg>
        <span>No drawdown data available</span>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 160,
      }}
    >
      <ChartExportButton chartRef={chartRef} filename="underwater-curve" />
      <Line ref={chartRef} data={chartData} options={options} />
    </div>
  );
}