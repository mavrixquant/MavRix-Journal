import { buildStatRows } from './statRows';
import { isNum } from './format';

const QUANTILE_LABELS = ['p5', 'p25', 'p50', 'p75', 'p95'];

function cell(value) {
  if (value == null || value === '') return '';
  let text;
  if (typeof value === 'number') {
    if (value === Infinity) text = 'Infinity';
    else if (value === -Infinity) text = '-Infinity';
    else text = Number.isFinite(value) ? String(value) : '';
  } else {
    text = String(value);
  }
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function download(rows, filename) {
  const csv = rows.map((r) => r.map(cell).join(',')).join('\r\n');
  // BOM so Excel opens it as UTF-8.
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const stamp = (r) => `${r.method}-${r.runs}-seed${r.seed}`;

export function exportSummaryCsv({ result, summary, meta }) {
  if (!result || !summary) return;
  const rows = [
    ['Monte Carlo summary'],
    ['Generated', new Date().toISOString()],
    [],
    ['Configuration'],
    ['Account', meta?.accountName ?? ''],
    ['Account type', meta?.accountType ?? ''],
    ['Units', result.unitMode === 'money' ? 'USD' : 'R'],
    ['Method', result.method],
    ['Runs', result.runs],
    ['Trades per run', result.n],
    ['Seed', result.seed],
    ['Block size', result.method === 'block' ? result.blockSize : ''],
    ['Starting capital', result.initialCapital || ''],
    ['USD per 1R', result.dollarsPerR || ''],
    ['Drawdown limit', isNum(result.ddThreshold) ? Math.abs(result.ddThreshold) : 'none'],
    [],
    ['Headline'],
    ['Probability of profit %', result.method === 'permutation' ? 'n/a (fixed P&L)' : summary.profitPct],
    ['Drawdown limit breach %', isNum(result.ddThreshold) ? summary.ddBreachPct : 'n/a'],
    ['Runs with infinite profit factor', result.infinitePfCount ?? 0],
    [],
    ['Percentiles', ...QUANTILE_LABELS],
  ];

  for (const row of buildStatRows(result)) {
    rows.push([row.label, ...row.values]);
  }

  if (result.timeToTarget?.length) {
    rows.push(
      [],
      ['Targets', 'P(ever reached) %', 'P(final >= target) %', 'First hit p25 (trade #)', 'First hit p50', 'First hit p75']
    );
    for (const t of result.timeToTarget) {
      rows.push([t.target, t.successPct, t.finalPct, t.p25Trades, t.medianTrades, t.p75Trades]);
    }
  }

  if (result.method === 'permutation') {
    rows.push(
      [],
      ['Note', 'Permutation keeps every trade, so final P&L is identical across runs; only the path changes.']
    );
  }

  download(rows, `monte-carlo-summary-${stamp(result)}.csv`);
}

export function exportRunsCsv({ result }) {
  if (!result) return;
  const rows = [
    [
      'Run',
      'Final P&L',
      'Max drawdown',
      'Max drawdown % of capital',
      'Drawdown limit breach trade #',
      'Recovery trades (-1 = never)',
      'Sharpe',
      'Sortino',
      'Profit factor',
      'Expectancy',
      'Win rate %',
      'Longest win streak',
      'Longest loss streak',
    ],
  ];
  for (let i = 0; i < result.runs; i++) {
    rows.push([
      i + 1,
      result.finalValues?.[i],
      result.maxDDs?.[i],
      result.maxDDPct?.[i],
      result.ddBreachTrades?.[i],
      result.recoveryTrades?.[i],
      result.sharpes?.[i],
      result.sortinos?.[i],
      result.runProfitFactorInfinite?.[i] ? 'Infinity' : result.runProfitFactors?.[i],
      result.expectancies?.[i],
      isNum(result.winRates?.[i]) ? result.winRates[i] * 100 : '',
      result.longestWins?.[i],
      result.longestLosses?.[i],
    ]);
  }
  download(rows, `monte-carlo-runs-${stamp(result)}.csv`);
}
