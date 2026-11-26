import { forwardRef, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import CandlestickChart from '@/shared/charts/CandlestickChart';
import { buildDisplayEntries, displayUpTo, unrealisedPnl } from '../../lib/replayMath';
import { isPending, orderLabel } from '../../lib/orders';
import { getPointValue } from '@mavrix/shared';
import { INTERVAL_SECONDS, displayOffsetFor, snapToBar, toMs } from '../../lib/time';

const EMPTY = [];

/**
 * Thin wrapper around the shared CandlestickChart (imported, not forked).
 * It only ever receives candles up to the replay cursor, so the chart cannot
 * show — or auto-scale to — a price that has not "happened" yet.
 */
const ReplayChart = forwardRef(function ReplayChart({
  sessionId, symbol, baseInterval, viewInterval, bars, idx, trades, tz, precision,
  chartProps, onSelectTrade, onOhlcChange, engine, showTrades = true,
}, ref) {
  const isDaily = baseInterval === '1d';

  /**
   * The chart calls this when you drop an SL or TP line (or a "+ SL / + TP" chip).
   * It sends ONE of { sl } or { tp }. We keep the other value, check the side, and save.
   * It THROWS on a bad drop / failed save so the chart snaps the line back at once.
   */
  const handleSLTPChange = useCallback(async (tradeId, patch) => {
    if (!engine) return;
    const trade = trades.find((t) => t.tradeId === tradeId);
    if (!trade) return;
    const pend = isPending(trade);
    const long = trade.side !== 'short';
    const entry = Number(pend ? (trade.orderPrice ?? trade.entryPrice) : trade.entryPrice);
    const round = (v) => Number(Number(v).toFixed(precision));

    const next = {
      stopLoss: patch.sl != null ? round(patch.sl) : (trade.stopLoss ?? null),
      takeProfit: patch.tp != null ? round(patch.tp) : (trade.takeProfit ?? null),
    };

    let problem = null;
    if (patch.sl != null && (long ? next.stopLoss >= entry : next.stopLoss <= entry)) {
      problem = long ? 'Stop loss must be below the entry price.' : 'Stop loss must be above the entry price.';
    } else if (patch.tp != null && (long ? next.takeProfit <= entry : next.takeProfit >= entry)) {
      problem = long ? 'Take profit must be above the entry price.' : 'Take profit must be below the entry price.';
    }
    if (problem) {
      toast.error(problem);
      throw new Error(problem);
    }

    try {
      if (pend) await engine.updatePending(trade, next);
      else await engine.updateSLTP(trade, next);
    } catch (e) {
      toast.error(e?.message || 'Could not update SL/TP.');
      throw e;
    }
  }, [engine, trades, precision]);

  const offset = useMemo(
    () => displayOffsetFor(bars, baseInterval, tz),
    [bars, baseInterval, tz],
  );

  const entries = useMemo(
    () => buildDisplayEntries(bars, {
      viewSec: INTERVAL_SECONDS[viewInterval],
      baseSec: INTERVAL_SECONDS[baseInterval],
      offset,
      isDaily,
    }),
    [bars, viewInterval, baseInterval, offset, isDaily],
  );

  const displayBars = useMemo(() => displayUpTo(entries, bars, idx), [entries, bars, idx]);
  const currentClose = idx >= 0 ? bars[idx]?.close : null;

  const { markers, boxes } = useMemo(() => {
    if (isDaily || displayBars.length === 0) return { markers: EMPTY, boxes: EMPTY };
    const lastDisp = displayBars[displayBars.length - 1];
    const marks = [];
    const bx = [];
    const f = (v) => Number(v).toFixed(precision);
    const sgn = (v, d = 0) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(d)}`;

    for (const t of trades) {
      if (t.symbol !== symbol) continue;
      const long = t.side !== 'short';
      const pend = isPending(t);
      const eIdx = snapToBar(displayBars, toMs(t.entryTime) / 1000);
      // Pending orders stay visible even if their entry time is before the first display bar.
      // Closed / open positions are skipped in that case.
      if (eIdx < 0 && !pend) continue;
      const entryBar = eIdx >= 0 ? displayBars[eIdx] : displayBars[0];
      const closed = !!t.exitTime;
      const pv = getPointValue(t.symbol);
      const q = Number(t.quantity) || 0;
      const entryPx = pend ? (t.orderPrice ?? t.entryPrice) : t.entryPrice;

      const slPts = t.stopLoss ? Math.abs(entryPx - t.stopLoss) : null;
      const tpPts = t.takeProfit ? Math.abs(t.takeProfit - entryPx) : null;
      const slLabel = t.stopLoss ? `SL ${f(t.stopLoss)} · ${sgn(-slPts * q * pv)} (${slPts.toFixed(2)} pts)` : undefined;
      const tpLabel = t.takeProfit ? `TP ${f(t.takeProfit)} · ${sgn(tpPts * q * pv)} (${tpPts.toFixed(2)} pts)` : undefined;

      let pnl = null;
      if (!pend) {
        pnl = closed
          ? (Number(t.pnl) || 0) - (Number(t.commission) || 0)
          : unrealisedPnl(t, currentClose) - (Number(t.commission) || 0);
      }
      const win = pnl == null || !Number.isFinite(pnl) ? null : pnl >= 0;
      const label = pend
        ? `${orderLabel(t.side, t.orderType).toUpperCase()} ×${q} @ ${f(entryPx)}`
        : `${long ? 'LONG' : 'SHORT'} ×${q}${closed ? '' : ' · open'} · ${sgn(pnl)}`;

      if (!pend) {
        marks.push({
          time: entryBar.time,
          position: long ? 'belowBar' : 'aboveBar',
          shape: long ? 'arrowUp' : 'arrowDown',
          color: '#F5B544',
          text: long ? 'BUY' : 'SELL',
        });
      }

      let exitTime = null;
      if (closed) {
        const xIdx = snapToBar(displayBars, toMs(t.exitTime) / 1000);
        if (xIdx >= 0) {
          const exitBar = displayBars[Math.max(xIdx, eIdx)];
          exitTime = exitBar.time;
          marks.push({
            time: exitBar.time,
            position: long ? 'aboveBar' : 'belowBar',
            shape: 'circle',
            color: win ? '#35C4A1' : '#FF5C5C',
            text: sgn(pnl),
          });
        }
      }

      bx.push({
        id: t.tradeId,
        // Pending order whose time is before the visible range: null -> line starts at the left edge.
        entryTimeSec: pend && eIdx < 0 ? null : entryBar.time,
        // null = still running (pending or open) -> lines stretch to the right edge and are draggable.
        exitTimeSec: pend ? null : exitTime,
        entryPrice: entryPx,
        stopLoss: t.stopLoss || null,
        takeProfit: t.takeProfit || null,
        label, slLabel, tpLabel, win, pending: pend, closed, long,
      });
    }

    marks.sort((a, b) => a.time - b.time);
    return { markers: marks, boxes: bx };
  }, [trades, displayBars, symbol, isDaily, currentClose, precision]);

  return (
    <CandlestickChart
      ref={ref}
      bars={displayBars}
      interval={viewInterval}
      symbol={symbol}
      precision={precision}
      markers={markers}
      trades={boxes}
      showTrades
      showTradeLabels={false}
      onSelectTrade={onSelectTrade}
      onOhlcChange={onOhlcChange}
      onSLTPChange={handleSLTPChange}
      fitKey={`${sessionId}-${symbol}-${viewInterval}`}
      fitMode="recent"
      hasMoreOlder={false}
      displayOffset={isDaily ? 0 : offset}
      loading={false}
      {...chartProps}
    />
  );
});

export default ReplayChart;