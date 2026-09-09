// src/components/dashboard/RRCompareChart.jsx
import { useMemo, useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { useStats } from '../../../hooks/useStats';
import { computeStats } from '../../../utils/statsEngine';
import { useAppContext } from '../../../context/AppContext';

const RR_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8];

const COLORS = {
  win: '#35C4A1',
  winHover: '#45D1AD',
  loss: '#FF5C5C',
  lossHover: '#FF7070',
  amber: '#FFB020',
  amberHover: '#FFC04D',
  text: '#8892A3',
  textMuted: '#545E6E',
  textLight: '#E7E9EE',
  grid: '#1A2029',
  tooltipBg: '#11151F',
  tooltipBorder: '#212836',
};

function useResponsiveBarConfig() {
  const [config, setConfig] = useState({ maxBarThickness: 48, barPercentage: 0.7 });

  useEffect(() => {
    const updateConfig = () => {
      const width = window.innerWidth;
      if (width >= 1200) {
        setConfig({ maxBarThickness: 52, barPercentage: 0.7, categoryPercentage: 0.85 });
      } else if (width >= 768) {
        setConfig({ maxBarThickness: 32, barPercentage: 0.6, categoryPercentage: 0.8 });
      } else {
        setConfig({ maxBarThickness: 18, barPercentage: 0.5, categoryPercentage: 0.75 });
      }
    };

    updateConfig();
    window.addEventListener('resize', updateConfig);
    return () => window.removeEventListener('resize', updateConfig);
  }, []);

  return config;
}

export default function RRCompareChart() {
  const { state } = useAppContext();
  const { filteredTrades } = useStats();
  const barConfig = useResponsiveBarConfig();

  const selectedAccount = state?.accounts?.find(acc => acc.id === state?.selectedAccountId) || null;
  const isBacktest = selectedAccount?.type === 'Backtest';
  const hasTrades = filteredTrades && filteredTrades.length > 0;

  const statsData = useMemo(() => {
    if (!hasTrades || !isBacktest) return [];
    return RR_LEVELS.map(r => computeStats(filteredTrades, r));
  }, [filteredTrades, hasTrades, isBacktest]);

  const chartData = useMemo(() => {
    if (statsData.length === 0) return null;

    const totalRData = statsData.map(s => s.totalR);
    const winRateData = statsData.map(s => +s.winRate.toFixed(1));

    return {
      labels: RR_LEVELS.map(r => `1:${r}`),
      datasets: [
        {
          type: 'line',
          label: 'Win Rate %',
          data: winRateData,
          borderColor: COLORS.amber,
          backgroundColor: COLORS.amber,
          pointBackgroundColor: COLORS.amber,
          pointBorderColor: '#0D1117',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: COLORS.amberHover,
          tension: 0.3,
          yAxisID: 'y1',
          order: 1,
        },
        {
          type: 'bar',
          label: 'Total R',
          data: totalRData,
          backgroundColor: totalRData.map(v => (v >= 0 ? COLORS.win : COLORS.loss)),
          hoverBackgroundColor: totalRData.map(v => (v >= 0 ? COLORS.winHover : COLORS.lossHover)),
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

  const options = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      animation: {
        duration: 300,
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          align: 'end',
          labels: {
            color: COLORS.text,
            boxWidth: 8,
            boxHeight: 8,
            usePointStyle: true,
            pointStyle: 'circle',
            font: { family: "'Inter', sans-serif", size: 11, weight: '500' },
            padding: 16,
          },
        },
        tooltip: {
          enabled: true,
          backgroundColor: COLORS.tooltipBg,
          borderColor: COLORS.tooltipBorder,
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          titleColor: COLORS.textLight,
          titleFont: { family: "'Space Grotesk', sans-serif", size: 12, weight: '600' },
          bodyColor: COLORS.text,
          bodyFont: { family: "'IBM Plex Mono', monospace", size: 11 },
          bodySpacing: 4,
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
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: COLORS.textLight,
            font: { family: "'IBM Plex Mono', monospace", size: 11, weight: '500' },
          },
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          grid: {
            color: COLORS.grid,
            drawBorder: false,
          },
          title: {
            display: true,
            text: 'Total R',
            color: COLORS.text,
            font: { family: "'Inter', sans-serif", size: 10, weight: '600' },
          },
          ticks: {
            color: COLORS.text,
            font: { family: "'IBM Plex Mono', monospace", size: 10 },
            callback: (v) => `${v > 0 ? '+' : ''}${v}R`,
          },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          grid: { display: false },
          min: 0,
          max: 100,
          title: {
            display: true,
            text: 'Win Rate %',
            color: COLORS.amber,
            font: { family: "'Inter', sans-serif", size: 10, weight: '600' },
          },
          ticks: {
            color: COLORS.amber,
            font: { family: "'IBM Plex Mono', monospace", size: 10 },
            callback: (v) => `${v}%`,
          },
        },
      },
    };
  }, []);

  if (!hasTrades) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: '220px',
          color: COLORS.textMuted,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '12px',
          border: `1px dashed ${COLORS.grid}`,
          borderRadius: '10px',
          background: 'rgba(17, 21, 31, 0.4)',
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          style={{ marginBottom: '8px', opacity: 0.6 }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
          />
        </svg>
        <span>No trade data recorded</span>
      </div>
    );
  }

  if (!isBacktest) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: '220px',
          color: COLORS.textMuted,
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: '12px',
          border: `1px dashed ${COLORS.grid}`,
          borderRadius: '10px',
          background: 'rgba(17, 21, 31, 0.4)',
          textAlign: 'center',
          padding: '20px',
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          style={{ marginBottom: '8px', opacity: 0.6 }}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
          />
        </svg>
        <span>Only Available for Backtest Accounts</span>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '220px' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}