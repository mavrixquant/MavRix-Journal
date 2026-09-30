
// apps/web/src/shared/trading/enrich.js
import { getSession, get30MinBucket, DOW_NAMES } from './time.js';

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Duration between entry and exit, in minutes.
// Overnight trades (exit < entry in wall-clock) wrap to next day (+24h).
function computeDurationMinutes(entryStr, exitStr) {
  const entryMin = parseTimeToMinutes(entryStr);
  const exitMin = parseTimeToMinutes(exitStr);
  let d = exitMin - entryMin;
  if (d < 0) d += 24 * 60;
  return d;
}

// Reserved keys — never treated as user-defined "dynamic" columns.
//
// This mirrors the API's RESERVED set in
// apps/api/src/services/trades.service.js. Keep both in sync.
//
// NOTE: `notes` MUST be here. If it isn't, enrichTradesFromDB() treats it as
// a custom column, and the trade table renders a duplicate "Notes" column.
const STANDARD_KEYS = new Set([
  'accountId',
  'tradeId',
  'date',
  'entryTime',
  'exitTime',
  'direction',
  'symbol',

  // Backtester-only
  'mae',
  'mfe',
  'slPoints',

  // Journal-only
  'entryPrice',
  'takeProfit',
  'stopLoss',

  // Common
  'pnl',
  'quantity',
  'notes',

  // Derived / internal
  'commission',
  'netPnl',
  'durationMinutes',
  'createdAt',
  'updatedAt',
  'id',
]);

export function enrichTradesFromDB(rawTrades) {
  if (!rawTrades || rawTrades.length === 0) {
    return { enrichedTrades: [], dynamicKeys: [] };
  }

  const allKeys = new Set();
  rawTrades.forEach(trade => Object.keys(trade).forEach(key => allKeys.add(key)));
  const dynamicKeys = [...allKeys].filter(key => !STANDARD_KEYS.has(key));

  const enrichedTrades = rawTrades.map((trade, index) => {
    let dateStr = trade.date;
    if (dateStr instanceof Date) {
      dateStr = dateStr.toISOString().slice(0, 10);
    } else if (typeof dateStr === 'string') {
      dateStr = dateStr.slice(0, 10);
    } else {
      dateStr = String(dateStr).slice(0, 10);
    }

    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);

    const entryStr = trade.entryTime || '';
    const exitStr = trade.exitTime || entryStr;
    const entryMinutes = parseTimeToMinutes(entryStr);
    const durationMinutes = computeDurationMinutes(entryStr, exitStr);

    // mae / mfe are nullable on the model. For Live/Demo trades they arrive
    // as null; we normalize to 0 so downstream R-mode math never sees NaN.
    const mae = trade.mae == null ? 0 : Number(trade.mae) || 0;
    const mfe = trade.mfe == null ? 0 : Number(trade.mfe) || 0;

    const slPoints = trade.slPoints !== undefined && trade.slPoints !== null
      ? Number(trade.slPoints)
      : null;
    const quantity = trade.quantity !== undefined && trade.quantity !== null
      ? Number(trade.quantity)
      : null;

    // Journal-only fields — null on Backtest trades.
    const entryPrice = trade.entryPrice !== undefined && trade.entryPrice !== null
      ? Number(trade.entryPrice)
      : null;
    const takeProfit = trade.takeProfit !== undefined && trade.takeProfit !== null
      ? Number(trade.takeProfit)
      : null;
    const stopLoss = trade.stopLoss !== undefined && trade.stopLoss !== null
      ? Number(trade.stopLoss)
      : null;

    const dynamic = {};
    dynamicKeys.forEach(key => {
      dynamic[key] = trade[key] !== undefined ? String(trade[key]) : '—';
    });

    return {
      id: trade.id || index,
      date: dateStr,
      dateObj,
      entry: entryStr,
      exit: exitStr,
      dir: trade.direction || '—',
      setup: trade.setup || 'Unlabeled',
      factors: trade.factors || 'Unlabeled',
      pcz: trade.pcz || '—',
      vwap: trade.vwap || '—',
      early: trade.early || '—',
      delta: trade.delta || 0,
      notes: trade.notes || '',
      symbol: trade.symbol || '—',
      pnl: trade.pnl !== undefined ? Number(trade.pnl) : 0,

      // Backtester-only
      mae,
      mfe,
      slPoints,

      // Journal-only
      entryPrice,
      takeProfit,
      stopLoss,

      // Common
      quantity,

      dow: dateObj.getDay(),
      dowName: DOW_NAMES[dateObj.getDay()],
      session: getSession(entryMinutes),
      bucket: get30MinBucket(entryMinutes),
      entryMinutes,
      durationMinutes,
      dynamic,
    };
  });

  return { enrichedTrades, dynamicKeys };
}