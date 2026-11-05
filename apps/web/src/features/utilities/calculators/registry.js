/**
 * Single source of truth for the Calculator Hub.
 * To add a calculator: write its definition in ./defs/<category>.js, add an icon in ./icons.js.
 * The hub, category pages, search, routes and prev/next navigation all derive from here.
 */
import { riskCalculators } from './defs/risk.js';
import { edgeCalculators } from './defs/edge.js';
import { futuresCalculators } from './defs/futures.js';
import { forexCalculators } from './defs/forex.js';
import { leverageCalculators } from './defs/leverage.js';
import { growthCalculators } from './defs/growth.js';
import { optionsCalculators } from './defs/options.js';
import { levelsCalculators } from './defs/levels.js';
import { CALC_ICONS, CATEGORY_ICONS, FALLBACK_ICON } from './icons.js';

export const HUB_PATH = '/utilities/calculators';

const CATEGORY_DEFS = [
  { id: 'risk', label: 'Risk Management', color: '#FF5C5C', blurb: 'Size every trade correctly, measure your odds of ruin and stay inside prop-firm limits.' },
  { id: 'edge', label: 'Edge & Expectancy', color: '#F59E0B', blurb: 'Quantify your edge: R:R, expectancy, profit factor, scale-outs and risk-adjusted returns.' },
  { id: 'futures', label: 'Futures', color: '#378ADD', blurb: 'Tick and point maths, P&L, breakeven costs and mini-to-micro equivalence.' },
  { id: 'forex', label: 'Forex', color: '#35C4A1', blurb: 'Lot size, pip value and P&L in your account currency.' },
  { id: 'leverage', label: 'Margin & Leverage', color: '#A78BFA', blurb: 'Buying power, margin requirements, liquidation prices and funding costs.' },
  { id: 'growth', label: 'Growth & Goals', color: '#22D3EE', blurb: 'Compounding, drawdown recovery, goal planning and challenge targets.' },
  { id: 'options', label: 'Stocks & Options', color: '#F472B6', blurb: 'Share P&L, average cost, option payoffs, Greeks and expected move.' },
  { id: 'levels', label: 'Price Levels', color: '#8892A3', blurb: 'Pivot points, Fibonacci levels and ATR-based stops and targets.' },
];

export const CATEGORIES = CATEGORY_DEFS.map((c) => ({ ...c, icon: CATEGORY_ICONS[c.id] ?? FALLBACK_ICON }));

export const CALCULATORS = [
  ...riskCalculators,
  ...edgeCalculators,
  ...futuresCalculators,
  ...forexCalculators,
  ...leverageCalculators,
  ...growthCalculators,
  ...optionsCalculators,
  ...levelsCalculators,
].map((c) => ({ ...c, icon: CALC_ICONS[c.id] ?? FALLBACK_ICON }));

/* Calculator ids are globally unique, so every calculator lives at ONE flat URL: /utilities/calculators/<id> */
if (import.meta.env?.DEV) {
  const seen = new Set();
  CALCULATORS.forEach((c) => {
    if (seen.has(c.id)) console.warn(`[calculators] duplicate id "${c.id}" — flat URLs need unique ids`);
    seen.add(c.id);
  });
}

/** Shown as one-click chips under the hub search. Unknown ids are ignored. */
export const POPULAR_IDS = ['position-size', 'risk-reward', 'risk-of-ruin', 'kelly', 'pip-value', 'compounding'];

export const getCategory = (id) => CATEGORIES.find((c) => c.id === id) ?? null;

export const calculatorsIn = (categoryId) => CALCULATORS.filter((c) => c.category === categoryId);

export const findCalculator = (id) => CALCULATORS.find((c) => c.id === id) ?? null;

export const calculatorPath = (c) => `${HUB_PATH}/${c.id}`;

export const categoryPath = (categoryId) => `${HUB_PATH}?cat=${categoryId}`;

export function searchCalculators(query) {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return CALCULATORS;
  return CALCULATORS.filter((c) => {
    const hay = `${c.title} ${c.desc} ${(c.keywords || []).join(' ')} ${getCategory(c.category)?.label ?? ''}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}
