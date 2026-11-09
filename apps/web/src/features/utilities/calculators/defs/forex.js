import { tile, sideField, riskModeField, riskValueField } from './shared.js';
import { FX_FIELDS, getPip, pipStep } from '../lib/instruments.js';
import { ok, decimalsOf } from '../lib/math.js';

const RATE = {
  key: 'rate', label: 'Quote → account currency rate', default: '1', step: 0.0001, min: 0,
  hint: '1 when the quote currency is your account currency. For USDJPY on a USD account use 1 ÷ price.',
};
const LOT = 100000;

export const forexCalculators = [
  {
    id: 'forex-position-size',
    category: 'forex',
    title: 'Forex Lot Size',
    desc: 'Lots to trade so your stop-loss risks a fixed amount of your account.',
    keywords: ['lot', 'forex', 'fx', 'pip', 'position size', 'risk'],
    fields: [
      ...FX_FIELDS,
      { key: 'balance', label: 'Account balance', prefix: '$', default: '10000', step: 500, min: 0 },
      riskModeField,
      riskValueField,
      { key: 'entry', label: 'Entry price', default: '1.0850', step: pipStep },
      { key: 'stop', label: 'Stop price', default: '1.0820', step: pipStep },
      RATE,
      { key: 'rr', label: 'Target R:R', suffix: 'R', default: '2', step: 0.5, min: 0, optional: true },
    ],
    compute(p) {
      const pip = getPip(p);
      const { balance, riskValue, entry, stop, rate, rr } = p;
      if (!pip || !ok(balance, riskValue, entry, stop, rate) || balance <= 0 || riskValue <= 0 || rate <= 0) return null;
      const dist = Math.abs(entry - stop);
      if (dist === 0) return { error: 'Entry and stop are the same price.' };
      const long = stop < entry;
      const riskAmt = p.riskMode === 'usd' ? riskValue : (balance * riskValue) / 100;
      const stopPips = dist / pip;
      const pipPerLot = LOT * pip * rate;
      const lots = Math.floor((riskAmt / (stopPips * pipPerLot)) * 100 + 1e-9) / 100;
      const d = decimalsOf(pip) + 1;
      const tiles = [
        tile('Lot size', lots, 'num', { primary: true, decimals: 2, sub: `${long ? 'Long' : 'Short'} · ${(lots * 10).toFixed(1)} mini · ${(lots * 100).toFixed(0)} micro` }),
        tile('Units', lots * LOT, 'int'),
        tile('Stop distance', stopPips, 'num', { decimals: 1, sub: 'pips' }),
        tile('Risk used', lots * stopPips * pipPerLot, 'money'),
        tile('Pip value / lot', pipPerLot, 'money'),
      ];
      if (ok(rr) && rr > 0) {
        tiles.push(
          tile('Target price', long ? entry + dist * rr : entry - dist * rr, 'price', { decimals: d }),
          tile('Reward at target', lots * stopPips * rr * pipPerLot, 'money', { tone: 'good' }),
        );
      }
      return { tiles, warning: lots === 0 ? 'Risk budget is too small for the minimum 0.01 lot at this stop distance.' : null };
    },
  },
  {
    id: 'pip-value',
    category: 'forex',
    title: 'Pip Value',
    desc: 'Dollar value of one pip for any lot size, in your account currency.',
    keywords: ['pip', 'pipette', 'lot', 'value', 'forex'],
    fields: [
      ...FX_FIELDS,
      { key: 'lots', label: 'Lots', default: '1', step: 0.1, min: 0 },
      RATE,
    ],
    compute(p) {
      const pip = getPip(p);
      const { lots, rate } = p;
      if (!pip || !ok(lots, rate) || lots <= 0 || rate <= 0) return null;
      const perLot = LOT * pip * rate;
      return {
        tiles: [
          tile('Pip value', perLot * lots, 'money', { primary: true, decimals: 2, sub: `${lots} lot${lots === 1 ? '' : 's'}` }),
          tile('Per standard lot', perLot, 'money'),
          tile('Per mini lot', perLot / 10, 'money'),
          tile('Per micro lot', perLot / 100, 'money'),
          tile('Pipette (⅒ pip)', (perLot * lots) / 10, 'money', { decimals: 3 }),
        ],
      };
    },
  },
  {
    id: 'pips-pnl',
    category: 'forex',
    title: 'Pips & Forex P&L',
    desc: 'Pips gained or lost on a trade and the resulting profit in your account currency.',
    keywords: ['pips', 'pnl', 'profit', 'forex', 'fx', 'commission'],
    fields: [
      ...FX_FIELDS,
      sideField('long'),
      { key: 'lots', label: 'Lots', default: '1', step: 0.1, min: 0 },
      { key: 'entry', label: 'Entry price', default: '1.0850', step: pipStep },
      { key: 'exit', label: 'Exit price', default: '1.0890', step: pipStep },
      RATE,
      { key: 'commission', label: 'Commission / lot (round-turn)', prefix: '$', default: '0', step: 0.5, min: 0, optional: true },
    ],
    compute(p) {
      const pip = getPip(p);
      const { lots, entry, exit, rate, commission } = p;
      if (!pip || !ok(lots, entry, exit, rate) || lots <= 0 || rate <= 0) return null;
      const pips = ((p.side === 'long' ? exit - entry : entry - exit)) / pip;
      const gross = pips * lots * LOT * pip * rate;
      const comm = (ok(commission) ? commission : 0) * lots;
      return {
        tiles: [
          tile('Net P&L', gross - comm, 'money', { primary: true, tone: 'auto' }),
          tile('Pips', pips, 'num', { decimals: 1, tone: 'auto' }),
          tile('Gross P&L', gross, 'money', { tone: 'auto' }),
          tile('Commission', comm, 'money'),
        ],
      };
    },
  },
];
