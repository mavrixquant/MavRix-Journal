
import { useMemo, useEffect, useRef } from 'react';

import { useAppContext } from '@/app/providers/AppProvider';
import { useTrades } from '@/shared/api/trades';
import { enrichTradesFromDB } from '@/shared/trading/enrich';

const EMPTY_ENRICHED = Object.freeze({
  enrichedTrades: [],
  dynamicKeys: [],
});

export function useEnrichedTrades(accountId) {
  const { state, dispatch } = useAppContext();

  const { data: rawTrades, isLoading } = useTrades(accountId);

  const enriched = useMemo(() => {
    if (!accountId || !rawTrades || rawTrades.length === 0) {
      return EMPTY_ENRICHED;
    }
    return enrichTradesFromDB(rawTrades);
  }, [rawTrades, accountId]);

  const lastDispatchedRef = useRef(null);
  const needsDispatch = lastDispatchedRef.current !== enriched.enrichedTrades;

  useEffect(() => {
    if (!needsDispatch) return;
    dispatch({ type: 'SET_TRADES', payload: enriched.enrichedTrades });
    dispatch({ type: 'SET_DYNAMIC_FILTER_KEYS', payload: enriched.dynamicKeys });
    lastDispatchedRef.current = enriched.enrichedTrades;
  }, [enriched, needsDispatch, dispatch]);

  const isSynced = !needsDispatch && state.trades === enriched.enrichedTrades;

  return useMemo(
    () => ({
      enrichedTrades: enriched.enrichedTrades,
      dynamicKeys: enriched.dynamicKeys,
      isLoading,
      isSynced,
    }),
    [enriched, isLoading, isSynced]
  );
}