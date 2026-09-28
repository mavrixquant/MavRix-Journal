// apps/web/src/features/dashboard/components/charts/RRCompareChart.jsx
import { useMemo, useRef, useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { useStats } from '@/features/dashboard/hooks/useStats';
import { computeStats } from '@/shared/trading/stats';
import {
  chartColors,
  baseTooltip,
  baseAxis,
  baseCategoryAxis,
  baseLegend,
  baseAnimation,
} from '@/shared/charts/theme';
import { ChartExportButton } from '@/components/ui/chart-export';

const RR_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8];

function useResponsiveBarConfig() {
  const [config, setConfig] = useState({
    maxBarThickness: 48,
    barPercentage: 0.7,
    categoryPercentage: 0.85,
  });
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w >= 1200)
        setConfig({ maxBarThickness: 52, barPercentage: 0.7, categoryPercentage: 0.85 });
      else if (w >= 768)
        setConfig({ maxBarThickness: 32, barPercentage: 0.6, categoryPercentage: 0.8 });
      else
        setConfig({ maxBarThickness: 18, barPercentage: 0.5, categoryPercentage: 0.75 });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return config;
}

function EmptyState({ text }) {
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
        padding: 20,
        textAlign: 'center',
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
      <span>{text}</span>
    </div>
  );
}

export default function RRCompareChart() {
  const { filteredTrades, stats, account } = useStats();
  const barConfig = useResponsiveBarConfig();
  const chartRef = useRef(null);

  const isBacktest = account?.type === 'Backtest';
  const hasTrades = filteredTrades && filteredTrades.length > 0;

  const statsData = useMemo(() => {
    if (!hasTrades || !isBacktest) return [];
    return RR_LEVELS.map((r) => computeStats(filteredTrades, r, account));
  }, [filteredTrades, hasTrades, isBacktest, account]);

  const rrChartData = useMemo(() => {
    if (statsData.length === 0) return null;
    const totalData = statsData.map((s) => s.total);
    const winRateData = statsData.map((s) => +s.winRate.toFixed(1));
    return {
      labels: RR_LEVELS.map((r) => `1:${r}`),
      datasets: [
        {
          type: 'line',
          label: 'Win Rate %',
          data: winRateData,
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
          label: 'Total R',
          data: totalData,
          backgroundColor: totalData.map((v) =>
            v >= 0 ? chartColors.win : chartColors.loss
          ),
          hoverBackgroundColor: totalData.map((v) =>
            v >= 0 ? chartColors.winHover : chartColors.lossHover
          ),
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
  }, [statsData, barConfig]);

  const dailyData = useMemo(() => {
    if (isBacktest || !stats || !stats.outcomes) return null;
    const map = new Map();
    stats.outcomes.forEach((o) => {
      if (!o.date) return;
      map.set(o.date, (map.get(o.date) || 0) + (o.score ?? 0));
    });
    const dates = [...map.keys()].sort();
    if (dates.length === 0) return null;
    return {
      labels: dates.map((d) => d.slice(5)),
      values: dates.map((d) => +map.get(d).toFixed(2)),
      dates,
    };
  }, [stats, isBacktest]);

  const dailyChartData = useMemo(() => {
    if (!dailyData) return null;
    return {
      labels: dailyData.labels,
      datasets: [
        {
          label: 'Daily Net P&L',
          data: dailyData.values,
          backgroundColor: dailyData.values.map((v) =>
            v >= 0 ? chartColors.win : chartColors.loss
          ),
          hoverBackgroundColor: dailyData.values.map((v) =>
            v >= 0 ? chartColors.winHover : chartColors.lossHover
          ),
          borderRadius: 4,
          borderSkipped: false,
          maxBarThickness: barConfig.maxBarThickness,
          barPercentage: barConfig.barPercentage,
          categoryPercentage: barConfig.categoryPercentage,
        },
      ],
    };
  }, [dailyData, barConfig]);

  const rrOptions = useMemo(
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
            title: (items) => `Target R:R ${items[0]?.label || ''}`,
            label: (item) => {
              if (item.dataset.label === 'Total R') {
                const val = item.parsed.y;
                return `Total R   : ${(val >= 0 ? '+' : '') + val.toFixed(2)}R`;
              }
              return `Win Rate  : ${item.parsed.y.toFixed(1)}%`;
            },
          },
        }),
      },
      scales: {
        x: baseCategoryAxis({
          ticks: {
            color: chartColors.textLight,
            font: { family: "'IBM Plex Mono', monospace", size: 11, weight: 500 },
          },
        }),
        y: baseAxis({
          type: 'linear',
          position: 'left',
          title: {
            display: true,
            text: 'Total R',
            color: chartColors.text,
            font: { family: "'Inter', sans-serif", size: 10, weight: '600' },
          },
          ticks: {
            color: chartColors.text,
            font: { family: "'IBM Plex Mono', monospace", size: 10 },
            callback: (v) => `${v > 0 ? '+' : ''}${v}R`,
          },
        }),
        y1: {
          type: 'linear',
          position: 'right',
          grid: { display: false },
          min: 0,
          max: 100,
          title: {
            display: true,
            text: 'Win Rate %',
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
    []
  );

  const dailyOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: baseAnimation,
      plugins: {
        legend: { display: false },
        tooltip: baseTooltip({
          callbacks: {
            title: (items) => dailyData?.dates?.[items[0]?.dataIndex] || '',
            label: (item) => {
              const val = item.parsed.y;
              const sign = val >= 0 ? '+' : '-';
              return `Net P&L : ${sign}$${Math.abs(val).toFixed(2)}`;
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
          title: {
            display: true,
            text: 'Net P&L',
            color: chartColors.text,
            font: { family: "'Inter', sans-serif", size: 10, weight: '600' },
          },
          ticks: {
            color: chartColors.text,
            font: { family: "'IBM Plex Mono', monospace", size: 10 },
            callback: (v) => `$${v}`,
          },
        }),
      },
    }),
    [dailyData]
  );

  if (!hasTrades) return <EmptyState text="No trade data recorded" />;

  if (isBacktest) {
    return (
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          minHeight: 220,
        }}
      >
        <ChartExportButton chartRef={chartRef} filename="rr-comparison" />
        <Bar ref={chartRef} data={rrChartData} options={rrOptions} />
      </div>
    );
  }

  if (!dailyChartData) return <EmptyState text="No daily P&L data available" />;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 220,
      }}
    >
      <ChartExportButton chartRef={chartRef} filename="daily-pnl" />
      <Bar ref={chartRef} data={dailyChartData} options={dailyOptions} />
    </div>
  );
}