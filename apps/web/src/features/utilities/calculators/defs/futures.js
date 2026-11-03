import { tile, sideField } from './shared.js';
import { FUT_FIELDS, FUT_PRESET_OPTIONS, FUTURES, getFut, tickStep } from '../lib/instruments.js';
import { ok, decimalsOf } from '../lib/math.js';

const pd = (f) => Math.max(2, decimalsOf(f.tick));

export const futuresCalculators = [
  {
    id: 'futures-pnl',
    category: 'futures',
    title: 'Futures P&L',
    desc: 'Net profit or loss for any contract, in points, ticks and dollars, after commissions.',
    keywords: ['pnl', 'profit', 'loss', 'ticks', 'points', 'commission', 'nq', 'es'],
    fields: [
      ...FUT_FIELDS,
      sideField('long'),
      { key: 'contracts', label: 'Contracts', default: '1', step: 1, min: 0 },
      { key: 'entry', label: 'Entry price', default: '21000', step: tickStep },
      { key: 'exit', label: 'Exit price', default: '21040', step: tickStep },
      { key: 'commission', label: 'Commission / contract (round-turn)', prefix: '$', default: '0', step: 0.5, min: 0, optional: true },
    ],
    compute(p) {
      const f = getFut(p);
      const { contracts, entry, exit, commission } = p;
      if (!f || !ok(contracts, entry, exit) || contracts <= 0) return null;
      const pts = p.side === 'long' ? exit - entry : entry - exit;
      const gross = pts * f.pv * contracts;
      const comm = (ok(commission) ? commission : 0) * contracts;
      const net = gross - comm;
      return {
        tiles: [
          tile('Net P&L', net, 'money', { primary: true, tone: 'auto', sub: `${net / contracts >= 0 ? '+' : '−'}$${Math.abs(net / contracts).toFixed(2)} per contract` }),
          tile('Gross P&L', gross, 'money', { tone: 'auto' }),
          tile('Commissions', comm, 'money'),
          tile('Points', pts, 'num', { decimals: pd(f), tone: 'auto' }),
          tile('Ticks', pts / f.tick, 'num', { decimals: 1, tone: 'auto' }),
          tile('$ per point', f.pv * contracts, 'money', { sub: `$${f.tickValue} per tick` }),
        ],
      };
    },
  },
  {
    id: 'tick-converter',
    category: 'futures',
    title: 'Points · Ticks · Dollars',
    desc: 'Convert any move between points, ticks and dollars for a contract.',
    keywords: ['convert', 'tick value', 'point value', 'dollars', 'move'],
    fields: [
      ...FUT_FIELDS,
      {
        key: 'unit', label: 'Convert from', type: 'segment', default: 'points',
        options: [{ value: 'points', label: 'Points' }, { value: 'ticks', label: 'Ticks' }, { value: 'usd', label: 'Dollars' }],
      },
      { key: 'value', label: 'Amount', default: '10', step: 1 },
      { key: 'contracts', label: 'Contracts', default: '1', step: 1, min: 0 },
    ],
    compute(p) {
      const f = getFut(p);
      const { value, contracts } = p;
      if (!f || !ok(value, contracts) || contracts <= 0) return null;
      const pts = p.unit === 'points' ? value : p.unit === 'ticks' ? value * f.tick : value / (f.pv * contracts);
      return {
        tiles: [
          tile('Points', pts, 'num', { primary: true, decimals: pd(f) }),
          tile('Ticks', pts / f.tick, 'num', { decimals: 2 }),
          tile('$ per contract', pts * f.pv, 'money'),
          tile(`$ for ${contracts} contract${contracts === 1 ? '' : 's'}`, pts * f.pv * contracts, 'money'),
          tile('Tick size', f.tick, 'num', { decimals: decimalsOf(f.tick) }),
          tile('Point value', f.pv, 'money', { sub: `$${f.tickValue} per tick` }),
        ],
      };
    },
  },
  {
    id: 'commission-breakeven',
    category: 'futures',
    title: 'Commission & Slippage Breakeven',
    desc: 'How far price must move just to cover fees and slippage on a round trip.',
    keywords: ['commission', 'fees', 'slippage', 'breakeven', 'cost'],
    fields: [
      ...FUT_FIELDS,
      sideField('long'),
      { key: 'entry', label: 'Entry price', default: '21000', step: tickStep },
      { key: 'contracts', label: 'Contracts', default: '1', step: 1, min: 0 },
      { key: 'commission', label: 'Commission / contract (round-turn)', prefix: '$', default: '4.5', step: 0.25, min: 0 },
      { key: 'slip', label: 'Slippage per side', suffix: 'ticks', default: '1', step: 0.5, min: 0 },
    ],
    compute(p) {
      const f = getFut(p);
      const { entry, contracts, commission, slip } = p;
      if (!f || !ok(entry, contracts, commission, slip) || contracts <= 0) return null;
      const perContract = commission + 2 * slip * f.tickValue;
      const pts = perContract / f.pv;
      return {
        tiles: [
          tile('Breakeven price', p.side === 'long' ? entry + pts : entry - pts, 'price', { primary: true, decimals: pd(f) }),
          tile('Ticks to cover costs', pts / f.tick, 'num', { decimals: 2 }),
          tile('Points', pts, 'num', { decimals: pd(f) }),
          tile('Cost / contract', perContract, 'money'),
          tile('Total round-trip cost', perContract * contracts, 'money', { tone: 'bad' }),
        ],
      };
    },
  },
  {
    id: 'contract-equivalence',
    category: 'futures',
    title: 'Mini ↔ Micro Equivalence',
    desc: 'How many contracts of one product match the dollar exposure of another.',
    keywords: ['micro', 'mini', 'nq', 'mnq', 'es', 'mes', 'equivalent', 'exposure'],
    fields: [
      { key: 'from', label: 'From', type: 'select', default: 'NQ', options: FUT_PRESET_OPTIONS },
      { key: 'contracts', label: 'Contracts', default: '1', step: 1, min: 0 },
      { key: 'to', label: 'To', type: 'select', default: 'MNQ', options: FUT_PRESET_OPTIONS },
    ],
    compute(p) {
      const a = FUTURES[p.from];
      const b = FUTURES[p.to];
      if (!a || !b || !ok(p.contracts) || p.contracts <= 0) return null;
      const pa = a.tickValue / a.tick;
      const pb = b.tickValue / b.tick;
      const eq = (p.contracts * pa) / pb;
      return {
        tiles: [
          tile(`${p.to} contracts`, eq, 'num', { primary: true, decimals: 2, sub: `to match ${p.contracts} ${p.from}` }),
          tile('Whole contracts', Math.floor(eq + 1e-9), 'int'),
          tile(`${p.from} $ / point`, pa, 'money'),
          tile(`${p.to} $ / point`, pb, 'money'),
          tile('Exposure / point', p.contracts * pa, 'money'),
        ],
        notes: p.from === p.to ? [] : ['Matches dollar value per point. Compare ticks and liquidity separately.'],
      };
    },
  },
];
