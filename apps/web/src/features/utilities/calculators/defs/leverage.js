import { tile, sideField } from './shared.js';
import { FUT_FIELDS, getFut, tickStep } from '../lib/instruments.js';
import { ok } from '../lib/math.js';

export const leverageCalculators = [
  {
    id: 'futures-margin',
    category: 'leverage',
    title: 'Futures Margin & Buying Power',
    desc: 'Max contracts for your margin, committed margin and effective leverage.',
    keywords: ['margin', 'buying power', 'contracts', 'leverage', 'notional', 'futures'],
    fields: [
      ...FUT_FIELDS,
      { key: 'price', label: 'Current price', default: '21000', step: tickStep },
      { key: 'balance', label: 'Account balance', prefix: '$', default: '25000', step: 1000, min: 0 },
      { key: 'margin', label: 'Margin per contract', prefix: '$', default: '1000', step: 50, min: 0, hint: 'Use your broker’s current day or overnight margin. It changes often.' },
      { key: 'maxUse', label: 'Max account committed to margin', suffix: '%', default: '50', step: 5, min: 0 },
    ],
    compute(p) {
      const f = getFut(p);
      const { price, balance, margin, maxUse } = p;
      if (!f || !ok(price, balance, margin, maxUse) || balance <= 0 || margin <= 0) return null;
      const n = Math.floor((balance * maxUse) / 100 / margin + 1e-9);
      const notional = n * price * f.pv;
      return {
        tiles: [
          tile('Max contracts', n, 'int', { primary: true }),
          tile('Margin committed', n * margin, 'money', { sub: `${(((n * margin) / balance) * 100).toFixed(1)}% of account` }),
          tile('Free equity', balance - n * margin, 'money'),
          tile('Notional exposure', notional, 'money'),
          tile('Effective leverage', notional / balance, 'x', { tone: notional / balance > 10 ? 'warn' : undefined }),
        ],
        warning: n === 0 ? 'Not enough capital for one contract at this margin and limit.' : null,
      };
    },
  },
  {
    id: 'forex-margin',
    category: 'leverage',
    title: 'Forex Margin',
    desc: 'Required margin, free margin and maximum lots for your leverage.',
    keywords: ['forex', 'margin', 'leverage', 'lots', 'margin level'],
    fields: [
      { key: 'balance', label: 'Account balance', prefix: '$', default: '5000', step: 500, min: 0 },
      { key: 'lots', label: 'Lots', default: '1', step: 0.1, min: 0 },
      { key: 'size', label: 'Contract size (units / lot)', default: '100000', step: 1000, min: 0 },
      { key: 'price', label: 'Base currency price in account currency', default: '1.0850', step: 0.0001, min: 0, hint: 'EUR/USD price for a USD account trading EUR/USD.' },
      { key: 'lev', label: 'Leverage', prefix: '1 :', default: '30', step: 5, min: 1 },
    ],
    compute(p) {
      const { balance, lots, size, price, lev } = p;
      if (!ok(balance, lots, size, price, lev) || size <= 0 || price <= 0 || lev <= 0 || lots <= 0) return null;
      const notional = lots * size * price;
      const margin = notional / lev;
      const maxLots = Math.floor((balance / ((size * price) / lev)) * 100 + 1e-9) / 100;
      return {
        tiles: [
          tile('Required margin', margin, 'money', { primary: true, sub: `${((margin / balance) * 100).toFixed(1)}% of balance` }),
          tile('Free margin', balance - margin, 'money', { tone: balance - margin < 0 ? 'bad' : undefined }),
          tile('Margin level', (balance / margin) * 100, 'pct', { decimals: 0, sub: 'no floating P&L' }),
          tile('Notional value', notional, 'money'),
          tile('Max lots', maxLots, 'num', { decimals: 2, sub: 'on 100% of balance' }),
        ],
        warning: margin > balance ? 'Required margin exceeds your balance.' : null,
      };
    },
  },
  {
    id: 'perp-liquidation',
    category: 'leverage',
    title: 'Perp Liquidation Price',
    desc: 'Estimated liquidation price, margin and ROE for an isolated leveraged position.',
    keywords: ['crypto', 'perp', 'perpetual', 'liquidation', 'leverage', 'bitcoin', 'roe', 'futures'],
    fields: [
      sideField('long'),
      { key: 'entry', label: 'Entry price', default: '65000', step: 10, min: 0 },
      { key: 'lev', label: 'Leverage', suffix: '×', default: '10', step: 1, min: 1 },
      { key: 'notional', label: 'Position size (USD)', prefix: '$', default: '10000', step: 500, min: 0 },
      { key: 'mmr', label: 'Maintenance margin rate', suffix: '%', default: '0.5', step: 0.1, min: 0 },
      { key: 'exit', label: 'Exit price', default: '', step: 10, optional: true },
    ],
    compute(p) {
      const { entry, lev, notional, mmr, exit } = p;
      if (!ok(entry, lev, notional, mmr) || entry <= 0 || lev < 1 || notional <= 0) return null;
      const long = p.side === 'long';
      const m = mmr / 100;
      const liq = long ? entry * (1 - 1 / lev + m) : entry * (1 + 1 / lev - m);
      if (liq <= 0) return { tiles: [tile('Liquidation price', 'None', 'text', { primary: true, sub: 'Leverage too low to liquidate' })] };
      const margin = notional / lev;
      const qty = notional / entry;
      const tiles = [
        tile('Liquidation price', liq, 'price', { primary: true, tone: 'bad' }),
        tile('Distance to liquidation', (Math.abs(liq - entry) / entry) * 100, 'pct'),
        tile('Initial margin', margin, 'money'),
        tile('Quantity', qty, 'num', { decimals: 6 }),
      ];
      let warning = null;
      if (ok(exit) && exit > 0) {
        const pnl = qty * (exit - entry) * (long ? 1 : -1);
        tiles.push(tile('P&L at exit', pnl, 'money', { tone: 'auto' }), tile('ROE', (pnl / margin) * 100, 'pct', { tone: 'auto' }));
        if (long ? exit <= liq : exit >= liq) warning = 'Your exit price is beyond liquidation. The position would be closed first.';
      }
      return { tiles, warning, notes: ['Isolated-margin estimate. Exchange formulas, fees and funding shift the exact price, so check your venue.'] };
    },
  },
  {
    id: 'fees-funding',
    category: 'leverage',
    title: 'Fees & Funding Cost',
    desc: 'Total trading fees plus perpetual funding for a position, and the move needed to break even.',
    keywords: ['fees', 'funding', 'maker', 'taker', 'perp', 'crypto', 'cost'],
    fields: [
      sideField('long'),
      { key: 'notional', label: 'Position size (USD)', prefix: '$', default: '10000', step: 500, min: 0 },
      { key: 'entryFee', label: 'Entry fee', suffix: '%', default: '0.05', step: 0.01, min: 0 },
      { key: 'exitFee', label: 'Exit fee', suffix: '%', default: '0.05', step: 0.01, min: 0 },
      { key: 'funding', label: 'Funding rate per 8h', suffix: '%', default: '0.01', step: 0.005, hint: 'Positive means longs pay shorts.' },
      { key: 'hours', label: 'Hours held', default: '24', step: 1, min: 0 },
    ],
    compute(p) {
      const { notional, entryFee, exitFee, funding, hours } = p;
      if (!ok(notional, entryFee, exitFee, funding, hours) || notional <= 0) return null;
      const fees = (notional * (entryFee + exitFee)) / 100;
      const fund = ((notional * funding) / 100) * (hours / 8) * (p.side === 'long' ? 1 : -1);
      const total = fees + fund;
      return {
        tiles: [
          tile('Total cost', total, 'money', { primary: true, tone: total > 0 ? 'bad' : 'good', decimals: 2, sub: total < 0 ? 'You net funding income' : undefined }),
          tile('Trading fees', fees, 'money'),
          tile('Funding', fund, 'money', { tone: fund > 0 ? 'bad' : 'good' }),
          tile('Breakeven move', (total / notional) * 100, 'pct', { decimals: 3 }),
        ],
      };
    },
  },
];
