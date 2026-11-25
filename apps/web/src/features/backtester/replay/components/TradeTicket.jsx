import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { MousePointerClick, X } from 'lucide-react';
import { fmtMoney, fmtSigned, toneOf } from '../../lib/format';
import { unrealisedPnl, unrealisedPoints } from '../../lib/replayMath';
import {
  deriveOrderType, orderLabel, plannedRisk, positionFromDrawing,
} from '../../lib/orders';
import { netOf } from '../../lib/sessionStats';

const numOrNull = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));

function OpenPosition({ pos, price, currency, onClose, busy, writable, precision, selected }) {
  const pnl = unrealisedPnl(pos, price) - (Number(pos.commission) || 0);
  const pts = unrealisedPoints(pos, price);
  const long = pos.side !== 'short';
  return (
    <section className={`rp-card rp-pos${selected ? ' is-selected' : ''}`}>
      <header>
        <span className={`rp-side ${long ? 'is-long' : 'is-short'}`}>{long ? 'LONG' : 'SHORT'}</span>
        <b>{pos.symbol}</b>
        <em>× {pos.quantity}</em>
        <strong className={toneOf(pnl)}>{fmtSigned(pnl, currency)}</strong>
      </header>
      <div className="rp-kv"><span>Entry</span><b>{Number(pos.entryPrice).toFixed(precision)}</b></div>
      <div className="rp-kv"><span>Last</span><b>{price != null ? Number(price).toFixed(precision) : '—'}</b></div>
      <div className="rp-kv"><span>Open points</span><b className={toneOf(pts)}>{pts > 0 ? '+' : ''}{pts.toFixed(2)}</b></div>
      <div className="rp-kv"><span>Stop / Target</span><b>{pos.stopLoss ? Number(pos.stopLoss).toFixed(precision) : '—'} / {pos.takeProfit ? Number(pos.takeProfit).toFixed(precision) : '—'}</b></div>
      <button type="button" className="rp-btn is-danger rp-wide" onClick={() => onClose(pos)} disabled={busy || !writable}>Close at market</button>
    </section>
  );
}

function PendingOrder({ ord, currency, onCancel, busy, writable, precision, selected }) {
  const long = ord.side !== 'short';
  return (
    <section className={`rp-card rp-pend${selected ? ' is-selected' : ''}`}>
      <header>
        <span className={`rp-side ${long ? 'is-long' : 'is-short'}`}>{orderLabel(ord.side, ord.orderType).toUpperCase()}</span>
        <b>{ord.symbol}</b>
        <em>× {ord.quantity}</em>
      </header>
      <div className="rp-kv"><span>Order price</span><b>{Number(ord.orderPrice ?? ord.entryPrice).toFixed(precision)}</b></div>
      <div className="rp-kv"><span>Stop / Target</span><b>{ord.stopLoss ? Number(ord.stopLoss).toFixed(precision) : '—'} / {ord.takeProfit ? Number(ord.takeProfit).toFixed(precision) : '—'}</b></div>
      <p className="rp-sub">Waiting for price to reach the order. {currency ? '' : ''}</p>
      <button type="button" className="rp-btn rp-wide" onClick={() => onCancel(ord)} disabled={busy || !writable}><X size={13} /> Cancel order</button>
    </section>
  );
}

/**
 * Order panel. There are no manual price / SL / TP fields: you draw a long or short
 * position on the chart, select it, enter a quantity and place the order.
 */
