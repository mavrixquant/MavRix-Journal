import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';

import { useMarketCatalog, useMarketBars } from '@/shared/api/marketData';
import { queryClient } from '@/shared/api/queryClient';
import { useJournalTrades } from '@/shared/api/journalTrades';
import {
  tradeTimeToUtcSeconds,
  getTimezoneOffsetSeconds,
} from '@/shared/trading/tradeTime';
import { resolveTimezone } from '@/shared/format/datetime';
import { useSettings } from '@/app/layout/Settings/SettingsProvider';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';

import CandlestickChart from './components/CandlestickChart';
import QuoteHeader from './components/QuoteHeader';
import WatchlistSidebar from './components/WatchlistSidebar';
import ChartLoadingOverlay from './components/ChartLoadingOverlay';
import TradesDropdown from './components/TradesDropdown';

const DEFAULT_SYMBOL = 'NQ';
const DEFAULT_INTERVAL = '5m';

const BAR_DURATION_SEC = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '4h': 14400,
  '1d': 86400,
};

const CSS = `
  .chart2-root {
    --line: rgba(255,255,255,.085);
    --line-soft: rgba(255,255,255,.05);
    --ink-1: #E7E9EE;
    --ink-2: #8892A3;
    --ink-3: #545E6E;
    width: 100%;
    max-width: 1800px;
    margin: 0 auto;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 16px;
    color: var(--ink-1);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  .chart2-layout {
    display: grid;
    grid-template-columns: 280px minmax(0, 1fr);
    gap: 16px;
    align-items: start;
  }
  @media (max-width: 1100px) {
    .chart2-layout { grid-template-columns: minmax(0, 1fr); }
    .chart2-layout > :nth-child(1) { display: none; }
  }

  .chart2-stage {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    position: relative;
  }

  .chart2-off-range {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 14px;
    border-radius: 12px;
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
    color: var(--accent-2);
    font-family: 'IBM Plex Mono', ui-monospace, monospace;
    font-size: 11.5px;
    line-height: 1.55;
    letter-spacing: .01em;
  }
  .chart2-off-range svg { flex-shrink: 0; margin-top: 2px; }
  .chart2-off-range b { color: var(--accent); font-weight: 700; }
  .chart2-off-range em { color: var(--ink-1); font-style: normal; font-weight: 700; }

  .chart2-stage:fullscreen,
  .chart2-stage:-webkit-full-screen {
    background: #07090D;
    padding: 16px;
    gap: 12px;
    width: 100vw;
    height: 100vh;
    box-sizing: border-box;
    overflow: hidden;
  }
  .chart2-stage:fullscreen .chart2-shell,
  .chart2-stage:-webkit-full-screen .chart2-shell {
    flex: 1 1 auto;
    height: auto;
    max-height: none;
    min-height: 0;
  }

  .chart2-shell {
    position: relative;
    width: 100%;
    height: 720px;
    max-height: calc(100dvh - 200px);
    min-height: 400px;
    border-radius: 16px;
    border: 1px solid var(--line);
    background:
      linear-gradient(180deg, rgba(15,18,25,.72), rgba(15,18,25,.55));
    box-shadow:
      0 20px 50px -30px rgba(0,0,0,.9),
      inset 0 1px 0 rgba(255,255,255,.03);
    overflow: hidden;
    flex-shrink: 0;
  }
`;

