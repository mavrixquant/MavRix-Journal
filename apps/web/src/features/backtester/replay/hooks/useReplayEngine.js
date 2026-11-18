import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { evaluatePropRules } from '../../lib/propRules';
import { checkFill, newTradeId, unrealisedPnl } from '../../lib/replayMath';
import { checkOrderFill, deriveOrderType, isOpenPosition, isPending, orderLabel } from '../../lib/orders';
import { snapToBar, toMs } from '../../lib/time';

export const SPEEDS = [1, 2, 5, 10, 25, 50];
const WARMUP_BARS = 80;

/**
 * The replay clock + order engine.
 *
 * Source of truth is an index into the BASE bars of the active symbol.
 * Every forward move walks bar-by-bar so SL / TP / prop-rule breaches are
 * never skipped, no matter how big the jump.
 */
export default function useReplayEngine({
  session, symbol, bars, trades, tz,
  createTrade, updateTrade, deleteTrade, updateSession,
  onConcluded, precision = 2,
}) {
  const last = bars.length - 1;
  const [idx, setIdxState] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(5);
  const [busy, setBusy] = useState(false);

  const idxRef = useRef(-1);
  const barsRef = useRef(bars);
  const tradesRef = useRef(trades);
  const sessionRef = useRef(session);
  const symbolRef = useRef(symbol);
  const tzRef = useRef(tz);
  const precisionRef = useRef(precision);
  precisionRef.current = precision;
  const closingRef = useRef(new Set());
  const cursorTimeRef = useRef(null);
  const savedCursorRef = useRef(null);
  const initKeyRef = useRef(null);
  const concludingRef = useRef(false);
  barsRef.current = bars;
  tradesRef.current = trades;
  sessionRef.current = session;
  symbolRef.current = symbol;
  tzRef.current = tz;

  const writable = session?.status === 'active';

  const setIdx = useCallback((n) => {
    idxRef.current = n;
    setIdxState(n);
    const b = barsRef.current[n];
    if (b) cursorTimeRef.current = b.utc;
  }, []);

  /* ---------------------------- cursor persistence ---------------------------- */
  const saveCursor = useCallback(() => {
    const t = cursorTimeRef.current;
    const s = sessionRef.current;
    if (!t || !s || s.status !== 'active') return;
    if (savedCursorRef.current === t) return;
    savedCursorRef.current = t;
    updateSession({ id: s.id, patch: { replayTime: new Date(t * 1000).toISOString() } }).catch(() => {
      savedCursorRef.current = null;
    });
  }, [updateSession]);

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') saveCursor(); };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      saveCursor();
    };
  }, [saveCursor]);

  /* ------------------------------- initial cursor ------------------------------ */
  useEffect(() => {
    if (!bars.length || !session) return;
    const key = `${session.id}:${symbol}`;
    if (initKeyRef.current === key) return;
    initKeyRef.current = key;

    let start;
    if (cursorTimeRef.current) {
      start = Math.max(0, snapToBar(bars, cursorTimeRef.current));
    } else if (session.replayTime) {
      start = Math.max(0, snapToBar(bars, toMs(session.replayTime) / 1000));
    } else {
      start = Math.min(bars.length - 1, Math.min(WARMUP_BARS, Math.floor(bars.length * 0.2)));
    }
    savedCursorRef.current = bars[start]?.utc ?? null;
    setIdx(start);
  }, [bars, session, symbol, setIdx]);

  /* ----------------------- earliest rewindable position ----------------------- */
  const minIdx = useMemo(() => {
    if (!bars.length) return 0;
    let m = 0;
    for (const t of trades) {
      m = Math.max(m, snapToBar(bars, toMs(t.entryTime) / 1000));
      if (t.exitTime) m = Math.max(m, snapToBar(bars, toMs(t.exitTime) / 1000));
    }
    return Math.max(0, m);
  }, [bars, trades]);
  const minIdxRef = useRef(0);
  minIdxRef.current = minIdx;

  const safeIdx = bars.length ? Math.max(0, Math.min(idx, last)) : -1;
  const currentBar = safeIdx >= 0 ? bars[safeIdx] : null;
  const endReached = bars.length > 0 && safeIdx >= last;

  const openPositions = useMemo(() => trades.filter(isOpenPosition), [trades]);
  const pendingOrders = useMemo(() => trades.filter(isPending), [trades]);
  const openPosition = useMemo(
    () => openPositions.find((t) => t.symbol === symbol) || null,
    [openPositions, symbol],
  );
  const pendingOrder = useMemo(
    () => pendingOrders.find((t) => t.symbol === symbol) || null,
    [pendingOrders, symbol],
  );

  const openPnl = useMemo(() => {
    if (!currentBar) return 0;
    return openPositions
      .filter((t) => t.symbol === symbol)
      .reduce((s, t) => s + unrealisedPnl(t, currentBar.close) - (Number(t.commission) || 0), 0);
  }, [openPositions, currentBar, symbol]);

  const prop = useMemo(() => {
    if (session?.type !== 'prop') return null;
    return evaluatePropRules(session, trades, {
      tz, nowMs: currentBar ? currentBar.utc * 1000 : undefined, openPnl,
    });
  }, [session, trades, tz, currentBar, openPnl]);

  /* --------------------------------- closing --------------------------------- */
  const closePosition = useCallback(async (trade, price, utcSec, reason = 'manual') => {
    if (closingRef.current.has(trade.tradeId)) return null;
    closingRef.current.add(trade.tradeId);
    try {
      return await updateTrade({
        tradeId: trade.tradeId,
        patch: {
          exitTime: new Date(utcSec * 1000).toISOString(),
          exitPrice: price,
          exitReason: reason,
        },
      });
    } finally {
      closingRef.current.delete(trade.tradeId);
    }
  }, [updateTrade]);

  const pause = useCallback(() => setPlaying(false), []);

  /* ------------------------------- the clock ------------------------------- */
  const advanceTo = useCallback(async (target) => {
    const b = barsRef.current;
    if (!b.length) return;
    const cur = idxRef.current;
    const t = Math.max(minIdxRef.current, Math.min(b.length - 1, target));

    if (t <= cur) { setIdx(t); return; }

    const sym = symbolRef.current;
    const s = sessionRef.current;

    for (let i = cur + 1; i <= t; i += 1) {
      const bar = b[i];

      // 1) Resting limit / stop orders (never on the bar they were placed on).
      const resting = tradesRef.current.filter(
        (x) => isPending(x) && x.symbol === sym && !closingRef.current.has(x.tradeId),
      );
      for (const ord of resting) {
        if (toMs(ord.entryTime) / 1000 >= bar.utc) continue;
        const hit = checkOrderFill(ord, bar);
        if (hit) {
          setIdx(i);
          setPlaying(false);
          closingRef.current.add(ord.tradeId);
          try {
            await updateTrade({
              tradeId: ord.tradeId,
              patch: { fillTime: new Date(bar.utc * 1000).toISOString(), fillPrice: hit.price },
            });
            toast(`${orderLabel(ord.side, ord.orderType)} filled`, {
              description: `${ord.symbol} × ${ord.quantity} @ ${hit.price}`,
            });
            saveCursor();
          } catch (e) {
            toast.error(e?.message || 'Could not fill the order.');
          } finally {
            closingRef.current.delete(ord.tradeId);
          }
          return; // a fill never exits on the same bar
        }
      }

      // 2) Live positions: stop / target.
      const opens = tradesRef.current.filter(
        (x) => isOpenPosition(x) && x.symbol === sym && !closingRef.current.has(x.tradeId),
      );

      for (const pos of opens) {
        if (toMs(pos.entryTime) / 1000 >= bar.utc) continue; // never fill on/before the entry bar
        const fill = checkFill(pos, bar);
        if (fill) {
          setIdx(i);
          setPlaying(false);
          try {
            await closePosition(pos, fill.price, bar.utc, fill.reason);
            toast(fill.reason === 'tp' ? 'Take profit hit' : 'Stop loss hit', {
              description: `${pos.symbol} closed at ${fill.price}`,
            });
            saveCursor();
          } catch (e) {
            toast.error(e?.message || 'Could not close the position.');
          }
          return;
        }
      }

      if (opens.length && s?.type === 'prop') {
        const floating = opens.reduce(
          (sum, p) => sum + unrealisedPnl(p, bar.close) - (Number(p.commission) || 0), 0,
        );
        const res = evaluatePropRules(s, tradesRef.current, {
          tz: tzRef.current, nowMs: bar.utc * 1000, openPnl: floating,
        });
        if (res?.failed) { setIdx(i); setPlaying(false); return; } // the breach effect takes it from here
      }
    }
    setIdx(t);
  }, [closePosition, saveCursor, setIdx, updateTrade]);

  const step = useCallback((dir) => advanceTo(idxRef.current + dir), [advanceTo]);

  const jumpToTime = useCallback((utcSec) => {
    const b = barsRef.current;
    if (!b.length) return;
    const target = snapToBar(b, utcSec);
    if (target < 0) { advanceTo(0); return; }
    if (target < minIdxRef.current) toast('Can’t rewind before an existing trade.');
    advanceTo(target);
    saveCursor();
  }, [advanceTo, saveCursor]);

  /* ------------------------------- playback ------------------------------- */
  useEffect(() => {
    if (!playing) return undefined;
    const tickMs = Math.max(50, Math.round(1000 / speed));
    const perTick = Math.max(1, Math.round((speed * tickMs) / 1000));
    let alive = true;
    let running = false;
    const id = setInterval(async () => {
      if (!alive || running) return;
      running = true;
      try {
        const next = Math.min(idxRef.current + perTick, barsRef.current.length - 1);
        await advanceTo(next);
      } finally {
        running = false;
      }
    }, tickMs);
    return () => { alive = false; clearInterval(id); };
  }, [playing, speed, advanceTo]);

  useEffect(() => {
    if (!playing) saveCursor();
  }, [playing, saveCursor]);

  useEffect(() => {
    if (playing && endReached) {
      setPlaying(false);
      toast('End of the session range.');
    }
  }, [playing, endReached]);

  const play = useCallback(() => {
    if (!writable) { toast('This session is closed. Reopen it from the dashboard to keep trading.'); return; }
    if (idxRef.current >= barsRef.current.length - 1) return;
    setPlaying(true);
  }, [writable]);
  const toggle = useCallback(() => (playing ? pause() : play()), [playing, pause, play]);

  /* -------------------------------- orders -------------------------------- */
  /**
   * Place a position drawn on the chart. The entry price decides the order type:
   * at the last price -> market, otherwise a limit or stop order that rests until
   * the replay reaches it.
   */
  const placeOrder = useCallback(async (o) => {
    const s = sessionRef.current;
    const bar = barsRef.current[idxRef.current];
    if (!bar) throw new Error('No price available yet.');
    if (s?.status !== 'active') throw new Error('This session is closed.');
    setPlaying(false);
    setBusy(true);
    try {
      const orderType = deriveOrderType({
        side: o.side, entry: o.entry, last: bar.close, precision: precisionRef.current,
      });
      const trade = await createTrade({
        tradeId: newTradeId(),
        symbol: symbolRef.current,
        side: o.side,
        entryTime: new Date(bar.utc * 1000).toISOString(),
        entryPrice: orderType === 'market' ? bar.close : o.entry,
        orderType,
        quantity: o.quantity,
        stopLoss: o.stopLoss ?? null,
        takeProfit: o.takeProfit ?? null,
      });
      saveCursor();
      return trade;
    } finally {
      setBusy(false);
    }
  }, [createTrade, saveCursor]);

  const cancelOrder = useCallback(async (trade) => {
    setBusy(true);
    try {
      await deleteTrade(trade.tradeId);
    } finally {
      setBusy(false);
    }
  }, [deleteTrade]);

  const closeManual = useCallback(async (trade) => {
    const bar = barsRef.current[idxRef.current];
    if (!bar) return null;
    setPlaying(false);
    setBusy(true);
    try {
      const res = await closePosition(trade, bar.close, bar.utc, 'manual');
      saveCursor();
      return res;
    } finally {
      setBusy(false);
    }
  }, [closePosition, saveCursor]);

  /* ----------------------------- end of session ----------------------------- */
  const finishSession = useCallback(async (reason, status = 'completed') => {
    if (concludingRef.current) return;
    concludingRef.current = true;
    setPlaying(false);
    setBusy(true);
    try {
      const s = sessionRef.current;
      const bar = barsRef.current[idxRef.current];
      for (const o of tradesRef.current.filter(isPending)) await deleteTrade(o.tradeId);
      const opens = tradesRef.current.filter(isOpenPosition);
      for (const t of opens) {
        const onThis = t.symbol === symbolRef.current && bar;
        await closePosition(
          t,
          onThis ? bar.close : t.entryPrice,
          onThis ? bar.utc : Math.floor(toMs(t.entryTime) / 1000),
          reason,
        );
      }
      await updateSession({
        id: s.id,
        patch: {
          status,
          ...(cursorTimeRef.current
            ? { replayTime: new Date(cursorTimeRef.current * 1000).toISOString() }
            : {}),
        },
      });
      onConcluded?.(reason);
    } catch (e) {
      concludingRef.current = false;
      toast.error(e?.message || 'Could not end the session.');
    } finally {
      setBusy(false);
    }
  }, [closePosition, deleteTrade, updateSession, onConcluded]);

  const conclude = useCallback(() => finishSession('conclude'), [finishSession]);

  // Prop rule breach -> flatten + end the session automatically.
  useEffect(() => {
    if (prop?.failed && session?.status === 'active' && !concludingRef.current) {
      toast.error('Prop rule breached', {
        description: prop.breach === 'daily' ? 'Max daily loss reached.' : 'Max total loss reached.',
      });
      finishSession('prop_breach');
    }
  }, [prop, session?.status, finishSession]);

  /* --------------------------------- reset --------------------------------- */
  const reset = useCallback(async () => {
    const b = barsRef.current;
    if (!b.length) return false;
    setPlaying(false);
    const existing = tradesRef.current;
    if (existing.length > 0) {
      const ok = window.confirm(
        `Reset the replay? This deletes all ${existing.length} trade${existing.length === 1 ? '' : 's'} in this session.`,
      );
      if (!ok) return false;
      setBusy(true);
      try {
        for (const t of existing) await deleteTrade(t.tradeId);
      } catch (e) {
        toast.error(e?.message || 'Could not delete trades.');
        setBusy(false);
        return false;
      }
      setBusy(false);
      minIdxRef.current = 0;
    }
    concludingRef.current = false;
    const start = Math.min(b.length - 1, Math.min(WARMUP_BARS, Math.floor(b.length * 0.2)));
    setIdx(start);
    savedCursorRef.current = null;
    saveCursor();
    return true;
  }, [deleteTrade, saveCursor, setIdx]);

  return {
    idx: safeIdx, last, currentBar, endReached, minIdx,
    playing, play, pause, toggle, speed, setSpeed,
    step, jumpToTime, advanceTo, reset,
    openPosition, openPositions, pendingOrder, pendingOrders, openPnl, prop,
    placeOrder, cancelOrder, closeManual, conclude,
    busy, writable,
  };
}
