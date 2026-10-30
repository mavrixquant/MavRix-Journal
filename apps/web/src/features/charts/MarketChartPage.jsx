import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { useMarketCatalog, useMarketBars } from '@/shared/api/marketData';
import { queryClient } from '@/shared/api/queryClient';
import { useJournalTrades } from '@/shared/api/journalTrades';
import { getTimezoneOffsetSeconds } from '@/shared/trading/tradeTime';
import { resolveTimezone } from '@/shared/format/datetime';
import { useSettings } from '@/app/layout/Settings/SettingsProvider';
import { usePageHeader } from '@/app/layout/PageHeaderProvider';

import CandlestickChart from './components/CandlestickChart';
import QuoteHeader from './components/QuoteHeader';
import WatchlistSidebar from './components/WatchlistSidebar';
import ChartLoadingOverlay from './components/ChartLoadingOverlay';

const DEFAULT_SYMBOL = 'NQ';
const DEFAULT_INTERVAL = '5m';

const CSS = `
  .chart2-root { width: 100%; max-width: none; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
  .chart2-layout { display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 16px; align-items: start; }
  @media (max-width: 1100px) { .chart2-layout { grid-template-columns: minmax(0, 1fr); } .chart2-layout > :nth-child(1) { display: none; } }
  .chart2-stage { display: flex; flex-direction: column; gap: 12px; min-width: 0; position: relative; }
  .chart2-off-range { display: flex; align-items: flex-start; gap: 10px; padding: 10px 14px; border-radius: 12px; background: color-mix(in srgb, var(--accent) 8%, transparent); border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent); color: var(--accent-2); font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; }
  .chart2-shell { position: relative; width: 100%; height: 720px; max-height: calc(100dvh - 200px); min-height: 400px; border-radius: 16px; border: 1px solid rgba(255,255,255,.08); background: linear-gradient(180deg, rgba(15,18,25,.72), rgba(15,18,25,.55)); overflow: hidden; }
  .chart2-filling-bar { position: absolute; top: 0; left: 0; right: 0; height: 3px; z-index: 20; background: rgba(255,255,255,.04); overflow: hidden; }
  .chart2-filling-fill { height: 100%; width: 30%; background: linear-gradient(90deg, transparent, var(--accent), transparent); animation: cfSlide 1.4s ease infinite; }
  @keyframes cfSlide { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }
`;

