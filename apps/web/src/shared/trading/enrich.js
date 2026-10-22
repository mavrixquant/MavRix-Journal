import { getSession, get30MinBucket, DOW_NAMES } from './time.js';

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function computeDurationMinutes(entryStr, exitStr) {
  const entryMin = parseTimeToMinutes(entryStr);
  const exitMin = parseTimeToMinutes(exitStr);
  let d = exitMin - entryMin;
  if (d < 0) d += 24 * 60;
  return d;
}

const STANDARD_KEYS = new Set([
  'accountId',
  'tradeId',
  'strategyId',
  'strategy',
  'date',
  'entryTime',
  'exitTime',
  'direction',
  'symbol',

  'mae',
  'mfe',
  'slPoints',

  'entryPrice',
  'takeProfit',
  'stopLoss',

  'pnl',
  'quantity',
  'commission',
  'notes',

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

    const mae = trade.mae == null ? 0 : Number(trade.mae) || 0;
    const mfe = trade.mfe == null ? 0 : Number(trade.mfe) || 0;

    const slPoints = trade.slPoints !== undefined && trade.slPoints !== null
      ? Number(trade.slPoints)
      : null;
    const quantity = trade.quantity !== undefined && trade.quantity !== null
      ? Number(trade.quantity)
      : null;

    const commission = trade.commission !== undefined && trade.commission !== null
      ? Number(trade.commission)
      : null;

    const entryPrice = trade.entryPrice !== undefined && trade.entryPrice !== null
      ? Number(trade.entryPrice)
      : null;
    const takeProfit = trade.takeProfit !== undefined && trade.takeProfit !== null
      ? Number(trade.takeProfit)
      : null;
    const stopLoss = trade.stopLoss !== undefined && trade.stopLoss !== null
      ? Number(trade.stopLoss)
      : null;

    const strategyId = trade.strategyId ?? null;
    const strategy = trade.strategy ?? null;

    const dynamic = {};
    dynamicKeys.forEach(key => {
      dynamic[key] = trade[key] !== undefined ? String(trade[key]) : '—';
    });

    return {
      id: trade.id || index,
      strategyId,
      strategy,
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

      mae,
      mfe,
      slPoints,

      entryPrice,
      takeProfit,
      stopLoss,

      quantity,
      commission,

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