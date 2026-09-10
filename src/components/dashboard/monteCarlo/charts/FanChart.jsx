// src/components/dashboard/monteCarlo/charts/FanChart.jsx
import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';

const COLORS = {
  amber: '#FFB020',
  amberMed: 'rgba(255, 176, 32, 0.18)',
  amberDim: 'rgba(255, 176, 32, 0.08)',
  actual: '#4C8BF5',
  text: '#8892A3',
  textLight: '#E7E9EE',
  grid: '#1A2029',
  tooltipBg: '#11151F',
  tooltipBorder: '#212836',
};

const fmt = (v, isMoney) => {
  if (isMoney) return `${v >= 0 ? '+' : '-'}$${Math.abs(v).toFixed(2)}`;
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`;
};

export default function FanChart({ result, actualCurve, isMoney, showActual = true }) {
  const chartData = useMemo(() => {
    if (!result) return null;
    const { percentiles, n } = result;
    const labels = Array.from({ length: n + 1 }, (_, i) => `#${i}`);

    const datasets = [
      // Invisible p5 anchor (start of outer band)
      { label: 'p5', data: percentiles.p5, borderColor: 'transparent', backgroundColor: 'transparent', fill: false, pointRadius: 0, borderWidth: 0 },
      // Outer band p5..p95
      { label: 'p95', data: percentiles.p95, borderColor: 'rgba(255,176,32,0.28)', backgroundColor: COLORS.amberDim, fill: '-1', pointRadius: 0, borderWidth: 1 },
      // Invisible p25 anchor
      { label: 'p25', data: percentiles.p25, borderColor: 'transparent', backgroundColor: 'transparent', fill: false, pointRadius: 0, borderWidth: 0 },
      // Inner band p25..p75
      { label: 'p75', data: percentiles.p75, borderColor: 'rgba(255,176,32,0.45)', backgroundColor: COLORS.amberMed, fill: '-1', pointRadius: 0, borderWidth: 1 },
      // Median
      { label: 'Median', data: percentiles.p50, borderColor: COLORS.amber, backgroundColor: COLORS.amber, fill: false, pointRadius: 0, borderWidth: 2 },
    ];

    if (showActual && actualCurve && actualCurve.length === n + 1) {
      datasets.push({
        label: 'Actual Path',
        data: actualCurve,
        borderColor: COLORS.actual,
        backgroundColor: COLORS.actual,
        fill: false,
        pointRadius: 0,
        borderWidth: 1.5,
        borderDash: [3, 3],
      });
    }

    return { labels, datasets };
  }, [result, actualCurve, showActual]);

  const options = useMemo(() => ({
    responsive: true, maintainAspectRatio: false,
    animation: { duration: 250 },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: COLORS.tooltipBg,
        borderColor: COLORS.tooltipBorder,
        borderWidth: 1, padding: 12, cornerRadius: 8,
        titleColor: COLORS.textLight,
        titleFont: { family: "'Space Grotesk', sans-serif", size: 12, weight: '600' },
        bodyColor: COLORS.text,
        bodyFont: { family: "'IBM Plex Mono', monospace", size: 11 },
        bodySpacing: 4,
        callbacks: {
          title: (items) => `Trade #${items[0]?.dataIndex ?? 0}`,
          label: (item) => {
            const lbl = item.dataset.label;
            if (lbl === 'p5' || lbl === 'p25') return '';
            const v = item.parsed.y;
            const name =
              lbl === 'p95' ? '95th' :
              lbl === 'p75' ? '75th' :
              lbl === 'Median' ? 'Median' :
              lbl === 'Actual Path' ? 'Actual' : lbl;
            return `${name.padEnd(8)}: ${fmt(v, isMoney)}`;
          },
          filter: (item) => item.dataset.label !== 'p5' && item.dataset.label !== 'p25',
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { display: false } },
      y: {
        grid: { color: COLORS.grid, drawBorder: false },
        ticks: {
          color: COLORS.text,
          font: { family: "'IBM Plex Mono', monospace", size: 10 },
          callback: (v) => isMoney ? `$${v}` : `${v > 0 ? '+' : ''}${v}R`,
        },
      },
    },
  }), [isMoney]);

  if (!chartData) return null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '400px' }}>
      <Line data={chartData} options={options} />
    </div>
  );
}