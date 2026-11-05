import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import '@/shared/charts/register';
import { chartColors, baseTooltip, baseAxis } from '@/shared/charts/theme';
import { useChartColors } from '@/shared/charts';
import { thinIndices } from '../../lib/stats';
import { fmtAxis, fmtUnit } from '../../lib/format';

const MAX_POINTS = 400;
const MAX_PATHS = 30;

/** Underwater curve: how far below its running peak a run sits at each trade. */
export default function DrawdownChart({ result, isMoney, showPaths = true }) {
  const colors = useChartColors();

  const { data, options } = useMemo(() => {
    const n = result.n;
    const idx = thinIndices(n + 1, MAX_POINTS);
    const pts = (arr) => idx.map((i) => ({ x: i, y: arr[i] }));
    const D = result.drawdownPercentiles;
    const limit = Number.isFinite(result.ddThreshold) ? result.ddThreshold : null;

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

    if (showPaths && result.sampledDrawdownCurves?.length) {
      const stride = Math.max(1, Math.floor(result.sampledDrawdownCurves.length / MAX_PATHS));
      for (let k = 0; k < result.sampledDrawdownCurves.length; k += stride) {
        datasets.push(
          line(`path ${k}`, result.sampledDrawdownCurves[k], {
            borderColor: 'rgba(255,255,255,0.06)',
            borderWidth: 1,
            pointHoverRadius: 0,
            skipTooltip: true,
            order: 9,
          })
        );
      }
    }

    datasets.push(line('Worst 5%', D.p5, { borderColor: chartColors.loss, backgroundColor: 'rgba(255,92,92,0.10)', fill: 'origin', order: 3 }));
    datasets.push(line('25th pct', D.p25, { borderColor: colors.accent, order: 2 }));
    datasets.push(line('Median', D.p50, { borderColor: chartColors.textLight, borderWidth: 2, order: 1 }));

    if (limit != null) {
      datasets.push({
        label: 'Limit',
        data: [{ x: 0, y: limit }, { x: n, y: limit }],
        borderColor: 'rgba(255,92,92,0.75)',
        borderDash: [6, 5],
        borderWidth: 1.25,
        pointRadius: 0,
        pointHoverRadius: 0,
        skipTooltip: true,
        order: 0,
      });
    }

    const fmt = (v) => fmtUnit(v, isMoney);

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
            callbacks: {
              title: (items) => `After trade ${items[0]?.parsed?.x ?? 0}`,
              label: (ctx) => `${ctx.dataset.label}: ${fmt(ctx.parsed.y)} below peak`,
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
            max: 0,
            ticks: { callback: (v) => fmtAxis(v, isMoney), color: chartColors.text, font: { size: 10 } },
          }),
        },
      },
    };
  }, [result, isMoney, showPaths, colors]);

  return (
    <div className="sx-chart" style={{ height: 320 }}>
      <Line data={data} options={options} />
    </div>
  );
}
