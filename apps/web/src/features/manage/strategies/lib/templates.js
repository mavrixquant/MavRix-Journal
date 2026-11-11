// Starter playbooks shown on the empty state. Pure content, no logic.
const item = (text, i) => ({ id: `t${i}-${text.length}`, text });
const list = (arr) => arr.map(item);

export const STRATEGY_TEMPLATES = [
  {
    key: 'orb',
    name: 'Opening Range Breakout',
    color: '#F59E0B',
    direction: null,
    timeframe: '5m',
    sessions: ['NY AM'],
    targetRR: 2,
    maxTradesPerDay: 2,
    description: 'Trade the break of the first 15–30 minute range with the trend.',
    playbook: {
      entry: list(['Mark the 9:30–9:45 range high and low', 'Wait for a 5m candle to close outside the range', 'Enter on the retest of the broken level']),
      exit: list(['Take profit at 2R or at the opposite range extreme', 'Exit on a 5m close back inside the range']),
      risk: list(['Stop beyond the retest candle', 'Risk a fixed amount per trade']),
      management: list(['Move stop to breakeven at 1R', 'No re-entry after two stops']),
    },
  },
  {
    key: 'vwap',
    name: 'VWAP Reversion',
    color: '#4C8BF5',
    direction: null,
    timeframe: '5m',
    sessions: ['NY AM', 'NY PM'],
    targetRR: 1.5,
    maxTradesPerDay: 3,
    description: 'Fade stretched moves back toward VWAP when momentum fades.',
    playbook: {
      entry: list(['Price is extended at least 2 standard deviations from VWAP', 'Momentum divergence or rejection wick', 'Enter on the first close back toward VWAP']),
      exit: list(['Scale out at VWAP', 'Exit fully if price makes a new extreme']),
      risk: list(['Stop beyond the extreme wick']),
      management: list(['Skip on trend days with a one-sided open']),
    },
  },
  {
    key: 'trend',
    name: 'Trend Pullback',
    color: '#35C4A1',
    direction: null,
    timeframe: '15m',
    sessions: ['London', 'NY AM'],
    targetRR: 3,
    maxTradesPerDay: 2,
    description: 'Join an established trend on a shallow pullback to value.',
    playbook: {
      entry: list(['Higher timeframe trend is clear', 'Pullback holds the 21 EMA or prior structure', 'Enter on a trigger candle in trend direction']),
      exit: list(['Trail below the last swing', 'Take partials at 2R']),
      risk: list(['Stop below the pullback low']),
      management: list(['Do not add after the first target is hit']),
    },
  },
  {
    key: 'sweep',
    name: 'Liquidity Sweep Reversal',
    color: '#A78BFA',
    direction: null,
    timeframe: '1m',
    sessions: ['London', 'NY Pre-Market', 'NY AM'],
    targetRR: 2,
    maxTradesPerDay: 2,
    description: 'Fade a stop run through a prior high or low after a fast rejection.',
    playbook: {
      entry: list(['Price takes a clear prior high or low', 'Fast rejection and close back inside the level', 'Enter on the first pullback after the shift']),
      exit: list(['Target the opposing liquidity pool']),
      risk: list(['Stop beyond the sweep wick']),
      management: list(['Skip if the sweep happens into high impact news']),
    },
  },
];
