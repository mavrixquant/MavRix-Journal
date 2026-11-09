import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import '@/shared/charts/register';
import { chartColors, baseTooltip, baseAxis } from '@/shared/charts/theme';
import { useChartColors } from '@/shared/charts';
import { thinIndices } from '../../lib/stats';
import { fmtAxis, fmtUnit } from '../../lib/format';

const MAX_POINTS = 400;
const MAX_PATHS = 40;

/** Equity fan: p5-p95 and p25-p75 bands, median, sample paths, and your real curve. */
export default function FanChart({ result, actualCurve, isMoney, showPaths = true }) {
  const colors = useChartColors();

  const { data, options } = useMemo(() => {
    const n = result.n;
    const idx = thinIndices(n + 1, MAX_POINTS);
    const pts = (arr) => idx.filter((i) => i < arr.length).map((i) => ({ x: i, y: arr[i] }));
    const P = result.percentiles;

    const line = (label, arr, extra = {}) => ({
      label,
      data: pts(arr),
      pointRadius: 0,
      pointHoverRadius: 3,
      borderWidth: 1.5,
      tension: 0,
      ...extra,
    });

    const datasets = [];

    if (showPaths && result.sampledCurves?.length) {
      const stride = Math.max(1, Math.floor(result.sampledCurves.length / MAX_PATHS));
      for (let k = 0; k < result.sampledCurves.length; k += stride) {
        datasets.push(
          line(`path ${k}`, result.sampledCurves[k], {
            borderColor: 'rgba(255,255,255,0.07)',
            borderWidth: 1,
            pointHoverRadius: 0,
            skipTooltip: true,
            order: 9,
          })
        );
      }
    }

    // Outer band (p5-p95) then inner band (p25-p75): fill '-1' fills toward the previous dataset.
    datasets.push(line('p95', P.p95, { borderColor: 'transparent', borderWidth: 0, order: 6 }));
    datasets.push(line('p5', P.p5, { borderColor: 'transparent', borderWidth: 0, fill: '-1', backgroundColor: colors.withAlpha(0.1), order: 6 }));
    datasets.push(line('p75', P.p75, { borderColor: 'transparent', borderWidth: 0, order: 5 }));
    datasets.push(line('p25', P.p25, { borderColor: 'transparent', borderWidth: 0, fill: '-1', backgroundColor: colors.withAlpha(0.2), order: 5 }));
    datasets.push(line('Median', P.p50, { borderColor: colors.accent, borderWidth: 2.25, order: 2 }));

    if (actualCurve?.length > 1) {
      datasets.push(line('Actual', actualCurve, { borderColor: chartColors.blue, borderWidth: 2, order: 1 }));
    }

    const fmt = (v) => fmtUnit(v, isMoney, { sign: true });

    return {
      data: { datasets },
      options: {
        parsing: false,
        normalized: true,
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 250 },
        interaction: { mode: 'index', intersect: false, axis: 'x' },
        plugins: {
          legend: { display: false },
          tooltip: baseTooltip({
            filter: (item) => !item.dataset.skipTooltip,
            itemSort: (a, b) => b.parsed.y - a.parsed.y,
            callbacks: {
              title: (items) => `After trade ${items[0]?.parsed?.x ?? 0}`,
              label: (ctx) => `${ctx.dataset.label}: ${fmt(ctx.parsed.y)}`,
            },
          }),
        },
        scales: {
          x: baseAxis({
            type: 'linear',
            min: 0,
            max: n,
            grid: { display: false },
            ticks: { maxTicksLimit: 8, callback: (v) => Math.round(v), color: chartColors.text, font: { size: 10 } },
          }),
          y: baseAxis({
            grid: {
              color: (ctx) => (ctx.tick?.value === 0 ? chartColors.zeroLine : chartColors.grid),
            },
            ticks: { callback: (v) => fmtAxis(v, isMoney), color: chartColors.text, font: { size: 10 } },
          }),
        },
      },
    };
  }, [result, actualCurve, isMoney, showPaths, colors]);

  return (
    <div className="sx-chart" style={{ height: 380 }}>
      <Line data={data} options={options} />
    </div>
  );
}
