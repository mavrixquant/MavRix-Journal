import { getSession, get30MinBucket, DOW_NAMES } from './timeHelpers';

const SL = 12.5;

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// Standard fields that should NOT be treated as dynamic columns
const STANDARD_KEYS = new Set([
  'accountId',
  'tradeId',
  'date',
  'entryTime',
  'exitTime',
  'direction',
  'symbol',
  'mae',
  'mfe',
  'pnl',
  'createdAt',
  'updatedAt',
  'id',
]);

export function enrichTradesFromDB(rawTrades) {
  if (!rawTrades || rawTrades.length === 0) {
    return { enrichedTrades: [], dynamicKeys: [] };
  }

  // Determine dynamic keys from the union of all keys across trades
  const allKeys = new Set();
  rawTrades.forEach(trade => Object.keys(trade).forEach(key => allKeys.add(key)));
  const dynamicKeys = [...allKeys].filter(key => !STANDARD_KEYS.has(key));

  const enrichedTrades = rawTrades.map((trade, index) => {
    // Parse date
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

    // Map Firestore fields to internal names
    const entryStr = trade.entryTime || '';
    const exitStr = trade.exitTime || entryStr;
    const entryMinutes = parseTimeToMinutes(entryStr);
    const mae = Number(trade.mae) || 0;
    const mfe = Number(trade.mfe) || 0;

    // Build dynamic object
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
      dow: dateObj.getDay(),
      dowName: DOW_NAMES[dateObj.getDay()],
      session: getSession(entryMinutes),
      bucket: get30MinBucket(entryMinutes),
      entryMinutes,
      mae,
      mfe,
      slHit: (mae >= SL),
      rAchieved: (mae >= SL) ? 0 : +(mfe / SL).toFixed(2),
      dynamic,
    };
  });

  return { enrichedTrades, dynamicKeys };
}