import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { getPointValue } from '@mavrix/shared';
import { useStrategies } from '@/shared/api/strategies';
import { fmtMoney, fmtSigned, toneOf } from '../../lib/format';
import { resolveBrackets, unrealisedPnl, unrealisedPoints, validateBrackets } from '../../lib/replayMath';
import { netOf } from '../../lib/sessionStats';

const numOrNull = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));

function OpenPosition({ pos, price, currency, onClose, onUpdate, busy, writable, precision }) {
  const [sl, setSl] = useState(pos.stopLoss ?? '');
  const [tp, setTp] = useState(pos.takeProfit ?? '');
  useEffect(() => { setSl(pos.stopLoss ?? ''); setTp(pos.takeProfit ?? ''); }, [pos.stopLoss, pos.takeProfit, pos.tradeId]);

  const pnl = unrealisedPnl(pos, price) - (Number(pos.commission) || 0);
  const pts = unrealisedPoints(pos, price);
  const long = pos.side !== 'short';
  const dirty = numOrNull(sl) !== (pos.stopLoss ?? null) || numOrNull(tp) !== (pos.takeProfit ?? null);

  const save = async () => {
    const stopLoss = numOrNull(sl);
    const takeProfit = numOrNull(tp);
    const err = validateBrackets({ side: pos.side, entry: pos.entryPrice, stopLoss, takeProfit });
    if (err) { toast.error(err); return; }
    try { await onUpdate(pos, { stopLoss, takeProfit }); toast.success('Position updated'); } catch (e) { toast.error(e?.message || 'Could not update.'); }
  };

  return (
    <section className="rp-card rp-pos">
      <header>
        <span className={`rp-side ${long ? 'is-long' : 'is-short'}`}>{long ? 'LONG' : 'SHORT'}</span>
        <b>{pos.symbol}</b>
        <em>× {pos.quantity}</em>
        <strong className={toneOf(pnl)}>{fmtSigned(pnl, currency)}</strong>
      </header>
      <div className="rp-kv"><span>Entry</span><b>{Number(pos.entryPrice).toFixed(precision)}</b></div>
      <div className="rp-kv"><span>Last</span><b>{price != null ? Number(price).toFixed(precision) : '—'}</b></div>
      <div className="rp-kv"><span>Open points</span><b className={toneOf(pts)}>{pts > 0 ? '+' : ''}{pts.toFixed(2)}</b></div>

      <div className="rp-two">
        <label className="rp-field"><span>Stop loss</span>
          <input className="rp-input" type="number" step="any" value={sl} onChange={(e) => setSl(e.target.value)} placeholder="none" disabled={!writable} />
        </label>
        <label className="rp-field"><span>Take profit</span>
          <input className="rp-input" type="number" step="any" value={tp} onChange={(e) => setTp(e.target.value)} placeholder="none" disabled={!writable} />
        </label>
      </div>

      <div className="rp-actions">
        <button type="button" className="rp-btn" onClick={save} disabled={!dirty || busy || !writable}>Update SL / TP</button>
        <button type="button" className="rp-btn is-danger" onClick={() => onClose(pos)} disabled={busy || !writable}>Close at market</button>
      </div>
    </section>
  );
}