export default function MarketChartPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { settings } = useSettings();

  const symbol = (searchParams.get('symbol') || DEFAULT_SYMBOL).toUpperCase();
  const interval = searchParams.get('interval') || DEFAULT_INTERVAL;

  const setSymbol = useCallback(
    (next) => {
      const sp = new URLSearchParams(searchParams);
      sp.set('symbol', next);
      setSearchParams(sp, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const setInterval = useCallback(
    (next) => {
      const sp = new URLSearchParams(searchParams);
      sp.set('interval', next);
      setSearchParams(sp, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  const displayTz = useMemo(
    () => resolveTimezone(settings?.preferences?.timezone || 'auto'),
    [settings?.preferences?.timezone]
  );

  const { data: catalog } = useMarketCatalog();
  const {
    data: barPayload,
    isFetching: barsFetching,
  } = useMarketBars({ symbol, interval, enabled: !!catalog });
  const { trades: journalTrades, isLoading: journalLoading } = useJournalTrades();

  const symbols = useMemo(() => catalog?.symbols ?? [], [catalog]);
  const currentSymbol = useMemo(
    () => symbols.find((s) => s.code === symbol),
    [symbols, symbol]
  );

  const bars = useMemo(() => {
    if (!barPayload) return [];
    if (String(barPayload.symbol || '').toUpperCase() !== symbol) return [];
    if (barPayload.interval !== interval) return [];
    return barPayload.bars ?? [];
  }, [barPayload, symbol, interval]);

  const displayOffset = useMemo(() => {
    if (interval === '1d') return 0;
    const ref = bars.length > 0
      ? bars[Math.floor(bars.length / 2)].time
      : Math.floor(Date.now() / 1000);
    return getTimezoneOffsetSeconds(displayTz, ref);
  }, [bars, interval, displayTz]);

  const displayBars = useMemo(() => {
    if (displayOffset === 0) return bars;
    return bars.map((b) => ({ ...b, time: b.time + displayOffset }));
  }, [bars, displayOffset]);

  const lastBarTime = useMemo(
    () => (bars.length > 0 ? bars[bars.length - 1].time : null),
    [bars]
  );

  const symbolTrades = useMemo(() => {
    if (!journalTrades || !Array.isArray(journalTrades)) return [];
    const upper = String(symbol || '').toUpperCase();
    return journalTrades.filter(
      (t) => String(t.symbol || '').toUpperCase() === upper
    );
  }, [journalTrades, symbol]);

  // Focused trade state & Toggles
  const [focusedTradeId, setFocusedTradeId] = useState(null);
  const [showPositions, setShowPositions] = useState(true);
  const [showLabels, setShowLabels] = useState(false);

  // Reset focus when symbol changes
  useEffect(() => {
    setFocusedTradeId(null);
  }, [symbol]);

  // Auto-off labels if positions are hidden
  useEffect(() => {
    if (!showPositions) {
      setShowLabels(false);
    }
  }, [showPositions]);

  // Compute mapped trades with Unix timestamps for the chart
  const chartTrades = useMemo(() => {
    return symbolTrades.map(t => {
      const entrySec = tradeTimeToUtcSeconds(t.date, t.entryTime, displayTz);
      const exitSec = tradeTimeToUtcSeconds(t.date, t.exitTime, displayTz);
      return {
        ...t,
        entryTimeSec: entrySec !== null ? entrySec + displayOffset : null,
        exitTimeSec: exitSec !== null ? exitSec + displayOffset : null,
      };
    }).filter(t => t.entryTimeSec !== null && t.exitTimeSec !== null);
  }, [symbolTrades, displayTz, displayOffset]);

  // ---- per-trade analysis (markers) ----
  const tradeAnalysis = useMemo(() => {
    if (symbolTrades.length === 0 || displayBars.length === 0) {
      return { markers: [], skipped: [] };
    }

    const isDaily = interval === '1d';
    const barDur = BAR_DURATION_SEC[interval] || 300;
    const firstDisplay = displayBars[0].time;
    const lastDisplay = displayBars[displayBars.length - 1].time;
    const allowFrom = isDaily ? firstDisplay : firstDisplay - barDur;
    const allowTo = isDaily ? lastDisplay : lastDisplay + barDur;

    const markers = [];
    const skipped = [];

    for (const t of symbolTrades) {
      const isLong = String(t.direction || '').toLowerCase() === 'long';

      if (isDaily) {
        const dateStr = String(t.date || '').slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          skipped.push({ trade: t, reason: 'invalid-date', dateStr });
          continue;
        }
        if (dateStr < allowFrom || dateStr > allowTo) {
          skipped.push({
            trade: t,
            reason: 'out-of-range',
            displayTs: null,
            shownAs: dateStr,
            allowFrom,
            allowTo,
          });
          continue;
        }
        markers.push({
          time: dateStr,
          position: isLong ? 'belowBar' : 'aboveBar',
          color: isLong ? '#35C4A1' : '#FF5C5C',
          shape: isLong ? 'arrowUp' : 'arrowDown',
          text: '',
          size: 1,
        });
        continue;
      }

      const rawUtc = tradeTimeToUtcSeconds(t.date, t.entryTime, displayTz);
      if (rawUtc == null) {
        skipped.push({ trade: t, reason: 'invalid-time' });
        continue;
      }

      const displayTs = rawUtc + displayOffset;
      if (displayTs < allowFrom || displayTs > allowTo) {
        skipped.push({
          trade: t,
          reason: 'out-of-range',
          displayTs,
          rawUtc,
          shownAs: new Date(displayTs * 1000).toISOString(),
          allowFrom,
          allowTo,
        });
        continue;
      }

      const net = (Number(t.pnl) || 0) - (Number(t.commission) || 0);
      const label = net > 0
        ? `+${net.toFixed(0)}`
        : net < 0
          ? `${net.toFixed(0)}`
          : '';

      markers.push({
        time: displayTs,
        position: isLong ? 'belowBar' : 'aboveBar',
        color: isLong ? '#35C4A1' : '#FF5C5C',
        shape: isLong ? 'arrowUp' : 'arrowDown',
        text: label,
        size: 1.2,
      });
    }

    // Exit marker for the focused trade
    if (focusedTradeId && !isDaily) {
      const ft = symbolTrades.find((x) => x.id === focusedTradeId);
      if (ft && ft.exitTime) {
        const hasPriceData =
          Number.isFinite(Number(ft.entryPrice)) && Number(ft.entryPrice) > 0 ||
          Number.isFinite(Number(ft.stopLoss)) && Number(ft.stopLoss) > 0 ||
          Number.isFinite(Number(ft.takeProfit)) && Number(ft.takeProfit) > 0;

        if (hasPriceData) {
          const exitRawUtc = tradeTimeToUtcSeconds(ft.date, ft.exitTime, displayTz);
          if (exitRawUtc != null) {
            const exitDisplayTs = exitRawUtc + displayOffset;
            if (exitDisplayTs >= allowFrom && exitDisplayTs <= allowTo) {
              const isLong = String(ft.direction || '').toLowerCase() === 'long';
              markers.push({
                time: exitDisplayTs,
                position: isLong ? 'aboveBar' : 'belowBar',
                color: '#F59E0B',
                shape: 'circle',
                text: 'Exit',
                size: 1,
              });
            }
          }
        }
      }
    }

    markers.sort((a, b) => {
      const ta = typeof a.time === 'number'
        ? a.time
        : new Date(a.time).getTime() / 1000;
      const tb = typeof b.time === 'number'
        ? b.time
        : new Date(b.time).getTime() / 1000;
      return ta - tb;
    });

    return { markers, skipped };
  }, [symbolTrades, displayBars, interval, displayTz, displayOffset, focusedTradeId]);

  const tradeMarkers = tradeAnalysis.markers;
  const skippedTrades = tradeAnalysis.skipped;

  // ---- focus timestamp ----
  const [focusUtc, setFocusUtc] = useState(null);

  useEffect(() => {
    const raw = searchParams.get('focusTs');
    if (!raw) return;
    const ts = Number(raw);
    if (Number.isFinite(ts)) setFocusUtc(ts);
  }, [searchParams]);

  const focusTime = useMemo(
    () => (focusUtc != null ? focusUtc + displayOffset : null),
    [focusUtc, displayOffset]
  );

  const handleSelectTrade = useCallback(
    (trade) => {
      if (!trade) return;
      setFocusedTradeId(trade.id);
      const rawUtc = tradeTimeToUtcSeconds(trade.date, trade.entryTime, displayTz);
      if (rawUtc != null) {
        setFocusUtc(rawUtc);
      }
    },
    [displayTz]
  );

  // ---- loading phase ----
  const [chartReady, setChartReady] = useState(false);
  useEffect(() => { setChartReady(false); }, [symbol, interval]);
  const handleChartReady = useCallback(() => { setChartReady(true); }, []);

  const [finalizeDone, setFinalizeDone] = useState(false);
  useEffect(() => {
    if (!chartReady) { setFinalizeDone(false); return undefined; }
    const t = setTimeout(() => setFinalizeDone(true), 400);
    return () => clearTimeout(t);
  }, [chartReady]);

  const loadingPhase = useMemo(() => {
    if (!catalog) return 'symbols';
    if (barsFetching || bars.length === 0) return 'data';
    if (journalLoading) return 'trades';
    if (!chartReady) return 'render';
    if (!finalizeDone) return 'finalize';
    return 'done';
  }, [catalog, barsFetching, bars.length, journalLoading, chartReady, finalizeDone]);

  const showLoading = loadingPhase !== 'done';

  // ---- fullscreen ----
  const stageRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () =>
      setIsFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const stage = stageRef.current;
    if (!stage) return;
    try {
      if (document.fullscreenElement === stage) await document.exitFullscreen();
      else if (stage.requestFullscreen) await stage.requestFullscreen();
    } catch (err) {
      console.warn('[chart] fullscreen rejected:', err);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['market-data', 'bars'] });
    queryClient.invalidateQueries({ queryKey: ['market-data', 'quote'] });
  }, []);

  usePageHeader({
    title: 'Chart',
    subtitle: `${symbol} · ${interval.toUpperCase()} · ${displayTz}`,
  });

  // ---- off-range banner ----
  const hasSkippedTrades = skippedTrades.length > 0 && bars.length > 0;

  const offRangeMessage = useMemo(() => {
    if (!hasSkippedTrades) return null;

    const total = skippedTrades.length;
    const invalidTime = skippedTrades.filter((s) =>
      s.reason === 'invalid-time' || s.reason === 'invalid-date'
    ).length;
    const outOfRange = skippedTrades.filter((s) => s.reason === 'out-of-range').length;

    if (invalidTime === total) {
      return (
        <>
          <b>{total}</b>{' '}
          trade{total > 1 ? 's' : ''} for <em>{symbol}</em> have a malformed
          date or time and cannot be placed on the chart.
        </>
      );
    }

    if (outOfRange === total) {
      return (
        <>
          <b>{total}</b>{' '}
          trade{total > 1 ? 's' : ''} for <em>{symbol}</em>{' '}
          fall outside the currently loaded bars. Try a longer interval
          (<em>1h</em>, <em>1d</em>) or scroll back.
        </>
      );
    }

    return (
      <>
        <b>{invalidTime}</b> trade{invalidTime !== 1 ? 's' : ''} have an
        invalid time; <b>{outOfRange}</b> fall outside the loaded bars
        (try <em>1h</em> or <em>1d</em>).
      </>
    );
  }, [hasSkippedTrades, skippedTrades, symbol]);

  return (
    <>
      <style>{CSS}</style>
      <div className="chart2-root page-fade-in">
        <div className="chart2-layout">
          <WatchlistSidebar
            catalog={symbols}
            activeSymbol={symbol}
            onChange={setSymbol}
          />

          <div className="chart2-stage" ref={stageRef}>
            <QuoteHeader
              symbol={symbol}
              displayName={currentSymbol?.label || ''}
              interval={interval}
              onIntervalChange={setInterval}
              lastBarTime={lastBarTime}
              displayTz={displayTz}
              onRefresh={handleRefresh}
              isRefreshing={barsFetching}
              onToggleFullscreen={toggleFullscreen}
              isFullscreen={isFullscreen}
            />

            {hasSkippedTrades && (
              <div className="chart2-off-range" role="status">
                <AlertTriangle size={14} />
                <span>{offRangeMessage}</span>
              </div>
            )}

            <div className="chart2-shell">
              <CandlestickChart
                bars={displayBars}
                interval={interval}
                markers={tradeMarkers}
                trades={showPositions ? chartTrades : []}
                showLabels={showLabels}
                focusTime={focusTime}
                onReady={handleChartReady}
              />
              <TradesDropdown
                trades={symbolTrades}
                symbol={symbol}
                focusedTradeId={focusedTradeId}
                onSelect={handleSelectTrade}
                showPositions={showPositions}
                onTogglePositions={setShowPositions}
                showLabels={showLabels}
                onToggleLabels={setShowLabels}
              />
            </div>

            {showLoading && (
              <ChartLoadingOverlay
                phase={loadingPhase}
                symbol={symbol}
                interval={interval}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}