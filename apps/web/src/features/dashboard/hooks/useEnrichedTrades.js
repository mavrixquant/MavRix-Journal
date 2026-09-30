// apps/web/src/features/dashboard/hooks/useEnrichedTrades.js
//
// Single source of truth for "load trades for this account, enrich them,
// and push them into AppProvider".
//
// Why this exists as a hook:
//   - JournalDashboardHeader used to own this logic inline.
//   - AnalysePage needs the exact same enrichment + dispatch.
//   - BacktesterDashboardHeader needs the same shape (and same frozen
//     empty reference) so its dispatch effect never loops.
//
// The EMPTY_ENRICHED constant is module-level and frozen, so the useMemo
// below returns a stable reference for the "no trades" case. Without this,
// React Query handing back a fresh `undefined` on every render would
// invalidate the memo and spam the reducer — the "Maximum update depth
// exceeded" bug we already fixed once in the journal header.
//
// IMPORTANT: This hook must only be mounted from a route that is INSIDE
// the journal or backtester dashboard tree (i.e. under /journal/* or
// /backtester/*). It reads the account slot via useDashboardAccount().

import { useMemo, useEffect } from 'react';

import { useAppContext } from '@/app/providers/AppProvider';
import { useTrades } from '@/shared/api/trades';
import { enrichTradesFromDB } from '@/shared/trading/enrich';

/**
 * Frozen empty payload.
 *
 * Returned (by reference) whenever there is nothing to enrich. Giving the
 * memo below a stable return value for the empty case is what prevents the
 * dispatch effect from entering a self-sustaining render loop.
 */
const EMPTY_ENRICHED = Object.freeze({
  enrichedTrades: [],
  dynamicKeys: [],
});

/**
 * Load, enrich, and dispatch trades for the given account.
 *
 * @param {string|null|undefined} accountId
 * @returns {{ enrichedTrades: Array, dynamicKeys: string[] }}
 *          The enriched payload. Same object reference as what was
 *          dispatched into AppProvider.
 */
export function useEnrichedTrades(accountId) {
  const { dispatch } = useAppContext();

  // Note: React Query returns `undefined` while loading or disabled.
  // We deliberately do NOT use the `= []` destructure default, because
  // that produces a fresh array on every render and would invalidate the
  // memo below. The memo handles the undefined case via EMPTY_ENRICHED.
  const { data: rawTrades } = useTrades(accountId);

  const enriched = useMemo(() => {
    if (!accountId || !rawTrades || rawTrades.length === 0) {
      return EMPTY_ENRICHED;
    }
    return enrichTradesFromDB(rawTrades);
  }, [rawTrades, accountId]);

  useEffect(() => {
    dispatch({ type: 'SET_TRADES', payload: enriched.enrichedTrades });
    dispatch({ type: 'SET_DYNAMIC_FILTER_KEYS', payload: enriched.dynamicKeys });
  }, [enriched, dispatch]);

  return enriched;
}