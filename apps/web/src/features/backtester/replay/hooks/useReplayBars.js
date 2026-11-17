import { useEffect, useMemo } from 'react';
import { useMarketBars } from '@/shared/api/marketData';
import { normalizeBars } from '../../lib/time';

/**
 * Loads EVERY page of bars for [fromDate, toDate] (inclusive) up front so the
 * replay can run without network stalls. Progress is exposed for the loader.
 */
export default function useReplayBars({ symbol, interval, fromDate, toDate, enabled = true }) {
  const from = fromDate ? `${fromDate}T00:00:00.000Z` : null;
  const to = toDate ? `${toDate}T23:59:59.999Z` : null;

  const q = useMarketBars({ symbol, interval, from, to, enabled: enabled && !!from && !!to });
  const { hasNextPage, isFetchingNextPage, fetchNextPage, data, isError, error } = q;

  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !isError) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, isError, fetchNextPage, data]);

  const bars = useMemo(() => {
    if (!data) return [];
    return normalizeBars(data.pages.flatMap((p) => p?.bars || []), interval);
  }, [data, interval]);

  const done = !!data && !hasNextPage && !isFetchingNextPage;

  return {
    bars,
    done,
    isLoading: q.isLoading,
    isFetchingMore: isFetchingNextPage || (!!hasNextPage && !isError),
    isError,
    error,
    pages: data?.pages?.length ?? 0,
    refetch: q.refetch,
  };
}
