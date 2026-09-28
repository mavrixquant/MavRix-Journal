// apps/web/src/features/dashboard/components/charts/RollingExpectancyChart.jsx
import { useMemo, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { useStats } from '@/features/dashboard/hooks/useStats';
import {
  chartColors,
  baseTooltip,
  baseAxis,
  baseLegend,
  baseAnimation,
} from '@/shared/charts/theme';
import { ChartExportButton } from '@/components/ui/chart-export';

const WINDOW = 20;

export default function RollingExpectancyChart() {
  const { rollingExpectancy, metric, stats } = useStats();
  const isMoney = metric === '$';
  const chartRef = useRef(null);

  const chartData = useMemo(() => {
    if (!rollingExpectancy || rollingExpectancy.length === 0) return null;
    const values = rollingExpectancy.map((d) => d.value);
    const zeroLine = values.map(() => 0);
    const meanLine = values.map(() => stats.expectancy);

    return {
      labels: rollingExpectancy.map((d) => `#${d.idx}`),
      datasets: [
        {
          label: 'Zero',
          data: zeroLine,
          borderColor: chartColors.zeroLine,
          borderWidth: 1,
          borderDash: [4, 4],
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          tension: 0,
          order: 3,
        },
        {
          label: 'Overall Mean',
          data: meanLine,
          borderColor: 'rgba(255,176,32,.35)',
          borderWidth: 1,
          borderDash: [2, 3],
          pointRadius: 0,
          pointHoverRadius: 0,
          fill: false,
          tension: 0,
          order: 2,
        },
        {
          label: `Rolling ${WINDOW}-Trade Expectancy`,
          data: values,
          borderColor: chartColors.amber,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: chartColors.amber,
          pointHoverBorderColor: '#0D1117',
          pointHoverBorderWidth: 2,
          tension: 0.25,
          fill: true,
          backgroundColor: (context) => {
            const ctx = context.chart.ctx;
            const gradient = ctx.createLinearGradient(0, 0, 0, 220);
            gradient.addColorStop(0, chartColors.amberSoft);
            gradient.addColorStop(1, 'rgba(255,176,32,0)');
            return gradient;
          },
          order: 1,
        },
      ],
    };
  }, [rollingExpectancy, stats.expectancy]);

  const options = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: baseAnimation,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: baseLegend({
          labels: {
            filter: (item) => item.text === `Rolling ${WINDOW}-Trade Expectancy`,
            color: chartColors.text,
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
            pointStyle: 'circle',
            font: { family: "'Inter', sans-serif", size: 11, weight: '500' },
            padding: 16,
          },
        }),
        tooltip: baseTooltip({
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
        }),
      },
      scales: {
        x: { grid: { display: false }, ticks: { display: false } },
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
    [rollingExpectancy, isMoney]
  );

  if (!rollingExpectancy || rollingExpectancy.length === 0) {
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
          textAlign: 'center',
          padding: 16,
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
          <polyline points="3 17 9 11 13 15 21 7" />
          <polyline points="14 7 21 7 21 14" />
        </svg>
        <span>Not enough trades yet</span>
        <span style={{ fontSize: 10.5, marginTop: 4, opacity: 0.7 }}>
          Needs at least {WINDOW} trades
        </span>
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
      <ChartExportButton chartRef={chartRef} filename="rolling-expectancy" />
      <Line ref={chartRef} data={chartData} options={options} />
    </div>
  );
}