export default function TradeTicket({
  session, symbol, currentBar, precision, trades, engine, drawing, onPlaced, onArm, selectedTradeId,
}) {
  const cfg = session.propFirmConfig;
  const cur = session.currency;
  const writable = engine.writable;
  const price = currentBar?.close ?? null;
  const [qty, setQty] = useState('1');
  const [orderMode, setOrderMode] = useState('limit'); // 'limit' or 'market'
  const [marketSL, setMarketSL] = useState(null);
  const [marketTP, setMarketTP] = useState(null);
  const [useMarketSL, setUseMarketSL] = useState(false);
  const [useMarketTP, setUseMarketTP] = useState(false);
  const [error, setError] = useState('');

  const pos = useMemo(() => positionFromDrawing(drawing), [drawing]);
  const type = pos && price != null ? deriveOrderType({ side: pos.side, entry: pos.entry, last: price, precision }) : null;
  const q = numOrNull(qty);
  const plan = pos ? plannedRisk({ ...pos, quantity: q, symbol }) : null;

  const blocked =
    !writable ? 'This session is closed.'
      : engine.openPosition ? `You already have an open ${symbol} position.`
        : engine.pendingOrder ? `You already have a pending ${symbol} order. Cancel it first.`
          : price == null ? 'Waiting for price…'
            : null;

  const place = async () => {
    setError('');
    if (!pos) return;
    if (!q || q <= 0) { setError('Enter a quantity above zero.'); return; }
    if (session.type === 'prop' && cfg?.maxPositionSize && q > cfg.maxPositionSize) {
      setError(`Max position size for this account is ${cfg.maxPositionSize}.`); return;
    }
    try {
      const trade = await engine.placeOrder({ ...pos, quantity: q });
      toast.success(
        trade.orderType === 'market'
          ? `${pos.side === 'long' ? 'Bought' : 'Sold'} ${q} ${symbol} @ ${Number(trade.entryPrice).toFixed(precision)}`
          : `${orderLabel(pos.side, trade.orderType)} placed @ ${Number(pos.entry).toFixed(precision)}`,
      );
      onPlaced?.(drawing.id);
    } catch (ex) {
      setError(ex?.message || 'Could not place the order.');
    }
  };

  const placeMarket = async (side) => {
    if (!writable) { setError('This session is closed.'); return; }
    if (engine.openPosition) { setError(`You already have an open ${symbol} position.`); return; }
    if (engine.pendingOrder) { setError(`You already have a pending ${symbol} order. Cancel it first.`); return; }
    if (price == null) { setError('Waiting for price…'); return; }
    const q = numOrNull(qty);
    if (!q || q <= 0) { setError('Enter a quantity above zero.'); return; }
    if (session.type === 'prop' && cfg?.maxPositionSize && q > cfg.maxPositionSize) {
      setError(`Max position size for this account is ${cfg.maxPositionSize}.`); return;
    }
    setError('');
    try {
      const sl = useMarketSL && marketSL ? (side === 'long' ? price - marketSL : price + marketSL) : null;
      const tp = useMarketTP && marketTP ? (side === 'long' ? price + marketTP : price - marketTP) : null;
      await engine.placeOrder({ side, entry: price, quantity: q, stopLoss: sl, takeProfit: tp });
      toast.success(`${side === 'long' ? 'Bought' : 'Sold'} ${q} ${symbol} @ ${price}`);
    } catch (ex) {
      setError(ex?.message || 'Could not place the market order.');
    }
  };

  const recent = useMemo(() => [...trades].reverse().slice(0, 6), [trades]);
  const fmtP = (v) => (v == null ? '—' : Number(v).toFixed(precision));

  return (
    <div className="rp-ticket">
      {engine.openPosition && (
        <OpenPosition
          pos={engine.openPosition} price={price} currency={cur} precision={precision}
          selected={selectedTradeId === engine.openPosition.tradeId}
          onClose={async (p) => { try { await engine.closeManual(p); toast.success('Position closed'); } catch (e) { toast.error(e?.message || 'Could not close.'); } }}
          busy={engine.busy} writable={writable}
        />
      )}

      {engine.pendingOrders.map((o) => (
        <PendingOrder
          key={o.tradeId} ord={o} currency={cur} precision={precision} selected={selectedTradeId === o.tradeId}
          onCancel={async (x) => { try { await engine.cancelOrder(x); toast.success('Order cancelled'); } catch (e) { toast.error(e?.message || 'Could not cancel.'); } }}
          busy={engine.busy} writable={writable}
        />
      ))}

      <section className="rp-card">
        <header className="rp-card-head">
          <b>Place order</b>
          <div className="rp-modes">
            <button type="button" className={orderMode === 'limit' ? 'is-on' : ''} onClick={() => setOrderMode('limit')}>Limit/Stop</button>
            <button type="button" className={orderMode === 'market' ? 'is-on' : ''} onClick={() => setOrderMode('market')}>Market</button>
          </div>
        </header>

        {orderMode === 'market' ? (
          <div className="rp-guide">
            <p>Place a market order:</p>
            <label className="rp-field">
              <span>Quantity</span>
              <input className="rp-input" type="number" min="0" step="any" value={qty} onChange={(e) => setQty(e.target.value)} disabled={!writable} />
            </label>
            <div className="rp-field-row">
              <span>Stop Loss</span>
              <div className="rp-toggle">
                <button type="button" className={!useMarketSL ? 'is-on' : ''} onClick={() => setUseMarketSL(false)}>Off</button>
                <button type="button" className={useMarketSL ? 'is-on' : ''} onClick={() => setUseMarketSL(true)}>On</button>
              </div>
              <input
                className="rp-input"
                type="number"
                min="0"
                step="any"
                value={marketSL || ''}
                onChange={(e) => setMarketSL(numOrNull(e.target.value))}
                disabled={!useMarketSL || !writable}
                placeholder="pts"
              />
            </div>
            <div className="rp-field-row">
              <span>Take Profit</span>
              <div className="rp-toggle">
                <button type="button" className={!useMarketTP ? 'is-on' : ''} onClick={() => setUseMarketTP(false)}>Off</button>
                <button type="button" className={useMarketTP ? 'is-on' : ''} onClick={() => setUseMarketTP(true)}>On</button>
              </div>
              <input
                className="rp-input"
                type="number"
                min="0"
                step="any"
                value={marketTP || ''}
                onChange={(e) => setMarketTP(numOrNull(e.target.value))}
                disabled={!useMarketTP || !writable}
                placeholder="pts"
              />
            </div>
            <div className="rp-two">
              <button type="button" className={`rp-buy ${orderMode === 'market' ? 'is-on' : ''}`} onClick={() => placeMarket('long')} disabled={!writable}>Buy Market</button>
              <button type="button" className={`rp-sell ${orderMode === 'market' ? 'is-on' : ''}`} onClick={() => placeMarket('short')} disabled={!writable}>Sell Market</button>
            </div>
            {error && <div className="rp-error" role="alert">{error}</div>}
          </div>
        ) : !pos ? (
          <div className="rp-guide">
            <p><MousePointerClick size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '6px' }} /> Mark your trade on the chart: pick <b>Long</b> or <b>Short</b>, click the entry price, then drag the stop and target. Select the position to place it.</p>
            <div className="rp-two">
              <button type="button" className="rp-buy is-on" onClick={() => onArm('rrLong')} disabled={!writable}>Long</button>
              <button type="button" className="rp-sell is-on" onClick={() => onArm('rrShort')} disabled={!writable}>Short</button>
            </div>
          </div>
        ) : (
          <>
            <div className="rp-planhead">
              <span className={`rp-side ${pos.side === 'long' ? 'is-long' : 'is-short'}`}>{pos.side === 'long' ? 'LONG' : 'SHORT'}</span>
              <b>{orderLabel(pos.side, type)}</b>
              <em>{type === 'market' ? 'fills at the last price' : 'rests until price reaches it'}</em>
            </div>
            <div className="rp-kv"><span>Entry</span><b>{fmtP(pos.entry)}</b></div>
            <div className="rp-kv"><span>Stop loss</span><b className="neg">{fmtP(pos.stopLoss)} <i>{plan.riskPts != null ? `(${plan.riskPts.toFixed(2)} pts)` : ''}</i></b></div>
            <div className="rp-kv"><span>Take profit</span><b className="pos">{fmtP(pos.takeProfit)} <i>{plan.rewardPts != null ? `(${plan.rewardPts.toFixed(2)} pts)` : ''}</i></b></div>

            <label className="rp-field">
              <span>Quantity {session.type === 'prop' && cfg?.maxPositionSize ? <i>max {cfg.maxPositionSize}</i> : null}</span>
              <input className="rp-input" type="number" min="0" step="any" value={qty} onChange={(e) => setQty(e.target.value)} disabled={!!blocked} />
            </label>

            <div className="rp-rr">
              <span>Risk <b className="neg">{plan.risk != null ? fmtMoney(plan.risk, cur, { digits: 0 }) : '—'}</b></span>
              <span>Reward <b className="pos">{plan.reward != null ? fmtMoney(plan.reward, cur, { digits: 0 }) : '—'}</b></span>
              <span>R:R <b>{plan.rr != null ? plan.rr.toFixed(2) : '—'}</b></span>
            </div>

            {error && <div className="rp-error" role="alert">{error}</div>}
            {blocked && <div className="rp-hint">{blocked}</div>}

            <button type="button" className={`rp-submit ${pos.side === 'long' ? 'is-buy' : 'is-sell'}`} onClick={place} disabled={!!blocked || engine.busy}>
              {engine.busy ? 'Working…' : `Place ${orderLabel(pos.side, type)}`}
            </button>
          </>
        )}
      </section>

      <section className="rp-card">
        <header className="rp-card-head"><b>Recent trades</b><em>{trades.length} total</em></header>
        {recent.length === 0 ? (
          <div className="rp-empty">No trades yet.</div>
        ) : (
          <ul className="rp-recent">
            {recent.map((t) => {
              const done = !!t.exitTime;
              const pend = !done && t.orderType !== 'market' && !t.filledAt;
              const n = done ? netOf(t) : null;
              return (
                <li key={t.tradeId}>
                  <span className={`rp-side ${t.side === 'short' ? 'is-short' : 'is-long'}`}>{t.side === 'short' ? 'S' : 'L'}</span>
                  <b>{t.symbol}</b>
                  <em>× {t.quantity}</em>
                  <strong className={n == null ? '' : toneOf(n)}>{done ? fmtSigned(n, cur) : pend ? 'pending' : 'open'}</strong>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
