import { ok } from './math.js';

/** Contract specs. tickValue = $ per minimum tick. Point value = tickValue / tick. */
export const FUTURES = {
  NQ: { name: 'E-mini Nasdaq-100', tick: 0.25, tickValue: 5 },
  MNQ: { name: 'Micro Nasdaq-100', tick: 0.25, tickValue: 0.5 },
  ES: { name: 'E-mini S&P 500', tick: 0.25, tickValue: 12.5 },
  MES: { name: 'Micro S&P 500', tick: 0.25, tickValue: 1.25 },
  YM: { name: 'E-mini Dow', tick: 1, tickValue: 5 },
  MYM: { name: 'Micro Dow', tick: 1, tickValue: 0.5 },
  RTY: { name: 'E-mini Russell 2000', tick: 0.1, tickValue: 5 },
  M2K: { name: 'Micro Russell 2000', tick: 0.1, tickValue: 0.5 },
  CL: { name: 'Crude Oil', tick: 0.01, tickValue: 10 },
  MCL: { name: 'Micro Crude Oil', tick: 0.01, tickValue: 1 },
  GC: { name: 'Gold', tick: 0.1, tickValue: 10 },
  MGC: { name: 'Micro Gold', tick: 0.1, tickValue: 1 },
  SI: { name: 'Silver', tick: 0.005, tickValue: 25 },
  NG: { name: 'Natural Gas', tick: 0.001, tickValue: 10 },
  ZB: { name: 'U.S. Treasury Bond', tick: 1 / 32, tickValue: 31.25 },
  ZN: { name: '10-Year T-Note', tick: 1 / 64, tickValue: 15.625 },
  '6E': { name: 'Euro FX', tick: 0.00005, tickValue: 6.25 },
};

const presetOptions = Object.entries(FUTURES).map(([value, m]) => ({
  value,
  label: `${value} · ${m.name}`,
}));

export const FUT_PRESET_OPTIONS = presetOptions;
export const FUT_OPTIONS = [...presetOptions, { value: 'CUSTOM', label: 'Custom contract…' }];

/** Spread into a calculator's `fields` to get instrument selection. */
export const FUT_FIELDS = [
  { key: 'inst', label: 'Instrument', type: 'select', default: 'NQ', options: FUT_OPTIONS },
  { key: 'cTick', label: 'Tick size', default: '0.25', step: 0.25, min: 0, showIf: (p) => p.inst === 'CUSTOM' },
  { key: 'cTickVal', label: 'Tick value', prefix: '$', default: '5', step: 0.5, min: 0, showIf: (p) => p.inst === 'CUSTOM' },
];

export function getFut(p, key = 'inst') {
  const id = p[key];
  if (id === 'CUSTOM') {
    return ok(p.cTick, p.cTickVal) && p.cTick > 0 && p.cTickVal > 0
      ? { name: 'Custom', tick: p.cTick, tickValue: p.cTickVal, pv: p.cTickVal / p.cTick }
      : null;
  }
  const m = FUTURES[id];
  return m ? { ...m, pv: m.tickValue / m.tick } : null;
}

export const tickStep = (p) => getFut(p)?.tick ?? 1;

/* ---------- Forex ---------- */
export const FX_PAIRS = {
  EURUSD: 0.0001, GBPUSD: 0.0001, AUDUSD: 0.0001, NZDUSD: 0.0001, USDCAD: 0.0001,
  USDCHF: 0.0001, EURGBP: 0.0001, USDJPY: 0.01, EURJPY: 0.01, GBPJPY: 0.01,
};

export const FX_OPTIONS = [
  ...Object.keys(FX_PAIRS).map((k) => ({ value: k, label: `${k.slice(0, 3)}/${k.slice(3)}` })),
  { value: 'CUSTOM', label: 'Custom pip size…' },
];

export const FX_FIELDS = [
  { key: 'pair', label: 'Pair', type: 'select', default: 'EURUSD', options: FX_OPTIONS },
  { key: 'cPip', label: 'Pip size', default: '0.0001', step: 0.0001, min: 0, showIf: (p) => p.pair === 'CUSTOM' },
];

export const getPip = (p) => {
  const v = p.pair === 'CUSTOM' ? p.cPip : FX_PAIRS[p.pair];
  return ok(v) && v > 0 ? v : null;
};
export const pipStep = (p) => getPip(p) ?? 0.0001;