export default function TradeTicket({
  session, symbol, currentBar, precision, openPosition, trades, engine, side, onSide,
}) {
  const cfg = session.propFirmConfig;
  const cur = session.currency;
  const writable = engine.writable;
  const price = currentBar?.close ?? null;
  const { data: strategies = [] } = useStrategies({ status: 'active' });

  const [qty, setQty] = useState('1');
  const [mode, setMode] = useState('points');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [commission, setCommission] = useState('');
  const [strategyId, setStrategyId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const pv = getPointValue(symbol);
  const resolved = useMemo(
    () => (price != null ? resolveBrackets({ side, entry: price, sl, tp, mode }) : { stopLoss: null, takeProfit: null }),
    [side, price, sl, tp, mode],
  );
  const q = numOrNull(qty);
  const risk = resolved.stopLoss != null && price != null && q ? Math.abs(price - resolved.stopLoss) * q * pv : null;
  const reward = resolved.takeProfit != null && price != null && q ? Math.abs(resolved.takeProfit - price) * q * pv : null;
  const rr = risk && reward ? reward / risk : null;

  const blocked =
    !writable ? 'This session is closed.'
      : openPosition ? `You already have an open ${symbol} position.`
        : price == null ? 'Waiting for price…'
          : null;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!q || q <= 0) { setError('Enter a quantity above zero.'); return; }
    if (session.type === 'prop' && cfg?.maxPositionSize && q > cfg.maxPositionSize) {
      setError(`Max position size for this account is ${cfg.maxPositionSize}.`); return;
    }
    const err = validateBrackets({ side, entry: price, ...resolved });
    if (err) { setError(err); return; }
    try {
      await engine.placeOrder({
        side, quantity: q, ...resolved,
        commission: numOrNull(commission), strategyId, notes: notes.trim(),
      });
      toast.success(`${side === 'long' ? 'Bought' : 'Sold'} ${q} ${symbol} @ ${price.toFixed(precision)}`);
      setNotes('');
    } catch (ex) {
      setError(ex?.message || 'Could not place the order.');
    }
  };

  const recent = useMemo(() => [...trades].reverse().slice(0, 6), [trades]);

  return (
    <div className="rp-ticket">
      {openPosition && (
        <OpenPosition
          pos={openPosition} price={price} currency={cur} precision={precision}
          onClose={async (p) => { try { await engine.closeManual(p); toast.success('Position closed'); } catch (e) { toast.error(e?.message || 'Could not close.'); } }}
          onUpdate={engine.updateBrackets} busy={engine.busy} writable={writable}
        />
      )}

      <form className="rp-card" onSubmit={submit}>
        <header className="rp-card-head"><b>New order</b><em>Market · {symbol}</em></header>

        <div className="rp-sidepick" role="group" aria-label="Side">
          <button type="button" className={`is-buy${side === 'long' ? ' is-on' : ''}`} onClick={() => onSide('long')}>Buy / Long</button>
          <button type="button" className={`is-sell${side === 'short' ? ' is-on' : ''}`} onClick={() => onSide('short')}>Sell / Short</button>
        </div>

        <div className="rp-kv"><span>Fill price</span><b>{price != null ? price.toFixed(precision) : '—'}</b></div>

        <label className="rp-field">
          <span>Quantity {session.type === 'prop' && cfg?.maxPositionSize ? <i>max {cfg.maxPositionSize}</i> : null}</span>
          <input className="rp-input" type="number" min="0" step="any" value={qty} onChange={(e) => setQty(e.target.value)} disabled={!!blocked} />
        </label>

        <div className="rp-mode" role="group" aria-label="Bracket input">
          <button type="button" className={mode === 'points' ? 'is-on' : ''} onClick={() => setMode('points')}>Points</button>
          <button type="button" className={mode === 'price' ? 'is-on' : ''} onClick={() => setMode('price')}>Price</button>
        </div>

        <div className="rp-two">
          <label className="rp-field"><span>Stop loss {mode === 'points' ? '(pts)' : ''}</span>
            <input className="rp-input" type="number" min="0" step="any" value={sl} onChange={(e) => setSl(e.target.value)} placeholder="optional" disabled={!!blocked} />
            {mode === 'points' && resolved.stopLoss != null && <small>{resolved.stopLoss.toFixed(precision)}</small>}
          </label>
          <label className="rp-field"><span>Take profit {mode === 'points' ? '(pts)' : ''}</span>
            <input className="rp-input" type="number" min="0" step="any" value={tp} onChange={(e) => setTp(e.target.value)} placeholder="optional" disabled={!!blocked} />
            {mode === 'points' && resolved.takeProfit != null && <small>{resolved.takeProfit.toFixed(precision)}</small>}
          </label>
        </div>

        {(risk != null || reward != null) && (
          <div className="rp-rr">
            <span>Risk <b className="neg">{risk != null ? fmtMoney(risk, cur, { digits: 0 }) : '—'}</b></span>
            <span>Reward <b className="pos">{reward != null ? fmtMoney(reward, cur, { digits: 0 }) : '—'}</b></span>
            <span>R:R <b>{rr != null ? rr.toFixed(2) : '—'}</b></span>
          </div>
        )}

        <label className="rp-field"><span>Commission <i>total, {cur}</i></span>
          <input className="rp-input" type="number" min="0" step="any" value={commission} onChange={(e) => setCommission(e.target.value)} placeholder="0" disabled={!!blocked} />
        </label>

        <label className="rp-field"><span>Strategy <i>optional</i></span>
          <select className="rp-input" value={strategyId} onChange={(e) => setStrategyId(e.target.value)} disabled={!!blocked}>
            <option value="">None</option>
            {strategies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>

        <label className="rp-field"><span>Notes</span>
          <textarea className="rp-input" rows={2} maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!!blocked} placeholder="Why this trade?" />
        </label>

        {error && <div className="rp-error" role="alert">{error}</div>}
        {blocked && <div className="rp-hint">{blocked}</div>}

        <button type="submit" className={`rp-submit ${side === 'long' ? 'is-buy' : 'is-sell'}`} disabled={!!blocked || engine.busy}>
          {engine.busy ? 'Working…' : side === 'long' ? `Buy ${symbol}` : `Sell ${symbol}`}
        </button>
      </form>

      <section className="rp-card">
        <header className="rp-card-head"><b>Recent trades</b><em>{trades.length} total</em></header>
        {recent.length === 0 ? (
          <div className="rp-empty">No trades yet. Place one above.</div>
        ) : (
          <ul className="rp-recent">
            {recent.map((t) => {
              const done = !!t.exitTime;
              const n = done ? netOf(t) : null;
              return (
                <li key={t.tradeId}>
                  <span className={`rp-side ${t.side === 'short' ? 'is-short' : 'is-long'}`}>{t.side === 'short' ? 'S' : 'L'}</span>
                  <b>{t.symbol}</b>
                  <em>× {t.quantity}</em>
                  <strong className={n == null ? '' : toneOf(n)}>{done ? fmtSigned(n, cur) : 'open'}</strong>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
