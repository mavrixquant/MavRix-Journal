import { clockOf, dayKey } from './time';

/**
 * Adapter: BacktestTrade (UTC DateTime, side) -> journal-style row
 * (date + HH:MM wall clock in the display timezone, direction).
 * Lets backtest rows be shown / exported with the same vocabulary as the journal.
 */
export function toJournalTrade(t, tz) {
  const entry = t.entryTime;
  const exit = t.exitTime;
  return {
    id: t.id,
    tradeId: t.tradeId,
    date: dayKey(entry, tz),
    entryTime: clockOf(entry, tz),
    exitDate: exit ? dayKey(exit, tz) : null,
    exitTime: exit ? clockOf(exit, tz) : '',
    direction: t.side === 'short' ? 'Short' : 'Long',
    symbol: t.symbol,
    entryPrice: t.entryPrice,
    exitPrice: t.exitPrice,
    stopLoss: t.stopLoss,
    takeProfit: t.takeProfit,
    slPoints: t.slPoints,
    pnl: t.pnl,
    commission: t.commission,
    quantity: t.quantity,
    notes: t.notes,
    strategyId: t.strategyId,
    strategy: t.strategy,
    exitReason: t.exitReason,
    orderType: t.orderType || 'market',
  };
}
