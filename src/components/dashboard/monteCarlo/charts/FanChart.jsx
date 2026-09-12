// src/components/dashboard/monteCarlo/charts/FanChart.jsx
import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';

/* ------------------------------------------------------------------ */
/*  Palette — matches the app's amber design system                    */
/* ------------------------------------------------------------------ */
const COLORS = {
  // Amber bands (matches --accent in the rest of the app)
  median:     '#F59E0B',
  band75:     'rgba(245, 158, 11, 0.22)',
  band75Line: 'rgba(245, 158, 11, 0.48)',
  band95:     'rgba(245, 158, 11, 0.09)',
  band95Line: 'rgba(245, 158, 11, 0.30)',

  // Actual execution path (blue, keeps it distinct from the amber bands)
  actual: '#4C8BF5',

  // Reference lines
  zero: 'rgba(255, 255, 255, 0.16)',
  ruin: 'rgba(239, 68, 68, 0.60)',

  // Text
  text:      '#8892A3',
  textLight: '#E7E9EE',
  textDim:   '#545E6E',
  grid:      'rgba(255, 255, 255, 0.045)',

  // Tooltip
  tooltipBg:     '#12161F',
  tooltipBorder: 'rgba(255, 255, 255, 0.1)',
};

/* ------------------------------------------------------------------ */
/*  Formatters                                                         */
/* ------------------------------------------------------------------ */
const fmt = (v, isMoney) => {
  if (v == null || Number.isNaN(v)) return '—';
  if (isMoney) return `${v < 0 ? '-' : '+'}$${Math.abs(v).toFixed(2)}`;
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`;
};

// Compact formatting for the Y-axis so long numbers don't crowd the axis
const fmtAxis = (v, isMoney) => {
  if (v == null || Number.isNaN(v)) return '';
  if (isMoney) {
    const abs = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(1)}k`;
    return `${sign}$${abs.toFixed(0)}`;
  }
  return `${v > 0 ? '+' : ''}${v.toFixed(0)}R`;
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function FanChart({
  result,
  actualCurve,
  isMoney,
  showActual = true,
  showZeroLine = true,
  showRuinLine = true,
}) {
  const chartData = useMemo(() => {
    if (!result) return null;
    const { percentiles, n, ruinThreshold } = result;
    const labels = Array.from({ length: n + 1 }, (_, i) => `#${i}`);

    const datasets = [
      // ---- Outer band (5th → 95th) -------------------------------
      // Invisible anchor at p5; p95 fills down to it via fill: '-1'
      {
        label: 'p5',
        data: percentiles.p5,
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        fill: false,
        pointRadius: 0,
        borderWidth: 0,
      },
      {
        label: 'p95',
        data: percentiles.p95,
        borderColor: COLORS.band95Line,
        backgroundColor: COLORS.band95,
        fill: '-1',
        pointRadius: 0,
        borderWidth: 1,
      },

      // ---- Inner band (25th → 75th) ------------------------------
      {
        label: 'p25',
        data: percentiles.p25,
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        fill: false,
        pointRadius: 0,
        borderWidth: 0,
      },
      {
        label: 'p75',
        data: percentiles.p75,
        borderColor: COLORS.band75Line,
        backgroundColor: COLORS.band75,
        fill: '-1',
        pointRadius: 0,
        borderWidth: 1,
      },

      // ---- Median ------------------------------------------------
      {
        label: 'Median',
        data: percentiles.p50,
        borderColor: COLORS.median,
        backgroundColor: COLORS.median,
        fill: false,
        pointRadius: 0,
        borderWidth: 2,
        tension: 0.05,
      },
    ];

    // ---- Actual execution path (dashed blue) -----------------------
    if (showActual && actualCurve && actualCurve.length === n + 1) {
      datasets.push({
        label: 'Actual Path',
        data: actualCurve,
        borderColor: COLORS.actual,
        backgroundColor: COLORS.actual,
        fill: false,
        pointRadius: 0,
        borderWidth: 1.5,
        borderDash: [4, 4],
        tension: 0.05,
      });
    }

    // ---- Reference lines -------------------------------------------
    if (showZeroLine) {
      datasets.push({
        label: '__zero',
        data: Array(n + 1).fill(0),
        borderColor: COLORS.zero,
        backgroundColor: 'transparent',
        fill: false,
        pointRadius: 0,
        borderWidth: 1,
        borderDash: [2, 4],
        __ref: true,
      });
    }

    if (showRuinLine && ruinThreshold != null) {
      datasets.push({
        label: '__ruin',
        data: Array(n + 1).fill(ruinThreshold),
        borderColor: COLORS.ruin,
        backgroundColor: 'transparent',
        fill: false,
        pointRadius: 0,
        borderWidth: 1.5,
        borderDash: [6, 4],
        __ref: true,
      });
    }

    return { labels, datasets };
  }, [result, actualCurve, showActual, showZeroLine, showRuinLine]);

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 250 },
    interaction: { mode: 'index', intersect: false },
    elements: {
      line: { capBezierPoints: true },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: COLORS.tooltipBg,
        borderColor: COLORS.tooltipBorder,
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
        displayColors: true,
        boxPadding: 4,
        titleColor: COLORS.textLight,
        titleFont: { family: "'IBM Plex Mono', monospace", size: 11, weight: '700' },
        titleMarginBottom: 8,
        bodyColor: COLORS.text,
        bodyFont: { family: "'IBM Plex Mono', monospace", size: 11 },
        bodySpacing: 4,
        callbacks: {
          title: (items) => `Trade #${items[0]?.dataIndex ?? 0}`,
          label: (item) => {
            const lbl = item.dataset.label;
            if (lbl === 'p5' || lbl === 'p25') return null;
            if (lbl === '__zero' || lbl === '__ruin') return null;
            const v = item.parsed.y;
            const name =
              lbl === 'p95'        ? '95th %ile' :
              lbl === 'p75'        ? '75th %ile' :
              lbl === 'Median'     ? 'Median' :
              lbl === 'Actual Path' ? 'Actual' :
              lbl;
            return `  ${name.padEnd(10)} ${fmt(v, isMoney)}`;
          },
          filter: (item) => {
            const lbl = item.dataset.label;
            return lbl !== 'p5' && lbl !== 'p25' && lbl !== '__zero' && lbl !== '__ruin';
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false, drawBorder: false },
        ticks: { display: false },
      },
      y: {
        grid: {
          color: COLORS.grid,
          drawBorder: false,
        },
        ticks: {
          color: COLORS.text,
          padding: 8,
          font: { family: "'IBM Plex Mono', monospace", size: 10 },
          callback: (v) => fmtAxis(v, isMoney),
        },
      },
    },
  }), [isMoney]);

  if (!chartData) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        minHeight: 400,
        color: COLORS.textDim,
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 12,
        letterSpacing: '.02em',
      }}>
        No simulation data yet.
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 400 }}>
      <Line data={chartData} options={options} />
    </div>
  );
}