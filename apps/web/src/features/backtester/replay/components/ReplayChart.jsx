import { forwardRef, useMemo } from 'react';
import CandlestickChart from '@/features/charts/components/CandlestickChart';
import { buildDisplayEntries, displayUpTo, unrealisedPnl } from '../../lib/replayMath';
import { INTERVAL_SECONDS, displayOffsetFor, snapToBar, toMs } from '../../lib/time';

const EMPTY = [];

/**
 * Thin wrapper around the shared CandlestickChart (imported, not forked).
 * It only ever receives candles up to the replay cursor, so the chart cannot
 * show — or auto-scale to — a price that has not "happened" yet.
 */
const ReplayChart = forwardRef(function ReplayChart({
  sessionId, symbol, baseInterval, viewInterval, bars, idx, trades, tz, precision,
  chartProps,
}, ref) {
  const isDaily = baseInterval === '1d';
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

    for (const t of trades) {
      if (t.symbol !== symbol) continue;
      const long = t.side !== 'short';
      const eIdx = snapToBar(displayBars, toMs(t.entryTime) / 1000);
      if (eIdx < 0) continue;
      const entryBar = displayBars[eIdx];
      const closed = !!t.exitTime;

      const pnl = closed
        ? (Number(t.pnl) || 0) - (Number(t.commission) || 0)
        : unrealisedPnl(t, currentClose) - (Number(t.commission) || 0);
      const win = Number.isFinite(pnl) ? pnl >= 0 : null;
      const label = `${closed ? '' : 'OPEN '}${pnl >= 0 ? '+' : '−'}${Math.abs(pnl).toFixed(0)}`;

      marks.push({
        time: entryBar.time,
        position: long ? 'belowBar' : 'aboveBar',
        shape: long ? 'arrowUp' : 'arrowDown',
        color: '#F5B544',
        text: long ? 'BUY' : 'SELL',
      });

      let exitBar = lastDisp;
      if (closed) {
        const xIdx = snapToBar(displayBars, toMs(t.exitTime) / 1000);
        if (xIdx >= 0) exitBar = displayBars[Math.max(xIdx, eIdx)];
        marks.push({
          time: exitBar.time,
          position: long ? 'aboveBar' : 'belowBar',
          shape: 'circle',
          color: win ? '#35C4A1' : '#FF5C5C',
          text: `${pnl >= 0 ? '+' : '−'}${Math.abs(pnl).toFixed(0)}`,
        });
      }

      bx.push({
        entryTimeSec: entryBar.time,
        // an open position's box stretches to the newest candle
        exitTimeSec: exitBar.time,
        entryPrice: t.entryPrice,
        stopLoss: t.stopLoss || null,
        takeProfit: t.takeProfit || null,
        label,
        win,
      });
    }

    // markers must be time-ascending
    marks.sort((a, b) => a.time - b.time);
    return { markers: marks, boxes: bx };
  }, [trades, displayBars, symbol, isDaily, currentClose]);

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
      showTradeLabels
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
