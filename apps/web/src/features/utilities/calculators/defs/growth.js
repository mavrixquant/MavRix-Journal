import { tile } from './shared.js';
import { ok, clamp } from '../lib/math.js';

export const growthCalculators = [
  {
    id: 'compounding',
    category: 'growth',
    title: 'Compounding Projector',
    desc: 'Project account growth from a monthly return, with optional deposits or withdrawals.',
    keywords: ['compound', 'growth', 'projection', 'monthly return', 'deposit', 'withdrawal'],
    fields: [
      { key: 'start', label: 'Starting balance', prefix: '$', default: '10000', step: 1000, min: 0 },
      { key: 'rate', label: 'Monthly return', suffix: '%', default: '3', step: 0.5 },
      { key: 'months', label: 'Months', default: '24', step: 1, min: 1 },
      { key: 'contrib', label: 'Monthly deposit (+) / withdrawal (−)', prefix: '$', default: '0', step: 100, optional: true },
    ],
    compute(p) {
      const { start, rate, months } = p;
      const c = ok(p.contrib) ? p.contrib : 0;
      if (!ok(start, rate, months) || start < 0 || months < 1) return null;
      const n = Math.min(Math.round(months), 600);
      const r = rate / 100;
      const step = n <= 24 ? 1 : n <= 120 ? 6 : 12;
      let bal = start;
      const rows = [];
      for (let m = 1; m <= n; m += 1) {
        bal = bal * (1 + r) + c;
        if (m % step === 0 || m === n) rows.push({ m, bal, paid: start + c * m, profit: bal - start - c * m });
      }
      const invested = start + c * n;
      return {
        tiles: [
          tile('Final balance', bal, 'money', { primary: true, tone: 'auto', decimals: 0 }),
          tile('Total profit', bal - invested, 'money', { tone: 'auto', decimals: 0 }),
          tile('Total deposited', invested, 'money', { decimals: 0 }),
          tile('Return on deposits', invested > 0 ? ((bal - invested) / invested) * 100 : NaN, 'pct', { decimals: 1 }),
          tile('Equivalent annual rate', ((1 + r) ** 12 - 1) * 100, 'pct', { decimals: 1 }),
        ],
        warning: bal < 0 ? 'Withdrawals exhaust the account before the period ends.' : null,
        table: {
          title: 'Balance over time',
          columns: [
            { key: 'm', label: 'Month', kind: 'int' },
            { key: 'bal', label: 'Balance', kind: 'money', decimals: 0 },
            { key: 'paid', label: 'Deposited', kind: 'money', decimals: 0 },
            { key: 'profit', label: 'Profit', kind: 'money', decimals: 0, auto: true },
          ],
          rows,
        },
        notes: ['Returns are assumed constant and deposits land at month end. Real results vary, so use this as a planning aid.'],
      };
    },
  },
  {
    id: 'drawdown-recovery',
    category: 'growth',
    title: 'Drawdown Recovery',
    desc: 'The gain you need to get back to even after a loss — it is always larger than the loss.',
    keywords: ['drawdown', 'recovery', 'loss', 'breakeven', 'gain needed'],
    fields: [
      { key: 'dd', label: 'Drawdown', suffix: '%', default: '20', step: 1, min: 0 },
      { key: 'balance', label: 'Balance before drawdown', prefix: '$', default: '10000', step: 500, min: 0, optional: true },
    ],
    compute(p) {
      const { dd, balance } = p;
      if (!ok(dd) || dd <= 0) return null;
      if (dd >= 100) return { error: 'Drawdown must be below 100%.' };
      const d = dd / 100;
      const need = (1 / (1 - d) - 1) * 100;
      const tiles = [
        tile('Gain needed to recover', need, 'pct', { primary: true, tone: 'accent', sub: `after a ${dd}% drawdown` }),
        tile('Equity remaining', (1 - d) * 100, 'pct'),
      ];
      if (ok(balance) && balance > 0) {
        tiles.push(tile('Balance after drawdown', balance * (1 - d), 'money'), tile('Dollars to recover', balance * d, 'money'));
      }
      return {
        tiles,
        table: {
          title: 'Recovery curve',
          columns: [{ key: 'dd', label: 'Drawdown', kind: 'pct', decimals: 0 }, { key: 'need', label: 'Gain to recover', kind: 'pct', decimals: 1 }],
          rows: [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 90].map((x) => ({ dd: x, need: (1 / (1 - x / 100) - 1) * 100, highlight: x === Math.round(dd) })),
        },
      };
    },
  },
  {
    id: 'goal-planner',
    category: 'growth',
    title: 'Goal Planner',
    desc: 'How long a target takes at a given return, or the return needed to hit it by a date.',
    keywords: ['goal', 'target', 'time to reach', 'required return', 'plan'],
    fields: [
      {
        key: 'mode', label: 'Solve for', type: 'segment', default: 'time',
        options: [{ value: 'time', label: 'Time needed' }, { value: 'rate', label: 'Return needed' }],
      },
      { key: 'start', label: 'Starting balance', prefix: '$', default: '10000', step: 1000, min: 0 },
      { key: 'target', label: 'Target balance', prefix: '$', default: '50000', step: 1000, min: 0 },
      { key: 'rate', label: 'Monthly return', suffix: '%', default: '5', step: 0.5, showIf: (p) => p.mode === 'time' },
      { key: 'months', label: 'Months available', default: '24', step: 1, min: 1, showIf: (p) => p.mode === 'rate' },
    ],
    compute(p) {
      const { start, target } = p;
      if (!ok(start, target) || start <= 0 || target <= 0) return null;
      if (target <= start) return { error: 'Target must be higher than your starting balance.' };
      if (p.mode === 'time') {
        if (!ok(p.rate) || p.rate <= 0) return null;
        const n = Math.log(target / start) / Math.log(1 + p.rate / 100);
        return {
          tiles: [
            tile('Months needed', n, 'num', { primary: true, decimals: 1 }),
            tile('Years', n / 12, 'num', { decimals: 2 }),
            tile('Trading days (≈21/mo)', n * 21, 'int'),
            tile('Total growth', (target / start - 1) * 100, 'pct', { decimals: 0 }),
          ],
        };
      }
      if (!ok(p.months) || p.months < 1) return null;
      const r = (target / start) ** (1 / p.months) - 1;
      return {
        tiles: [
          tile('Monthly return needed', r * 100, 'pct', { primary: true, tone: r > 0.1 ? 'bad' : r > 0.05 ? 'accent' : 'good' }),
          tile('Annualised', ((1 + r) ** 12 - 1) * 100, 'pct', { decimals: 1 }),
          tile('Total growth', (target / start - 1) * 100, 'pct', { decimals: 0 }),
        ],
        warning: r > 0.1 ? 'Returns above ~10% per month are rarely sustainable. Consider a longer horizon.' : null,
      };
    },
  },
  {
    id: 'prop-challenge',
    category: 'growth',
    title: 'Prop Challenge Planner',
    desc: 'What a profit target demands per day and per trade, and how long your edge needs to get there.',
    keywords: ['prop', 'challenge', 'evaluation', 'profit target', 'funded', 'days'],
    fields: [
      { key: 'target', label: 'Profit target', prefix: '$', default: '3000', step: 100, min: 0 },
      { key: 'days', label: 'Trading days available', default: '20', step: 1, min: 1 },
      { key: 'tpd', label: 'Trades per day', default: '2', step: 1, min: 1 },
      { key: 'risk', label: 'Risk per trade', prefix: '$', default: '250', step: 25, min: 0 },
      { key: 'winRate', label: 'Win rate', suffix: '%', default: '50', step: 1, min: 0 },
      { key: 'rr', label: 'Average R:R', suffix: 'R', default: '2', step: 0.25, min: 0 },
    ],
    compute(p) {
      const { target, days, tpd, risk, winRate, rr } = p;
      if (!ok(target, days, tpd, risk, winRate, rr) || target <= 0 || days < 1 || tpd < 1 || risk <= 0 || rr <= 0) return null;
      const w = clamp(winRate, 0, 100) / 100;
      const expR = w * rr - (1 - w);
      const perDay = expR * tpd * risk;
      const need = target / risk;
      const tiles = [
        tile('Required per day', target / days, 'money', { primary: true }),
        tile('Total R needed', need, 'r', { decimals: 1 }),
        tile('Required R per trade', need / (days * tpd), 'r'),
        tile('Expected R per trade', expR, 'r', { tone: 'auto' }),
        tile('Expected $ per day', perDay, 'money', { tone: 'auto' }),
      ];
      if (perDay > 0) {
        const d = target / perDay;
        tiles.push(tile('Expected days to target', d, 'num', { decimals: 1, tone: d <= days ? 'good' : 'bad', sub: d <= days ? 'Within your window' : 'Beyond your window' }));
      }
      return { tiles, warning: expR <= 0 ? 'Your expected R per trade is not positive, so the target is not reachable on average.' : null };
    },
  },
  {
    id: 'return-calc',
    category: 'growth',
    title: 'Return & CAGR',
    desc: 'Percentage change between two values and the annualised growth rate.',
    keywords: ['return', 'percent change', 'cagr', 'annualised', 'roi', 'multiple'],
    fields: [
      { key: 'start', label: 'Start value', prefix: '$', default: '10000', step: 500 },
      { key: 'end', label: 'End value', prefix: '$', default: '14500', step: 500 },
      { key: 'days', label: 'Days held', default: '365', step: 1, min: 0, optional: true },
    ],
    compute(p) {
      const { start, end, days } = p;
      if (!ok(start, end) || start <= 0) return null;
      const ch = (end / start - 1) * 100;
      const tiles = [
        tile('Return', ch, 'pct', { primary: true, tone: 'auto' }),
        tile('Change', end - start, 'money', { tone: 'auto' }),
        tile('Multiple', end / start, 'x'),
      ];
      if (ok(days) && days > 0 && end > 0) tiles.push(tile('Annualised (CAGR)', ((end / start) ** (365 / days) - 1) * 100, 'pct', { tone: 'auto' }));
      return { tiles };
    },
  },
];
