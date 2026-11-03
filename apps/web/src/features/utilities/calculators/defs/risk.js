import { tile, sideField, riskModeField, riskValueField } from './shared.js';
import { FUT_FIELDS, getFut, tickStep } from '../lib/instruments.js';
import { ok, decimalsOf, clamp, probStreak, ruinProbability } from '../lib/math.js';

export const riskCalculators = [
  {
    id: 'position-size',
    category: 'risk',
    title: 'Futures Position Size',
    desc: 'How many contracts you can trade so a stop-out costs exactly your risk budget.',
    keywords: ['contracts', 'size', 'nq', 'es', 'futures', 'risk per trade', 'stop'],
    fields: [
      ...FUT_FIELDS,
      { key: 'balance', label: 'Account balance', prefix: '$', default: '50000', step: 1000, min: 0 },
      riskModeField,
      riskValueField,
      { key: 'entry', label: 'Entry price', default: '21000', step: tickStep },
      { key: 'stop', label: 'Stop price', default: '20980', step: tickStep },
      { key: 'commission', label: 'Commission / contract (round-turn)', prefix: '$', default: '0', step: 0.5, min: 0 },
      { key: 'rr', label: 'Target R:R', suffix: 'R', default: '2', step: 0.5, min: 0 },
    ],
    compute(p) {
      const f = getFut(p);
      const { balance, riskValue, entry, stop, commission, rr } = p;
      if (!f || !ok(balance, riskValue, entry, stop) || balance <= 0 || riskValue <= 0) return null;
      const dist = Math.abs(entry - stop);
      if (dist === 0) return { error: 'Entry and stop are the same price.' };
      const long = stop < entry;
      const riskAmt = p.riskMode === 'usd' ? riskValue : (balance * riskValue) / 100;
      const perContract = dist * f.pv + (ok(commission) ? commission : 0);
      const contracts = Math.floor(riskAmt / perContract + 1e-9);
      const used = contracts * perContract;
      const d = Math.max(2, decimalsOf(f.tick));
      const tiles = [
        tile('Contracts', contracts, 'int', { primary: true, sub: `${long ? 'Long' : 'Short'} · $${riskAmt.toFixed(2)} budget` }),
        tile('Risk used', used, 'money', { sub: `${((used / balance) * 100).toFixed(2)}% of account` }),
        tile('Risk / contract', perContract, 'money'),
        tile('Stop distance', dist, 'num', { decimals: d, sub: `${(dist / f.tick).toFixed(1)} ticks` }),
      ];
      if (ok(rr) && rr > 0) {
        tiles.push(
          tile('Target price', long ? entry + dist * rr : entry - dist * rr, 'price', { decimals: d, sub: `${rr}R` }),
          tile('Reward at target', contracts * dist * rr * f.pv, 'money', { tone: 'good' }),
        );
      }
      return {
        tiles,
        warning:
          contracts === 0
            ? `Even 1 contract risks $${perContract.toFixed(2)}, above your $${riskAmt.toFixed(2)} budget. Tighten the stop, trade a micro, or raise the risk.`
            : null,
      };
    },
  },
  {
    id: 'stock-size',
    category: 'risk',
    title: 'Stock / Crypto Position Size',
    desc: 'Shares or coins to buy for a fixed-dollar risk, with leverage check.',
    keywords: ['shares', 'stock', 'crypto', 'spot', 'units', 'equity'],
    fields: [
      { key: 'balance', label: 'Account balance', prefix: '$', default: '25000', step: 500, min: 0 },
      riskModeField,
      riskValueField,
      { key: 'entry', label: 'Entry price', default: '100', step: 0.01 },
      { key: 'stop', label: 'Stop price', default: '97', step: 0.01 },
      { key: 'fees', label: 'Fees (round-trip total)', prefix: '$', default: '0', step: 1, min: 0 },
      { key: 'rr', label: 'Target R:R', suffix: 'R', default: '2', step: 0.5, min: 0 },
      {
        key: 'rounding', label: 'Quantity', type: 'segment', default: 'whole',
        options: [{ value: 'whole', label: 'Whole shares' }, { value: 'frac', label: 'Fractional' }],
      },
    ],
    compute(p) {
      const { balance, riskValue, entry, stop, fees, rr } = p;
      if (!ok(balance, riskValue, entry, stop) || balance <= 0 || riskValue <= 0 || entry <= 0) return null;
      const dist = Math.abs(entry - stop);
      if (dist === 0) return { error: 'Entry and stop are the same price.' };
      const long = stop < entry;
      const riskAmt = p.riskMode === 'usd' ? riskValue : (balance * riskValue) / 100;
      const budget = riskAmt - (ok(fees) ? fees : 0);
      if (budget <= 0) return { error: 'Fees are larger than your risk budget.' };
      let qty = budget / dist;
      qty = p.rounding === 'frac' ? Math.floor(qty * 10000) / 10000 : Math.floor(qty + 1e-9);
      const value = qty * entry;
      const lev = value / balance;
      const tiles = [
        tile('Quantity', qty, p.rounding === 'frac' ? 'num' : 'int', { primary: true, sub: long ? 'Long' : 'Short', decimals: 4 }),
        tile('Position value', value, 'money', { sub: `${(lev * 100).toFixed(0)}% of account` }),
        tile('Risk used', qty * dist + (ok(fees) ? fees : 0), 'money'),
        tile('Leverage needed', lev, 'x', { tone: lev > 1 ? 'warn' : undefined }),
      ];
      if (ok(rr) && rr > 0) {
        tiles.push(
          tile('Target price', long ? entry + dist * rr : entry - dist * rr, 'price'),
          tile('Reward at target', qty * dist * rr - (ok(fees) ? fees : 0), 'money', { tone: 'good' }),
        );
      }
      return {
        tiles,
        warning: lev > 1 ? `This position is ${lev.toFixed(2)}× your balance, so it needs margin.` : null,
        notes: qty === 0 ? ['Your stop is too wide for the budget. Narrow it or raise the risk.'] : [],
      };
    },
  },
  {
    id: 'risk-of-ruin',
    category: 'risk',
    title: 'Risk of Ruin',
    desc: 'Chance of hitting a ruin drawdown given your win rate, payoff and risk per trade.',
    keywords: ['ruin', 'blow up', 'drawdown', 'survival', 'probability'],
    fields: [
      { key: 'winRate', label: 'Win rate', suffix: '%', default: '45', step: 1, min: 0 },
      { key: 'rr', label: 'Avg win ÷ avg loss', suffix: 'R', default: '2', step: 0.1, min: 0 },
      { key: 'riskPct', label: 'Risk per trade', suffix: '%', default: '1', step: 0.25, min: 0 },
      { key: 'ruinDD', label: 'Ruin = drawdown of', suffix: '%', default: '50', step: 5, min: 0 },
    ],
    compute(p) {
      const { winRate, rr, riskPct, ruinDD } = p;
      if (!ok(winRate, rr, riskPct, ruinDD) || riskPct <= 0 || ruinDD <= 0 || rr <= 0) return null;
      if (winRate <= 0 || winRate >= 100) return { error: 'Win rate must be between 0 and 100.' };
      const pw = winRate / 100;
      const units = Math.ceil(ruinDD / riskPct - 1e-9);
      const ruin = ruinProbability(pw, rr, units) * 100;
      const exp = pw * rr - (1 - pw);
      return {
        tiles: [
          tile('Risk of ruin', ruin, 'pct', {
            primary: true,
            decimals: ruin < 0.01 ? 4 : 2,
            tone: ruin < 1 ? 'good' : ruin < 5 ? 'accent' : 'bad',
            sub: ruin < 1 ? 'Comfortable' : ruin < 5 ? 'Borderline' : 'Too high',
          }),
          tile('Expectancy / trade', exp, 'r', { tone: 'auto' }),
          tile('Losses in a row to ruin', units, 'int'),
          tile('Risk units available', ruinDD / riskPct, 'num', { decimals: 1 }),
        ],
        warning: exp <= 0 ? 'Negative expectancy means ruin is certain over enough trades.' : null,
        notes: ['Assumes independent trades with fixed risk per trade (no compounding) and a constant payoff ratio.'],
      };
    },
  },
  {
    id: 'kelly',
    category: 'risk',
    title: 'Kelly Criterion',
    desc: 'Mathematically optimal bet size for your edge, plus the fractional Kelly most traders use.',
    keywords: ['kelly', 'optimal f', 'bet size', 'edge', 'growth'],
    fields: [
      { key: 'winRate', label: 'Win rate', suffix: '%', default: '55', step: 1, min: 0 },
      { key: 'avgWin', label: 'Average win', default: '1.5', step: 0.1, min: 0 },
      { key: 'avgLoss', label: 'Average loss', default: '1', step: 0.1, min: 0 },
    ],
    compute(p) {
      const { winRate, avgWin, avgLoss } = p;
      if (!ok(winRate, avgWin, avgLoss) || avgWin <= 0 || avgLoss <= 0) return null;
      if (winRate <= 0 || winRate >= 100) return { error: 'Win rate must be between 0 and 100.' };
      const pw = winRate / 100;
      const b = avgWin / avgLoss;
      const f = pw - (1 - pw) / b;
      const edge = pw * b - (1 - pw);
      if (f <= 0) {
        return {
          tiles: [tile('Full Kelly', 0, 'pct', { primary: true, tone: 'bad' }), tile('Edge / unit risked', edge, 'r', { tone: 'auto' })],
          warning: 'No positive edge, so Kelly says to risk nothing.',
        };
      }
      const g = pw * Math.log(1 + f * b) + (1 - pw) * Math.log(1 - f);
      return {
        tiles: [
          tile('Full Kelly', f * 100, 'pct', { primary: true, tone: 'accent', sub: 'Volatile, rarely used live' }),
          tile('Half Kelly', (f * 100) / 2, 'pct', { tone: 'good' }),
          tile('Quarter Kelly', (f * 100) / 4, 'pct'),
          tile('Payoff ratio', b, 'x'),
          tile('Edge / unit risked', edge, 'r', { tone: 'auto' }),
          tile('Log growth / trade (full)', g * 100, 'pct', { decimals: 3 }),
        ],
        notes: ['Kelly is very sensitive to your win-rate estimate. Overestimating it by a few points can push you into over-betting.'],
      };
    },
  },
  {
    id: 'prop-drawdown',
    category: 'risk',
    title: 'Prop Firm Drawdown Tracker',
    desc: 'Trailing or static drawdown floor, remaining buffer and trades left before a breach.',
    keywords: ['prop', 'topstep', 'apex', 'funded', 'trailing', 'drawdown', 'evaluation', 'daily loss'],
    fields: [
      {
        key: 'ddType', label: 'Drawdown type', type: 'segment', default: 'trailing',
        options: [{ value: 'trailing', label: 'Trailing' }, { value: 'static', label: 'Static' }],
      },
      {
        key: 'lock', label: 'Floor locks at starting balance', type: 'segment', default: 'yes',
        options: [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }],
        showIf: (p) => p.ddType === 'trailing',
      },
      { key: 'start', label: 'Starting balance', prefix: '$', default: '50000', step: 1000 },
      { key: 'peak', label: 'Highest balance reached', prefix: '$', default: '50000', step: 100, showIf: (p) => p.ddType === 'trailing' },
      { key: 'current', label: 'Current balance', prefix: '$', default: '50000', step: 100 },
      { key: 'maxDD', label: 'Max drawdown', prefix: '$', default: '2500', step: 100 },
      { key: 'target', label: 'Profit target', prefix: '$', default: '3000', step: 100, optional: true },
      { key: 'risk', label: 'Risk per trade', prefix: '$', default: '250', step: 25, optional: true },
      { key: 'dailyLimit', label: 'Daily loss limit', prefix: '$', default: '', step: 100, optional: true },
    ],
    compute(p) {
      const { ddType, lock, start, peak, current, maxDD, target, risk, dailyLimit } = p;
      if (!ok(start, current, maxDD) || maxDD <= 0) return null;
      const pk = Math.max(ok(peak) ? peak : current, current, start);
      let floor = start - maxDD;
      if (ddType === 'trailing') {
        floor = pk - maxDD;
        if (lock === 'yes') floor = Math.min(floor, start);
      }
      const buffer = current - floor;
      const pctLeft = clamp((buffer / maxDD) * 100, 0, 999);
      const tiles = [
        tile('Buffer remaining', buffer, 'money', {
          primary: true,
          tone: buffer <= 0 ? 'bad' : pctLeft < 35 ? 'accent' : 'good',
          sub: `${pctLeft.toFixed(0)}% of max drawdown`,
        }),
        tile('Drawdown floor', floor, 'money', { sub: ddType === 'trailing' ? 'Moves up with your peak' : 'Fixed' }),
      ];
      if (ok(risk) && risk > 0) tiles.push(tile('Max-loss trades left', Math.max(0, Math.floor(buffer / risk)), 'int'));
      if (ok(target) && target > 0) {
        const rem = start + target - current;
        tiles.push(tile('To profit target', Math.max(0, rem), 'money', { sub: rem <= 0 ? 'Target reached' : undefined }));
      }
      if (ok(dailyLimit) && dailyLimit > 0) {
        tiles.push(tile('Daily stop balance', Math.max(current - dailyLimit, floor), 'money', { sub: 'Assumes today started at current balance' }));
      }
      return { tiles, warning: buffer <= 0 ? 'Drawdown floor breached. The account would be closed.' : null };
    },
  },
  {
    id: 'losing-streak',
    category: 'risk',
    title: 'Losing Streak Probability',
    desc: 'How likely a run of consecutive losses is over N trades, and what it costs you.',
    keywords: ['streak', 'consecutive losses', 'variance', 'drawdown', 'probability'],
    fields: [
      { key: 'winRate', label: 'Win rate', suffix: '%', default: '50', step: 1, min: 0 },
      { key: 'trades', label: 'Number of trades', default: '100', step: 10, min: 1 },
      { key: 'streak', label: 'Losing streak length', default: '6', step: 1, min: 1 },
      { key: 'riskPct', label: 'Risk per trade', suffix: '%', default: '1', step: 0.25, min: 0 },
    ],
    compute(p) {
      const { winRate, trades, streak, riskPct } = p;
      if (!ok(winRate, trades, streak) || trades < 1 || streak < 1) return null;
      if (winRate <= 0 || winRate >= 100) return { error: 'Win rate must be between 0 and 100.' };
      const n = Math.min(Math.round(trades), 100000);
      const k = Math.min(Math.round(streak), 100);
      const pl = 1 - winRate / 100;
      const prob = probStreak(n, k, pl) * 100;
      const longest = Math.max(1, Math.log(n * (1 - pl)) / Math.log(1 / pl));
      const tiles = [
        tile(`Chance of ${k}+ losses in a row`, prob, 'pct', { primary: true, tone: prob > 50 ? 'accent' : undefined, sub: `within ${n} trades` }),
        tile('Expected longest streak', longest, 'num', { decimals: 1, sub: 'losing trades in a row' }),
      ];
      if (ok(riskPct) && riskPct > 0) tiles.push(tile(`Drawdown after ${k} losses`, (1 - (1 - riskPct / 100) ** k) * 100, 'pct', { tone: 'bad', sub: 'compounded' }));
      const rows = [3, 4, 5, 6, 7, 8, 10, 12].map((len) => ({ len, prob: probStreak(n, len, pl) * 100 }));
      return {
        tiles,
        table: {
          title: `Chance of a streak within ${n} trades`,
          columns: [{ key: 'len', label: 'Losses in a row', kind: 'int' }, { key: 'prob', label: 'Probability', kind: 'pct' }],
          rows,
        },
      };
    },
  },
];
