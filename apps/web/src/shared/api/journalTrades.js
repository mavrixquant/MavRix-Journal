import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useAccounts } from './accounts';
import { getTrades, tradesKeys } from './trades';

/**
 * Fetches every trade from every Live and Demo account (the "journal"
 * trades). Backtest accounts are intentionally excluded -- the market
 * chart annotates journal trades only, not backtest logs.
 *
 * Returns the flattened trade array (each row carries accountId /
 * accountName / accountType so callers can disambiguate).
 */
export function useJournalTrades() {
  const { data: accounts = [], isLoading: accountsLoading } = useAccounts();

  const journalAccounts = useMemo(
    () => accounts.filter((a) => a.type === 'Live' || a.type === 'Demo'),
    [accounts]
  );

  const results = useQueries({
    queries: journalAccounts.map((acc) => ({
      queryKey: tradesKeys.byAccount(acc.id),
      queryFn: () => getTrades(acc.id),
      enabled: !!acc.id,
    })),
  });

  const trades = useMemo(() => {
    const out = [];
    results.forEach((r, i) => {
      const acc = journalAccounts[i];
      if (!acc || !r.data) return;
      for (const t of r.data) {
        out.push({
          ...t,
          accountId: acc.id,
          accountName: acc.name,
          accountType: acc.type,
        });
      }
    });
    return out;
  }, [results, journalAccounts]);

  const isLoading = accountsLoading || results.some((r) => r.isLoading);

  return { trades, isLoading, journalAccountCount: journalAccounts.length };
}