import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useMarketCatalog, useMarketBars } from '@/shared/api/marketData';
import { queryClient } from '@/shared/api/queryClient';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';

import CandlestickChart from './components/CandlestickChart';
import QuoteHeader from './components/QuoteHeader';
import WatchlistSidebar from './components/WatchlistSidebar';
import ChartLoadingOverlay from './components/ChartLoadingOverlay';

const DEFAULT_SYMBOL = 'NQ';
const DEFAULT_INTERVAL = '5m';

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
  }

  /* The fullscreen target: header + chart live here.
     The watchlist sibling is automatically excluded from fullscreen. */
  .chart2-stage {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
    position: relative;
  }
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

  const { data: catalog } = useMarketCatalog();
  const {
    data: barPayload,
    isFetching: barsFetching,
  } = useMarketBars({ symbol, interval, enabled: !!catalog });

  const symbols = useMemo(() => catalog?.symbols ?? [], [catalog]);
  const currentSymbol = useMemo(
    () => symbols.find((s) => s.code === symbol),
    [symbols, symbol]
  );

  // Only expose bars that belong to the CURRENT symbol + interval.
  // During a switch, React Query keeps the previous payload as placeholder —
  // filtering prevents stale renders.
  const bars = useMemo(() => {
    if (!barPayload) return [];
    if (String(barPayload.symbol || '').toUpperCase() !== symbol) return [];
    if (barPayload.interval !== interval) return [];
    return barPayload.bars ?? [];
  }, [barPayload, symbol, interval]);

  // Chart-relative time source for the header pill.
  const lastBarTime = useMemo(() => {
    if (!bars || bars.length === 0) return null;
    return bars[bars.length - 1].time;
  }, [bars]);

  // ---- loading phase orchestration ----
  const [chartReady, setChartReady] = useState(false);

  useEffect(() => {
    setChartReady(false);
  }, [symbol, interval]);

  const handleChartReady = useCallback(() => {
    setChartReady(true);
  }, []);

  const [finalizeDone, setFinalizeDone] = useState(false);
  useEffect(() => {
    if (!chartReady) { setFinalizeDone(false); return undefined; }
    const t = setTimeout(() => setFinalizeDone(true), 400);
    return () => clearTimeout(t);
  }, [chartReady]);

  const loadingPhase = useMemo(() => {
    if (!catalog) return 'symbols';
    if (barsFetching || bars.length === 0) return 'data';
    if (!chartReady) return 'render';
    if (!finalizeDone) return 'finalize';
    return 'done';
  }, [catalog, barsFetching, bars.length, chartReady, finalizeDone]);

  const showLoading = loadingPhase !== 'done';

  // ---- fullscreen (on the stage = header + chart) ----
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

  // ---- manual refresh ----
  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['market-data', 'bars'] });
    queryClient.invalidateQueries({ queryKey: ['market-data', 'quote'] });
  }, []);

  // ---- page header ----
  usePageHeader({
    title: 'Chart',
    subtitle: `${symbol} · ${interval.toUpperCase()}`,
  });

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
              onRefresh={handleRefresh}
              isRefreshing={barsFetching}
              onToggleFullscreen={toggleFullscreen}
              isFullscreen={isFullscreen}
            />

            <div className="chart2-shell">
              <CandlestickChart
                bars={bars}
                interval={interval}
                onReady={handleChartReady}
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
