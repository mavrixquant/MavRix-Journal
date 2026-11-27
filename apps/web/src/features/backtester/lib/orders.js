import { computeBacktestPnl, getPointValue } from '@mavrix/shared';

/* ============================================================================
   Orders — pending limit / stop orders vs live positions. Pure helpers.
   A row is a PENDING ORDER when orderType != 'market' and it has not filled.
   ============================================================================ */

export const isPending = (t) => !t.exitTime && t.orderType && t.orderType !== 'market' && !t.filledAt;
export const isOpenPosition = (t) => !t.exitTime && !isPending(t);

export const ORDER_LABEL = {
  'long:market': 'Buy Market', 'short:market': 'Sell Market',
  'long:limit': 'Buy Limit', 'short:limit': 'Sell Limit',
  'long:stop': 'Buy Stop', 'short:stop': 'Sell Stop',
};
export const orderLabel = (side, type) => ORDER_LABEL[`${side}:${type}`] || 'Order';

export const tickOf = (precision) => 1 / 10 ** (Number.isFinite(precision) ? precision : 2);

/**
 * Which order does an entry price at `entry` become, given the latest price?
 *   buy  below market -> limit,  buy  above market -> stop
 *   sell above market -> limit,  sell below market -> stop
 *   within half a tick of the last price -> market
 */
export function deriveOrderType({ side, entry, last, precision }) {
  const tol = tickOf(precision) / 2;
  if (last == null || Math.abs(entry - last) <= tol) return 'market';
  const above = entry > last;
  if (side === 'long') return above ? 'stop' : 'limit';
  return above ? 'limit' : 'stop';
}

/** Side + prices of a 3-point position drawing ({ pts: [entry, stop, target] }). */
export function positionFromDrawing(d) {
  if (!d || d.type !== 'rr' || !d.pts || d.pts.length < 3) return null;
  const [e, s, t] = d.pts;
  if (e.p === s.p) return null;
  const side = e.p > s.p ? 'long' : 'short';
  return { side, entry: e.p, stopLoss: s.p, takeProfit: t.p };
}

/**
 * Did this bar trigger a resting order? Fills never happen on the bar the
 * order was placed on (the caller skips that). Gaps fill at the open.
 *   buy limit   : low  <= price  -> min(open, price)
 *   buy stop    : high >= price  -> max(open, price)
 *   sell limit  : high >= price  -> max(open, price)
 *   sell stop   : low  <= price  -> min(open, price)
 */
export function checkOrderFill(order, bar) {
  const price = Number(order.orderPrice ?? order.entryPrice);
  const long = order.side !== 'short';
  const limit = order.orderType === 'limit';
  if (long && limit) return bar.low <= price ? { price: Math.min(bar.open, price) } : null;
  if (long && !limit) return bar.high >= price ? { price: Math.max(bar.open, price) } : null;
  if (!long && limit) return bar.high >= price ? { price: Math.max(bar.open, price) } : null;
  return bar.low <= price ? { price: Math.min(bar.open, price) } : null;
}

/** Money at risk / reward for a planned position. */
export function plannedRisk({ side: _side, entry, stopLoss, takeProfit, quantity, symbol }) {
  const q = Number(quantity) || 0;
  const pv = getPointValue(symbol);
  const risk = stopLoss != null ? Math.abs(entry - stopLoss) * q * pv : null;
  const reward = takeProfit != null ? Math.abs(takeProfit - entry) * q * pv : null;
  return {
    risk, reward,
    riskPts: stopLoss != null ? Math.abs(entry - stopLoss) : null,
    rewardPts: takeProfit != null ? Math.abs(takeProfit - entry) : null,
    rr: risk && reward ? reward / risk : null,
  };
}

export { computeBacktestPnl };
