import { tile } from './shared.js';
import { ok, parseLines, performanceStats } from '../lib/math.js';

export const edgeCalculators = [
  {
    id: 'risk-reward',
    category: 'edge',
    title: 'Risk : Reward',
    desc: 'R:R from your prices, the win rate you need to break even and expectancy at your win rate.',
    keywords: ['rr', 'r:r', 'reward', 'breakeven win rate', 'ratio'],
    fields: [
      { key: 'entry', label: 'Entry', default: '21000', step: 0.25 },
      { key: 'stop', label: 'Stop', default: '20980', step: 0.25 },
      { key: 'target', label: 'Target', default: '21050', step: 0.25 },
      { key: 'winRate', label: 'Your win rate', suffix: '%', default: '45', step: 1, min: 0, optional: true },
    ],
    compute(p) {
      const { entry, stop, target, winRate } = p;
      if (!ok(entry, stop, target)) return null;
      const risk = Math.abs(entry - stop);
      const reward = Math.abs(target - entry);
      if (risk === 0) return { error: 'Entry and stop are the same price.' };
      if ((entry - stop) * (target - entry) <= 0) return { error: 'Target must be on the opposite side of entry from the stop.' };
      const rr = reward / risk;
      const be = (1 / (1 + rr)) * 100;
      const tiles = [
        tile('Risk : Reward', `1 : ${rr.toFixed(2)}`, 'text', { primary: true, copy: rr.toFixed(2), sub: entry > stop ? 'Long' : 'Short' }),
        tile('Breakeven win rate', be, 'pct'),
        tile('Risk', risk, 'num', { decimals: 2, sub: 'points' }),
        tile('Reward', reward, 'num', { decimals: 2, sub: 'points' }),
      ];
      if (ok(winRate) && winRate > 0 && winRate < 100) {
        const w = winRate / 100;
        tiles.push(
          tile('Expectancy / trade', w * rr - (1 - w), 'r', { tone: 'auto' }),
          tile('Edge vs breakeven', winRate - be, 'pct', { tone: 'auto', decimals: 1, sub: 'percentage points' }),
        );
      }
      return { tiles };
    },
  },
  {
    id: 'expectancy',
    category: 'edge',
    title: 'Expectancy & Profit Factor',
    desc: 'What each trade is worth on average, from your win rate and average win and loss.',
    keywords: ['expectancy', 'profit factor', 'payoff', 'edge', 'average win'],
    fields: [
      { key: 'winRate', label: 'Win rate', suffix: '%', default: '45', step: 1, min: 0 },
      { key: 'avgWin', label: 'Average win', prefix: '$', default: '300', step: 10, min: 0 },
      { key: 'avgLoss', label: 'Average loss', prefix: '$', default: '150', step: 10, min: 0 },
      { key: 'trades', label: 'Number of trades', default: '100', step: 10, min: 1 },
    ],
    compute(p) {
      const { winRate, avgWin, avgLoss, trades } = p;
      if (!ok(winRate, avgWin, avgLoss) || avgWin <= 0 || avgLoss <= 0) return null;
      if (winRate <= 0 || winRate >= 100) return { error: 'Win rate must be between 0 and 100.' };
      const w = winRate / 100;
      const exp = w * avgWin - (1 - w) * avgLoss;
      const rr = avgWin / avgLoss;
      const tiles = [
        tile('Expectancy / trade', exp, 'money', { primary: true, tone: 'auto', sub: `${(exp / avgLoss).toFixed(2)}R per trade` }),
        tile('Profit factor', (w * avgWin) / ((1 - w) * avgLoss), 'num', { decimals: 2 }),
        tile('Payoff ratio', rr, 'x'),
        tile('Breakeven win rate', (1 / (1 + rr)) * 100, 'pct'),
      ];
      if (ok(trades) && trades > 0) tiles.push(tile(`Expected P&L, ${Math.round(trades)} trades`, exp * trades, 'money', { tone: 'auto' }));
      return { tiles, warning: exp <= 0 ? 'Negative expectancy. This system loses money over time.' : null };
    },
  },
  {
    id: 'trade-stats',
    category: 'edge',
    title: 'Trade Stats from Totals',
    desc: 'Win rate, profit factor and expectancy from your gross profit, gross loss and trade counts.',
    keywords: ['gross profit', 'gross loss', 'profit factor', 'win rate', 'statistics', 'summary'],
    fields: [
      { key: 'gp', label: 'Gross profit', prefix: '$', default: '12500', step: 100, min: 0 },
      { key: 'gl', label: 'Gross loss (positive number)', prefix: '$', default: '8200', step: 100, min: 0 },
      { key: 'wins', label: 'Winning trades', default: '48', step: 1, min: 0 },
      { key: 'losses', label: 'Losing trades', default: '52', step: 1, min: 0 },
    ],
    compute(p) {
      const { gp, gl, wins, losses } = p;
      if (!ok(gp, gl, wins, losses)) return null;
      const n = wins + losses;
      if (n <= 0) return null;
      const avgW = wins > 0 ? gp / wins : 0;
      const avgL = losses > 0 ? gl / losses : 0;
      const net = gp - gl;
      return {
        tiles: [
          tile('Net P&L', net, 'money', { primary: true, tone: 'auto', sub: `${n} trades` }),
          tile('Win rate', (wins / n) * 100, 'pct'),
          tile('Profit factor', gl > 0 ? gp / gl : NaN, 'num', { decimals: 2 }),
          tile('Average win', avgW, 'money'),
          tile('Average loss', avgL, 'money'),
          tile('Payoff ratio', avgL > 0 ? avgW / avgL : NaN, 'x'),
          tile('Expectancy / trade', net / n, 'money', { tone: 'auto' }),
          tile('Expectancy (R)', avgL > 0 ? net / n / avgL : NaN, 'r', { tone: 'auto' }),
        ],
      };
    },
  },
  {
    id: 'scale-out',
    category: 'edge',
    title: 'Scale-out Planner',
    desc: 'Blended R:R across several partial exits, with the break-even-stop scenario.',
    keywords: ['partials', 'scale out', 'take profit', 'tp1', 'blended', 'runner'],
    fields: [
      { key: 'entry', label: 'Entry', default: '21000', step: 0.25 },
      { key: 'stop', label: 'Stop', default: '20980', step: 0.25 },
      { key: 'contracts', label: 'Contracts', default: '4', step: 1, min: 0 },
      { key: 'pv', label: '$ per point / contract', prefix: '$', default: '20', step: 1, min: 0 },
      { key: 'targets', label: 'Targets: price, % of position (one per line)', type: 'textarea', rows: 4, default: '21020, 50\n21040, 25\n21080, 25' },
      {
        key: 'moveBE', label: 'Move stop to entry after TP1', type: 'segment', default: 'yes',
        options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }],
      },
    ],
    compute(p) {
      const { entry, stop, contracts, pv } = p;
      const rows = parseLines(p.targets);
      if (!ok(entry, stop, contracts) || contracts <= 0 || rows.length === 0) return null;
      const dist = Math.abs(entry - stop);
      if (dist === 0) return { error: 'Entry and stop are the same price.' };
      const long = stop < entry;
      const tg = [];
      for (const [price, pct] of rows) {
        if (!ok(price, pct) || pct <= 0) return { error: 'Each target line needs "price, percent".' };
        if (long ? price <= entry : price >= entry) return { error: `Target ${price} is on the wrong side of entry.` };
        tg.push({ price, pct });
      }
      const sum = tg.reduce((a, t) => a + t.pct, 0);
      const w = tg.map((t) => t.pct / sum);
      const Rs = tg.map((t) => Math.abs(t.price - entry) / dist);
      const blended = w.reduce((a, x, i) => a + x * Rs[i], 0);
      const pvv = ok(pv) ? pv : 1;
      const out = tg.map((t, i) => ({
        n: `TP${i + 1}`,
        price: t.price,
        pct: w[i] * 100,
        units: contracts * w[i],
        r: Rs[i],
        pnl: contracts * w[i] * Math.abs(t.price - entry) * pvv,
      }));
      const tiles = [
        tile('Blended R if all hit', blended, 'r', { primary: true, tone: 'good' }),
        tile('Max risk', contracts * dist * pvv, 'money', { tone: 'bad' }),
        tile('Reward, all targets', out.reduce((a, r) => a + r.pnl, 0), 'money', { tone: 'good' }),
        tile('Breakeven win rate', (1 / (1 + blended)) * 100, 'pct', { sub: 'if every trade scales out like this' }),
      ];
      if (p.moveBE === 'yes') tiles.push(tile('TP1 hit, then stopped at entry', w[0] * Rs[0], 'r', { tone: 'auto' }));
      return {
        tiles,
        warning: Math.abs(sum - 100) > 0.01 ? `Sizes add up to ${sum}%. They were scaled to 100%.` : null,
        table: {
          title: 'Exit ladder',
          columns: [
            { key: 'n', label: 'Target', kind: 'text' },
            { key: 'price', label: 'Price', kind: 'price' },
            { key: 'pct', label: 'Size', kind: 'pct', decimals: 0 },
            { key: 'units', label: 'Contracts', kind: 'num', decimals: 2 },
            { key: 'r', label: 'R', kind: 'r' },
            { key: 'pnl', label: 'P&L', kind: 'money', auto: true },
          ],
          rows: out,
        },
      };
    },
  },
  {
    id: 'performance',
    category: 'edge',
    title: 'Sharpe & Sortino',
    desc: 'Paste your period returns to get risk-adjusted performance and max drawdown.',
    keywords: ['sharpe', 'sortino', 'returns', 'volatility', 'max drawdown', 'cagr'],
    fields: [
      { key: 'returns', label: 'Returns in % per period (commas, spaces or new lines)', type: 'textarea', rows: 5, default: '1.2, -0.8, 2.1, -1.0, 0.5, 1.8, -0.4, 0.9, -1.5, 2.4, 0.7, -0.3' },
      { key: 'ppy', label: 'Periods per year', default: '252', step: 1, min: 1 },
      { key: 'rf', label: 'Risk-free rate (annual)', suffix: '%', default: '0', step: 0.25, optional: true },
    ],
    compute(p) {
      const rets = String(p.returns).split(/[\s,;]+/).filter(Boolean).map(Number).filter(Number.isFinite);
      if (rets.length < 2 || !ok(p.ppy) || p.ppy <= 0) return null;
      const s = performanceStats(rets, p.ppy, p.rf);
      return {
        tiles: [
          tile('Sharpe ratio', s.sharpe, 'num', { primary: true, decimals: 2, tone: 'auto' }),
          tile('Sortino ratio', s.sortino, 'num', { decimals: 2, tone: 'auto' }),
          tile('Max drawdown', s.maxDD, 'pct', { tone: 'bad' }),
          tile('Total return', s.total, 'pct', { tone: 'auto' }),
          tile('Annualised return', s.cagr, 'pct', { tone: 'auto' }),
          tile('Volatility / period', s.sd, 'pct'),
          tile('Win rate', s.winRate, 'pct', { sub: `${s.n} periods` }),
          tile('Best / worst', `${s.best.toFixed(2)}% / ${s.worst.toFixed(2)}%`, 'text'),
        ],
        notes: s.n < 30 ? ['Fewer than 30 periods. Treat the ratios as rough guides only.'] : [],
      };
    },
  },
];
