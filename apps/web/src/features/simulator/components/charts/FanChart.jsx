// src/features/simulator/components/charts/FanChart.jsx

import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';

const COLORS = {
  median:     '#F59E0B',
  band75:     'rgba(245, 158, 11, 0.22)',
  band75Line: 'rgba(245, 158, 11, 0.48)',
  band95:     'rgba(245, 158, 11, 0.09)',
  band95Line: 'rgba(245, 158, 11, 0.30)',
  sampled:    'rgba(245, 158, 11, 0.18)',
  actual:     '#4C8BF5',
  zero:       'rgba(255, 255, 255, 0.16)',
  threshold:  'rgba(239, 68, 68, 0.60)',
  text:       '#8892A3',
  textLight:  '#E7E9EE',
  textDim:    '#545E6E',
  grid:       'rgba(255, 255, 255, 0.045)',
  tooltipBg:  '#12161F',
  tooltipBorder: 'rgba(255, 255, 255, 0.1)',
};

const fmt = (v, isMoney) => {
  if (v == null || Number.isNaN(v)) return '—';

  if (isMoney) {
    return `${v < 0 ? '-' : '+'}$${Math.abs(v).toFixed(2)}`;
  }

  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}R`;
};

const fmtAxis = (v, isMoney) => {
  if (v == null || Number.isNaN(v)) return '';

  if (isMoney) {
    const abs = Math.abs(v);
    const sign = v < 0 ? '-' : '';

    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
    if (abs >= 1_000)     return `${sign}$${(abs / 1_000).toFixed(1)}k`;

    return `${sign}$${abs.toFixed(0)}`;
  }

  const rounded = Math.round(v);

  if (rounded === 0) return '0R';

  return `${rounded > 0 ? '+' : ''}${rounded}R`;
};

/* ------------------------------------------------------------------ */
/* R-mode axis bounds                                                 */
/* ------------------------------------------------------------------ */

function computeRAxisBounds(percentiles, isDrawdown = false) {
  if (!percentiles) {
    return isDrawdown
      ? { min: -20, max: 0 }
      : { min: -20, max: 80 };
  }

  const { p5 = [], p95 = [] } = percentiles;
  const all = [...p5, ...p95, 0];

  let lo = Infinity;
  let hi = -Infinity;

  for (const v of all) {
    if (!Number.isFinite(v)) continue;

    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }

  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    return isDrawdown
      ? { min: -20, max: 0 }
      : { min: -20, max: 80 };
  }

  const STEP = 20;

  lo = Math.min(lo, 0);
  hi = Math.max(hi, 0);

  const pad = STEP * 0.25;

  if (isDrawdown) {
    // DD is always <= 0. Keep zero at the top of the chart.
    lo -= pad;
    hi = 0;
  } else {
    lo -= pad;
    hi += pad;
  }

  const min = Math.floor(lo / STEP) * STEP;
  const max = isDrawdown
    ? 0
    : Math.ceil(hi / STEP) * STEP;

  return { min, max };
}

/* ------------------------------------------------------------------ */
/* Convert a cumulative equity curve into drawdown                    */
/* ------------------------------------------------------------------ */

function toDrawdownCurve(curve) {
  if (!curve || curve.length === 0) return [];

  const out = new Array(curve.length);

  let peak = 0;

  for (let i = 0; i < curve.length; i++) {
    const equity = Number(curve[i]);

    if (Number.isFinite(equity) && equity > peak) {
      peak = equity;
    }

    out[i] = Number.isFinite(equity)
      ? equity - peak
      : 0;
  }

  return out;
}

export default function FanChart({
  result,
  actualCurve,
  isMoney,

  // "equity" = cumulative equity fan chart
  // "drawdown" = peak-to-current drawdown chart
  chartType = 'equity',

  showActual = true,
  showZeroLine = true,

  // Only meaningful for drawdown mode.
  showThresholdLine = true, 

  showSampled = true,
}) {
  const isDrawdown = chartType === 'drawdown';

  const chartData = useMemo(() => {
    if (!result) return null;

    const sourcePercentiles = isDrawdown
      ? result.drawdownPercentiles
      : result.percentiles;

    if (!sourcePercentiles) return null;

    const {
      p5,
      p25,
      p50,
      p75,
      p95,
    } = sourcePercentiles;

    const n = result.n;

    const labels = Array.from(
      { length: n + 1 },
      (_, i) => `#${i}`
    );

    const datasets = [];

    /* -------------------------------------------------------------- */
    /* Individual sampled paths                                       */
    /* -------------------------------------------------------------- */

    if (showSampled) {
      const sourceSamples = isDrawdown
        ? result.sampledDrawdownCurves
        : result.sampledCurves;

      if (sourceSamples && sourceSamples.length > 0) {
        sourceSamples.forEach((curve, i) => {
          datasets.push({
            label: `__sample_${i}`,
            data: curve,
            borderColor: COLORS.sampled,
            backgroundColor: 'transparent',
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0,
            borderWidth: 1,
            tension: 0.05,
            order: 6,
            __ref: true,
          });
        });
      }
    }

    /* -------------------------------------------------------------- */
    /* Outer 5–95% band                                               */
    /* -------------------------------------------------------------- */

    datasets.push({
      label: 'p5',
      data: p5,
      borderColor: 'transparent',
      backgroundColor: 'transparent',
      fill: false,
      pointRadius: 0,
      borderWidth: 0,
      order: 10,
    });

    datasets.push({
      label: 'p95',
      data: p95,
      borderColor: COLORS.band95Line,
      backgroundColor: COLORS.band95,
      fill: '-1',
      pointRadius: 0,
      borderWidth: 1,
      order: 9,
    });

    /* -------------------------------------------------------------- */
    /* Inner 25–75% band                                              */
    /* -------------------------------------------------------------- */

    datasets.push({
      label: 'p25',
      data: p25,
      borderColor: 'transparent',
      backgroundColor: 'transparent',
      fill: false,
      pointRadius: 0,
      borderWidth: 0,
      order: 8,
    });

    datasets.push({
      label: 'p75',
      data: p75,
      borderColor: COLORS.band75Line,
      backgroundColor: COLORS.band75,
      fill: '-1',
      pointRadius: 0,
      borderWidth: 1,
      order: 7,
    });

    /* -------------------------------------------------------------- */
    /* Median                                                         */
    /* -------------------------------------------------------------- */

    datasets.push({
      label: 'Median',
      data: p50,
      borderColor: COLORS.median,
      backgroundColor: COLORS.median,
      fill: false,
      pointRadius: 0,
      borderWidth: 2,
      tension: 0.05,
      order: 5,
    });

    /* -------------------------------------------------------------- */
    /* Actual path                                                    */
    /* -------------------------------------------------------------- */

    if (showActual && actualCurve && actualCurve.length === n + 1) {
      const actualData = isDrawdown
        ? toDrawdownCurve(actualCurve)
        : actualCurve;

      datasets.push({
        label: 'Actual Path',
        data: actualData,
        borderColor: COLORS.actual,
        backgroundColor: COLORS.actual,
        fill: false,
        pointRadius: 0,
        borderWidth: 1.5,
        borderDash: [4, 4],
        tension: 0.05,
        order: 3,
      });
    }

    /* -------------------------------------------------------------- */
    /* Zero / recovery line                                           */
    /* -------------------------------------------------------------- */

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
        order: 2,
        __ref: true,
      });
    }

    /* -------------------------------------------------------------- */
    /* DD threshold                                                    */
    /* IMPORTANT: only shown on the actual drawdown chart.           */
    /* -------------------------------------------------------------- */

    if (
      isDrawdown &&
      showThresholdLine &&
      result.ddThreshold != null &&
      Number.isFinite(Number(result.ddThreshold))
    ) {
      datasets.push({
        label: '__threshold',
        data: Array(n + 1).fill(Number(result.ddThreshold)),
        borderColor: COLORS.threshold,
        backgroundColor: 'transparent',
        fill: false,
        pointRadius: 0,
        borderWidth: 1.5,
        borderDash: [6, 4],
        order: 1,
        __ref: true,
      });
    }

    return {
      labels,
      datasets,
    };
  }, [
    result,
    actualCurve,
    isMoney,
    isDrawdown,
    showActual,
    showZeroLine,
    showThresholdLine,
    showSampled,
  ]);

  const axisPercentiles = isDrawdown
    ? result?.drawdownPercentiles
    : result?.percentiles;

  const rBounds = useMemo(
    () => computeRAxisBounds(axisPercentiles, isDrawdown),
    [axisPercentiles, isDrawdown]
  );

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,

    animation: {
      duration: 1500,
      easing: 'easeOutQuart',
    },

    interaction: {
      mode: 'index',
      intersect: false,
    },

    elements: {
      line: {
        capBezierPoints: true,
      },
    },

    plugins: {
      legend: {
        display: false,
      },

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
        titleFont: {
          family: "'IBM Plex Mono', monospace",
          size: 11,
          weight: '700',
        },

        titleMarginBottom: 8,

        bodyColor: COLORS.text,
        bodyFont: {
          family: "'IBM Plex Mono', monospace",
          size: 11,
        },

        bodySpacing: 4,

        callbacks: {
          title: (items) => {
            const index = items[0]?.dataIndex ?? 0;
            return `${isDrawdown ? 'Drawdown' : 'Equity'} · Trade #${index}`;
          },

          label: (item) => {
            const lbl = item.dataset.label;

            if (lbl === 'p5' || lbl === 'p25') return null;
            if (lbl === '__zero' || lbl === '__threshold') return null;
            if (lbl.startsWith('__sample_')) return null;

            const v = item.parsed.y;

            const name =
              lbl === 'p95'
                ? (isDrawdown ? '95th %ile (shallow)' : '95th %ile')
                : lbl === 'p75'
                  ? (isDrawdown ? '75th %ile' : '75th %ile')
                  : lbl === 'Median'
                    ? 'Median'
                    : lbl === 'Actual Path'
                      ? 'Actual'
                      : lbl;

            return `  ${name.padEnd(10)} ${fmt(v, isMoney)}`;
          },

          filter: (item) => {
            const lbl = item.dataset.label;

            if (lbl === 'p5' || lbl === 'p25') return false;
            if (lbl === '__zero' || lbl === '__threshold') return false;
            if (lbl.startsWith('__sample_')) return false;

            return true;
          },
        },
      },
    },

    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false,
        },

        ticks: {
          display: false,
        },
      },

      y: isMoney
        ? {
            grid: {
              color: COLORS.grid,
              drawBorder: false,
            },

            ticks: {
              color: COLORS.text,
              padding: 8,

              font: {
                family: "'IBM Plex Mono', monospace",
                size: 10,
              },

              callback: (v) => fmtAxis(v, true),
            },
          }
        : {
            min: rBounds.min,
            max: rBounds.max,

            grid: {
              color: COLORS.grid,
              drawBorder: false,
            },

            ticks: {
              color: COLORS.text,
              padding: 8,

              font: {
                family: "'IBM Plex Mono', monospace",
                size: 10,
              },

              stepSize: isDrawdown ? 5 : 20,
              autoSkip: false,

              callback: (v) => fmtAxis(v, false),
            },
          },
    },
  }), [
    isMoney,
    isDrawdown,
    rBounds,
  ]);

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
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      minHeight: 400,
    }}>
      <Line data={chartData} options={options} />
    </div>
  );
}