import { tile, sideField } from './shared.js';
import { FUT_FIELDS, getFut, tickStep } from '../lib/instruments.js';
import { ok, clamp, decimalsOf, roundTick } from '../lib/math.js';

const DEC = { key: 'dec', label: 'Decimals', default: '2', step: 1, min: 0, optional: true };
const dec = (p) => clamp(Math.round(ok(p.dec) ? p.dec : 2), 0, 6);

export const levelsCalculators = [
  {
    id: 'pivot-points',
    category: 'levels',
    title: 'Pivot Points',
    desc: 'Classic, Fibonacci, Camarilla and Woodie pivot levels from the prior session.',
    keywords: ['pivot', 'support', 'resistance', 'camarilla', 'woodie', 'fibonacci', 'levels'],
    fields: [
      {
        key: 'method', label: 'Method', type: 'select', default: 'classic',
        options: [{ value: 'classic', label: 'Classic' }, { value: 'fib', label: 'Fibonacci' }, { value: 'cam', label: 'Camarilla' }, { value: 'woodie', label: 'Woodie' }],
      },
      { key: 'high', label: 'Prior high', default: '21100', step: 0.25 },
      { key: 'low', label: 'Prior low', default: '20850', step: 0.25 },
      { key: 'close', label: 'Prior close', default: '21020', step: 0.25 },
      DEC,
    ],
    compute(p) {
      const { high: H, low: L, close: C, method } = p;
      if (!ok(H, L, C)) return null;
      if (H <= L) return { error: 'High must be above low.' };
      const r = H - L;
      let P = (H + L + C) / 3;
      let lv;
      if (method === 'fib') {
        lv = { R3: P + r, R2: P + 0.618 * r, R1: P + 0.382 * r, S1: P - 0.382 * r, S2: P - 0.618 * r, S3: P - r };
      } else if (method === 'cam') {
        const k = 1.1;
        lv = { R4: C + (r * k) / 2, R3: C + (r * k) / 4, R2: C + (r * k) / 6, R1: C + (r * k) / 12, S1: C - (r * k) / 12, S2: C - (r * k) / 6, S3: C - (r * k) / 4, S4: C - (r * k) / 2 };
      } else if (method === 'woodie') {
        P = (H + L + 2 * C) / 4;
        lv = { R3: H + 2 * (P - L), R2: P + r, R1: 2 * P - L, S1: 2 * P - H, S2: P - r, S3: L - 2 * (H - P) };
      } else {
        lv = { R3: H + 2 * (P - L), R2: P + r, R1: 2 * P - L, S1: 2 * P - H, S2: P - r, S3: L - 2 * (H - P) };
      }
      const d = dec(p);
      const rows = [...Object.entries(lv).map(([n, v]) => ({ n, v })), { n: 'Pivot', v: P, highlight: true }]
        .sort((a, b) => b.v - a.v)
        .map((x) => ({ ...x, dist: x.v - C }));
      return {
        tiles: [
          tile('Pivot', P, 'price', { primary: true, decimals: d, sub: C >= P ? 'Prior close above pivot (bullish bias)' : 'Prior close below pivot (bearish bias)' }),
          tile('Prior range', r, 'num', { decimals: d }),
        ],
        table: {
          title: 'Levels',
          columns: [
            { key: 'n', label: 'Level', kind: 'text' },
            { key: 'v', label: 'Price', kind: 'price', decimals: d },
            { key: 'dist', label: 'From close', kind: 'price', decimals: d, auto: true },
          ],
          rows,
        },
      };
    },
  },
  {
    id: 'fibonacci',
    category: 'levels',
    title: 'Fibonacci Levels',
    desc: 'Retracement and extension prices for any swing, plus the golden pocket.',
    keywords: ['fibonacci', 'fib', 'retracement', 'extension', 'golden pocket', 'swing'],
    fields: [
      {
        key: 'dir', label: 'Swing direction', type: 'segment', default: 'up',
        options: [{ value: 'up', label: 'Up swing (low → high)' }, { value: 'down', label: 'Down swing (high → low)' }],
      },
      { key: 'high', label: 'Swing high', default: '21500', step: 0.25 },
      { key: 'low', label: 'Swing low', default: '20800', step: 0.25 },
      DEC,
    ],
    compute(p) {
      const { high: H, low: L, dir } = p;
      if (!ok(H, L)) return null;
      if (H <= L) return { error: 'Swing high must be above swing low.' };
      const r = H - L;
      const up = dir === 'up';
      const retr = (x) => (up ? H - r * x : L + r * x);
      const ext = (x) => (up ? H + r * (x - 1) : L - r * (x - 1));
      const d = dec(p);
      const rows = [
        ...[0, 0.236, 0.382, 0.5, 0.618, 0.65, 0.786, 1].map((x) => ({ ratio: x * 100, type: 'Retracement', v: retr(x), highlight: x === 0.618 || x === 0.65 })),
        ...[1.272, 1.618, 2, 2.618].map((x) => ({ ratio: x * 100, type: 'Extension', v: ext(x) })),
      ].sort((a, b) => b.v - a.v);
      return {
        tiles: [
          tile('Golden pocket', `${Math.min(retr(0.618), retr(0.65)).toFixed(d)} – ${Math.max(retr(0.618), retr(0.65)).toFixed(d)}`, 'text', { primary: true, copy: retr(0.618).toFixed(d), sub: '61.8% – 65% retracement' }),
          tile('50% level', retr(0.5), 'price', { decimals: d }),
          tile('Swing range', r, 'num', { decimals: d }),
        ],
        table: {
          title: 'Levels',
          columns: [
            { key: 'ratio', label: 'Ratio', kind: 'pct', decimals: 1 },
            { key: 'type', label: 'Type', kind: 'text' },
            { key: 'v', label: 'Price', kind: 'price', decimals: d },
          ],
          rows,
        },
      };
    },
  },
  {
    id: 'atr-stop',
    category: 'levels',
    title: 'ATR Stop & Target',
    desc: 'Volatility-based stop and target from ATR, with dollar risk for your contract.',
    keywords: ['atr', 'stop', 'volatility', 'target', 'average true range', 'trailing'],
    fields: [
      ...FUT_FIELDS,
      sideField('long'),
      { key: 'entry', label: 'Entry price', default: '21000', step: tickStep },
      { key: 'atr', label: 'ATR (points)', default: '25', step: 0.25, min: 0 },
      { key: 'mult', label: 'ATR multiple', suffix: '×', default: '2', step: 0.25, min: 0 },
      { key: 'rr', label: 'Target R:R', suffix: 'R', default: '2', step: 0.5, min: 0 },
      { key: 'contracts', label: 'Contracts', default: '1', step: 1, min: 0 },
    ],
    compute(p) {
      const f = getFut(p);
      const { entry, atr, mult, rr, contracts } = p;
      if (!f || !ok(entry, atr, mult, contracts) || atr <= 0 || mult <= 0 || contracts <= 0) return null;
      const long = p.side === 'long';
      const stop = roundTick(long ? entry - atr * mult : entry + atr * mult, f.tick, long ? 'floor' : 'ceil');
      const dist = Math.abs(entry - stop);
      const d = Math.max(2, decimalsOf(f.tick));
      const tiles = [
        tile('Stop price', stop, 'price', { primary: true, decimals: d, tone: 'bad', sub: `${(dist / f.tick).toFixed(0)} ticks away` }),
        tile('Stop distance', dist, 'num', { decimals: d }),
        tile('Risk', dist * f.pv * contracts, 'money', { tone: 'bad' }),
      ];
      if (ok(rr) && rr > 0) {
        tiles.push(
          tile('Target price', roundTick(long ? entry + dist * rr : entry - dist * rr, f.tick), 'price', { decimals: d, tone: 'good', sub: `${rr}R` }),
          tile('Reward', dist * rr * f.pv * contracts, 'money', { tone: 'good' }),
        );
      }
      return { tiles };
    },
  },
];
