// apps/web/src/shared/api/queryClient.js
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 30s before a query is considered stale. Prevents refetch storms when
      // navigating between routes that read the same key.
      staleTime: 30_000,

      // 5 min before unused cache entries are garbage-collected.
      gcTime: 5 * 60_000,

      // Coming back to the tab refreshes data — big UX win over the old polling.
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,

      // 401/404/422 aren't worth retrying.
      retry: (failureCount, error) => {
        const status = error?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
    mutations: {
      // Mutations should not retry automatically — user can re-click.
      retry: false,
    },
  },
});