export default function MarketChartPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { settings } = useSettings();

  const symbol = (searchParams.get('symbol') || DEFAULT_SYMBOL).toUpperCase();
  const interval = searchParams.get('interval') || DEFAULT_INTERVAL;
  const fromParam = searchParams.get('from') || null;
  const toParam = searchParams.get('to') || null;

  const setSymbol = useCallback((next) => {
    const sp = new URLSearchParams(searchParams);
    sp.set('symbol', next);
    sp.delete('from'); sp.delete('to'); // Reset range on symbol change
    setSearchParams(sp, { replace: true });
  }, [searchParams, setSearchParams]);

  const setInterval = useCallback((next) => {
    const sp = new URLSearchParams(searchParams);
    sp.set('interval', next);
    setSearchParams(sp, { replace: true });
  }, [searchParams, setSearchParams]);

  const setRange = useCallback((fromDate, toDate) => {
    const sp = new URLSearchParams(searchParams);
    if (fromDate && toDate) {
      sp.set('from', fromDate.toISOString());
      sp.set('to', toDate.toISOString());
    } else {
      // Clear -> strip params -> chart returns to its default (last 30 days, live)
      sp.delete('from');
      sp.delete('to');
    }
    setSearchParams(sp, { replace: true });
  }, [searchParams, setSearchParams]);

  const displayTz = useMemo(() => resolveTimezone(settings?.preferences?.timezone || 'auto'), [settings]);
  const { data: catalog } = useMarketCatalog();

  const barsQuery = useMarketBars({ symbol, interval, from: fromParam, to: toParam, enabled: !!catalog });
  
  // Flatten pages. If scrolling back (before), reverse the order of pages.
  const bars = useMemo(() => {
    if (!barsQuery.data) return [];
    const pages = [...barsQuery.data.pages];
    // If not explicit range, we fetched descending pages. Reverse so oldest is first.
    if (!fromParam) pages.reverse();
    const flat = pages.flatMap(p => p.bars || []);

    // Dedupe by time. With refetchInterval active on the infinite query,
    // page-1 refetches can extend the newest window, which pushes older
    // bars into page 2's territory and produces overlapping windows.
    // A Map keyed by time collapses duplicates; sort restores chronology.
    const seen = new Map();
    for (const b of flat) {
      const isFlat = b.open === b.high && b.high === b.low && b.low === b.close;
      if (isFlat && (!b.volume || Number(b.volume) === 0)) continue;
      seen.set(b.time, b);
    }
    const out = [...seen.values()];
    out.sort((a, b) => {
      const at = typeof a.time === 'number' ? a.time : new Date(a.time).getTime();
      const bt = typeof b.time === 'number' ? b.time : new Date(b.time).getTime();
      return at - bt;
    });
    return out;
  }, [barsQuery.data, fromParam]);

  const filling = barsQuery.data?.pages?.[0]?.filling;
  const hasMoreOlder = barsQuery.data?.pages?.[barsQuery.data.pages.length - 1]?.hasMoreOlder;

  const displayOffset = useMemo(() => {
    if (interval === '1d') return 0;
    const ref = bars.length > 0 ? bars[Math.floor(bars.length / 2)].time : Math.floor(Date.now() / 1000);
    return getTimezoneOffsetSeconds(displayTz, ref);
  }, [bars, interval, displayTz]);

  const displayBars = useMemo(() => {
    if (displayOffset === 0) return bars;
    return bars.map(b => {
      if (interval === '1d') return b;
      return { ...b, time: b.time + displayOffset };
    });
  }, [bars, displayOffset, interval]);

  const lastBarTime = bars.length > 0 ? bars[bars.length - 1].time : null;

  // Fit content only on symbol/interval/explicit range change
  const fitContentKey = useMemo(() => `${symbol}-${interval}-${fromParam}-${toParam}`, [symbol, interval, fromParam, toParam]);

  const handleLoadOlder = useCallback(() => {
    if (barsQuery.hasNextPage && !barsQuery.isFetchingNextPage) {
      barsQuery.fetchNextPage();
    }
  }, [barsQuery]);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['market-data', 'bars'] });
    queryClient.invalidateQueries({ queryKey: ['market-data', 'quote'] });
  }, []);

  usePageHeader({ title: 'Chart', subtitle: `${symbol} · ${interval.toUpperCase()} · ${displayTz}` });

  const [showLoader, setShowLoader] = useState(false);
  const loaderTimerRef = useRef(null);
  // Remembers every context we've already shown the 2.2s animation for,
  // so pagination / refetch / SSE updates never re-trigger it.
  const shownLoaderForRef = useRef(new Set());

  // A "context" is one specific chart view. Switching symbol, interval, or
  // an explicit date range creates a new context -> new 2.2s load animation.
  const loaderContextKey = `${symbol}-${interval}-${fromParam || ''}-${toParam || ''}`;

  // Context changed -> cancel any pending timer, hide the loader immediately
  useEffect(() => {
    if (loaderTimerRef.current) {
      clearTimeout(loaderTimerRef.current);
      loaderTimerRef.current = null;
    }
    setShowLoader(false);

    return () => {
      if (loaderTimerRef.current) {
        clearTimeout(loaderTimerRef.current);
        loaderTimerRef.current = null;
      }
    };
  }, [loaderContextKey]);

  // Fire the 2.2s loader EXACTLY ONCE per context, the moment data arrives.
  // isLoading is true only on the very first fetch for a given query key
  // (React Query v5: isLoading = isPending && isFetching), so cached revisits
  // never hit this branch.
  useEffect(() => {
    if (barsQuery.isLoading) return;
    if (bars.length === 0) return;
    if (shownLoaderForRef.current.has(loaderContextKey)) return;

    shownLoaderForRef.current.add(loaderContextKey);
    setShowLoader(true);
    loaderTimerRef.current = setTimeout(() => {
      setShowLoader(false);
      loaderTimerRef.current = null;
    }, 2200);
  }, [barsQuery.isLoading, bars.length, loaderContextKey]);

  return (
    <>
      <style>{CSS}</style>
      <div className="chart2-root page-fade-in">
        <div className="chart2-layout">
          <WatchlistSidebar catalog={catalog?.symbols ?? []} activeSymbol={symbol} onChange={setSymbol} />
          
          <div className="chart2-stage">
            <QuoteHeader
              symbol={symbol} displayName={catalog?.symbols.find(s => s.code === symbol)?.label || ''}
              hasData={!!catalog?.symbols.find(s => s.code === symbol)?.hasData}
              interval={interval} onIntervalChange={setInterval}
              lastBarTime={lastBarTime} displayTz={displayTz}
              onRefresh={handleRefresh} isRefreshing={barsQuery.isFetching && !barsQuery.isFetchingNextPage}
              from={fromParam} to={toParam} onRangeChange={setRange}
            />

            <div className="chart2-shell">
              {filling && <div className="chart2-filling-bar"><div className="chart2-filling-fill" /></div>}
              
              <CandlestickChart
                bars={displayBars}
                interval={interval}
                symbol={symbol}
                fitContentKey={fitContentKey}
                hasMoreOlder={hasMoreOlder}
                onRequestOlder={handleLoadOlder}
              />

              {showLoader && (
                <ChartLoadingOverlay symbol={symbol} interval={interval} />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}