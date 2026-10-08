// apps/api/src/lib/marketData/index.js
//
// Public surface of the market data layer.

export {
  resolveSymbol,
  isSupported,
  SYMBOL_CATALOG,
  SUPPORTED_INTERVALS,
  YAHOO_SYMBOL_MAP,
  BIQUOTE_SYMBOL_MAP,
} from './symbolMap.js';

export { getBars as getYahooBars, getQuote as getYahooQuote } from './yahooProvider.js';
export { getBars as getBiquoteBars, getQuote as getBiquoteQuote } from './biquoteProvider.js';

export { getStats as getQueueStats } from './queue.js';
export { size as cacheSize, clearAll as clearCache } from './cache.js';