// apps/web/src/features/dashboard/hooks/useEnrichedTrades.js
//
// Single source of truth for "load trades for this account, enrich them,
// and push them into AppProvider".
//
// PHASE B CHANGES
// ---------------
// The hook now exposes two additional flags used by the dashboard boot
// gate to avoid showing intermediate empty states:
//
//   isLoading  — passthrough from useTrades. False while the query is
//                disabled (accountId is null), true only while a real
//                fetch is in flight.
//
//   isSynced   — true once AppProvider.state.trades contains the exact
//                enriched array the hook is currently exposing. There is
//                a one-render gap between "React Query resolves" and
//                "AppProvider receives the dispatch"; the boot gate uses
//                isSynced to stay on the skeleton across that gap.
//
// The return shape is a superset of the old shape (enrichedTrades +
// dynamicKeys), so existing consumers keep working unchanged.

import { useMemo, useEffect, useRef } from 'react';

import { useAppContext } from '@/app/providers/AppProvider';
import { useTrades } from '@/shared/api/trades';
import { enrichTradesFromDB } from '@/shared/trading/enrich';

/**
 * Frozen empty payload.
 *
 * Returned (by reference) whenever there is nothing to enrich. The stable
 * reference is what allows the boot gate's isSynced check to work — a new
 * array on every render would invalidate the memo below and spam the
 * reducer, causing the "Maximum update depth exceeded" bug we fixed once
 * before in the journal header.
 */
const EMPTY_ENRICHED = Object.freeze({
  enrichedTrades: [],
  dynamicKeys: [],
});

/**
 * Load, enrich, and dispatch trades for the given account.
 *
 * @param {string|null|undefined} accountId
 * @returns {{
 *   enrichedTrades: Array,
 *   dynamicKeys: string[],
 *   isLoading: boolean,
 *   isSynced: boolean,
 * }}
 */
export function useEnrichedTrades(accountId) {
  const { state, dispatch } = useAppContext();

  // When accountId is null the query is disabled; React Query reports
  // isLoading === false in that state (fetchStatus === 'idle').
  const { data: rawTrades, isLoading } = useTrades(accountId);

  const enriched = useMemo(() => {
    if (!accountId || !rawTrades || rawTrades.length === 0) {
      return EMPTY_ENRICHED;
    }
    return enrichTradesFromDB(rawTrades);
  }, [rawTrades, accountId]);

  // Track the last enriched array we pushed into AppProvider. We compare
  // against this rather than AppProvider's own state.trades because the
  // two start out as different empty arrays — a fresh provider mount and
  // EMPTY_ENRICHED.enrichedTrades are never reference-equal.
  const lastDispatchedRef = useRef(null);
  const needsDispatch = lastDispatchedRef.current !== enriched.enrichedTrades;

  useEffect(() => {
    if (!needsDispatch) return;
    dispatch({ type: 'SET_TRADES', payload: enriched.enrichedTrades });
    dispatch({ type: 'SET_DYNAMIC_FILTER_KEYS', payload: enriched.dynamicKeys });
    lastDispatchedRef.current = enriched.enrichedTrades;
  }, [enriched, needsDispatch, dispatch]);

  // True only when the dispatch has landed — i.e. AppProvider.state.trades
  // is the exact array we last pushed. On the initial mount this is false
  // for one render, which is exactly what the boot gate wants.
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