import { tile, sideField } from './shared.js';
import { ok, parseLines, blackScholes, normCdf } from '../lib/math.js';

const typeField = {
  key: 'type', label: 'Type', type: 'segment', default: 'call',
  options: [{ value: 'call', label: 'Call' }, { value: 'put', label: 'Put' }],
};

export const optionsCalculators = [
  {
    id: 'stock-pnl',
    category: 'options',
    title: 'Stock P&L',
    desc: 'Profit, return and breakeven for a share trade, long or short, after fees.',
    keywords: ['stock', 'shares', 'pnl', 'profit', 'return', 'fees'],
    fields: [
      sideField('long'),
      { key: 'shares', label: 'Shares', default: '100', step: 10, min: 0 },
      { key: 'entry', label: 'Entry price', prefix: '$', default: '50', step: 0.01 },
      { key: 'exit', label: 'Exit price', prefix: '$', default: '55', step: 0.01 },
      { key: 'fees', label: 'Fees (round-trip total)', prefix: '$', default: '2', step: 1, min: 0, optional: true },
    ],
    compute(p) {
      const { shares, entry, exit } = p;
      const fees = ok(p.fees) ? p.fees : 0;
      if (!ok(shares, entry, exit) || shares <= 0 || entry <= 0) return null;
      const long = p.side === 'long';
      const gross = (long ? exit - entry : entry - exit) * shares;
      const net = gross - fees;
      return {
        tiles: [
          tile('Net P&L', net, 'money', { primary: true, tone: 'auto' }),
          tile('Return on position', (net / (entry * shares)) * 100, 'pct', { tone: 'auto' }),
          tile('Gross P&L', gross, 'money', { tone: 'auto' }),
          tile('Breakeven price', long ? entry + fees / shares : entry - fees / shares, 'price'),
          tile('Position value', entry * shares, 'money'),
        ],
      };
    },
  },
  {
    id: 'avg-cost',
    category: 'options',
    title: 'Average Cost & Scaling In',
    desc: 'Blended entry price across several buys, plus unrealised P&L at the current price.',
    keywords: ['average', 'cost basis', 'dca', 'averaging down', 'scale in', 'lots'],
    fields: [
      { key: 'lots', label: 'Buys: quantity, price (one per line)', type: 'textarea', rows: 4, default: '100, 50.00\n50, 46.50\n50, 44.00' },
      { key: 'price', label: 'Current price', prefix: '$', default: '47', step: 0.01, optional: true },
    ],
    compute(p) {
      const rows = parseLines(p.lots);
      if (rows.length === 0) return null;
      let qty = 0;
      let cost = 0;
      const out = [];
      for (const [q, pr] of rows) {
        if (!ok(q, pr) || q <= 0 || pr <= 0) return { error: 'Each line needs "quantity, price" with positive numbers.' };
        qty += q;
        cost += q * pr;
        out.push({ q, pr, cost: q * pr });
      }
      const avg = cost / qty;
      const tiles = [
        tile('Average cost', avg, 'price', { primary: true, decimals: 4 }),
        tile('Total quantity', qty, 'num', { decimals: 4 }),
        tile('Total invested', cost, 'money'),
      ];
      if (ok(p.price) && p.price > 0) {
        tiles.push(
          tile('Unrealised P&L', (p.price - avg) * qty, 'money', { tone: 'auto' }),
          tile('Return', ((p.price - avg) / avg) * 100, 'pct', { tone: 'auto' }),
          tile('Rise needed to break even', Math.max(0, ((avg - p.price) / p.price) * 100), 'pct'),
        );
      }
      return {
        tiles,
        table: {
          title: 'Your buys',
          columns: [
            { key: 'q', label: 'Qty', kind: 'num' },
            { key: 'pr', label: 'Price', kind: 'price' },
            { key: 'cost', label: 'Cost', kind: 'money' },
            { key: 'w', label: 'Weight', kind: 'pct', decimals: 1 },
          ],
          rows: out.map((r) => ({ ...r, w: (r.cost / cost) * 100 })),
        },
      };
    },
  },
  {
    id: 'option-expiry',
    category: 'options',
    title: 'Option P&L at Expiry',
    desc: 'Breakeven, max profit, max loss and a payoff table for a single long or short option.',
    keywords: ['option', 'call', 'put', 'payoff', 'breakeven', 'premium', 'expiry'],
    fields: [
      typeField,
      {
        key: 'pos', label: 'Position', type: 'segment', default: 'long',
        options: [{ value: 'long', label: 'Long (buy)' }, { value: 'short', label: 'Short (sell)' }],
      },
      { key: 'strike', label: 'Strike', default: '100', step: 1, min: 0 },
      { key: 'premium', label: 'Premium per share', prefix: '$', default: '3.5', step: 0.05, min: 0 },
      { key: 'contracts', label: 'Contracts', default: '1', step: 1, min: 0 },
      { key: 'mult', label: 'Multiplier', default: '100', step: 1, min: 0 },
      { key: 'spot', label: 'Underlying at expiry', default: '104', step: 0.5, optional: true },
    ],
    compute(p) {
      const { strike, premium, contracts, mult, spot } = p;
      if (!ok(strike, premium, contracts, mult) || strike <= 0 || contracts <= 0 || mult <= 0) return null;
      const call = p.type === 'call';
      const long = p.pos === 'long';
      const sgn = long ? 1 : -1;
      const per = (s) => sgn * ((call ? Math.max(s - strike, 0) : Math.max(strike - s, 0)) - premium);
      const k = contracts * mult;
      const be = call ? strike + premium : strike - premium;
      const maxPut = (strike - premium) * k;
      const maxProfit = long ? (call ? 'Unlimited' : maxPut) : premium * k;
      const maxLoss = long ? premium * k : call ? 'Unlimited' : maxPut;
      const tiles = [
        tile('Breakeven', be, 'price', { primary: true }),
        tile('Max profit', maxProfit, 'money', { tone: 'good' }),
        tile('Max loss', maxLoss, 'money', { tone: 'bad' }),
        tile(long ? 'Cost (debit)' : 'Credit received', premium * k, 'money'),
      ];
      if (ok(spot)) tiles.push(tile('P&L at expiry', per(spot) * k, 'money', { tone: 'auto', sub: `underlying ${spot}` }));
      const rows = [-15, -10, -5, -2.5, 0, 2.5, 5, 10, 15].map((pc) => {
        const s = strike * (1 + pc / 100);
        return { s, pc, ps: per(s), pnl: per(s) * k };
      });
      return {
        tiles,
        table: {
          title: 'Payoff at expiry',
          columns: [
            { key: 'pc', label: 'vs strike', kind: 'pct', decimals: 1 },
            { key: 's', label: 'Underlying', kind: 'price' },
            { key: 'ps', label: 'Per share', kind: 'money', auto: true },
            { key: 'pnl', label: 'Total', kind: 'money', auto: true },
          ],
          rows,
        },
      };
    },
  },
  {
    id: 'black-scholes',
    category: 'options',
    title: 'Black-Scholes & Greeks',
    desc: 'Theoretical option price with delta, gamma, theta, vega and rho.',
    keywords: ['black scholes', 'greeks', 'delta', 'gamma', 'theta', 'vega', 'rho', 'iv', 'option price'],
    fields: [
      typeField,
      { key: 'S', label: 'Underlying price', default: '100', step: 1, min: 0 },
      { key: 'K', label: 'Strike', default: '100', step: 1, min: 0 },
      { key: 'dte', label: 'Days to expiry', default: '30', step: 1, min: 0 },
      { key: 'iv', label: 'Implied volatility', suffix: '%', default: '25', step: 1, min: 0 },
      { key: 'r', label: 'Risk-free rate', suffix: '%', default: '4.5', step: 0.25 },
      { key: 'q', label: 'Dividend yield', suffix: '%', default: '0', step: 0.25, min: 0, optional: true },
    ],
    compute(p) {
      const { S, K, dte, iv, r } = p;
      if (!ok(S, K, dte, iv, r) || S <= 0 || K <= 0 || dte <= 0 || iv <= 0) return null;
      const g = blackScholes({ type: p.type, S, K, T: dte / 365, sigma: iv / 100, r: r / 100, q: (ok(p.q) ? p.q : 0) / 100 });
      const intrinsic = p.type === 'call' ? Math.max(S - K, 0) : Math.max(K - S, 0);
      return {
        tiles: [
          tile('Option price', g.price, 'price', { primary: true, decimals: 4, sub: `${intrinsic.toFixed(2)} intrinsic · ${(g.price - intrinsic).toFixed(2)} time value` }),
          tile('Delta', g.delta, 'num', { decimals: 4 }),
          tile('Gamma', g.gamma, 'num', { decimals: 4 }),
          tile('Theta / day', g.theta, 'num', { decimals: 4, tone: 'bad' }),
          tile('Vega / 1% IV', g.vega, 'num', { decimals: 4 }),
          tile('Rho / 1% rate', g.rho, 'num', { decimals: 4 }),
          tile('Probability ITM', g.pITM * 100, 'pct', { decimals: 1 }),
        ],
        notes: ['European-style model with continuous dividend yield. American options and early exercise can differ.'],
      };
    },
  },
  {
    id: 'expected-move',
    category: 'options',
    title: 'Expected Move',
    desc: 'The one-standard-deviation range the options market implies over a number of days.',
    keywords: ['expected move', 'implied move', 'iv', 'standard deviation', 'range', 'volatility'],
    fields: [
      { key: 'price', label: 'Underlying price', default: '5000', step: 10, min: 0 },
      { key: 'iv', label: 'Implied volatility', suffix: '%', default: '18', step: 0.5, min: 0 },
      { key: 'days', label: 'Days', default: '7', step: 1, min: 0 },
      {
        key: 'basis', label: 'Day count', type: 'segment', default: '365',
        options: [{ value: '365', label: 'Calendar (365)' }, { value: '252', label: 'Trading (252)' }],
      },
    ],
    compute(p) {
      const { price, iv, days } = p;
      if (!ok(price, iv, days) || price <= 0 || iv <= 0 || days <= 0) return null;
      const b = Number(p.basis);
      const sd = price * (iv / 100) * Math.sqrt(days / b);
      const rows = [0.5, 1, 1.5, 2, 3].map((k) => ({ k, move: sd * k, lo: price - sd * k, hi: price + sd * k, prob: (2 * normCdf(k) - 1) * 100 }));
      return {
        tiles: [
          tile('1σ move', sd, 'num', { primary: true, decimals: 2, sub: `±${((sd / price) * 100).toFixed(2)}% · ~68% of outcomes` }),
          tile('Upper (1σ)', price + sd, 'price'),
          tile('Lower (1σ)', price - sd, 'price'),
          tile('1-day move', price * (iv / 100) * Math.sqrt(1 / b), 'num', { decimals: 2 }),
        ],
        table: {
          title: 'Probability bands',
          columns: [
            { key: 'k', label: 'σ', kind: 'num', decimals: 1 },
            { key: 'move', label: '± Move', kind: 'num', decimals: 2 },
            { key: 'lo', label: 'Low', kind: 'price' },
            { key: 'hi', label: 'High', kind: 'price' },
            { key: 'prob', label: 'Inside', kind: 'pct', decimals: 1 },
          ],
          rows,
        },
      };
    },
  },
];
