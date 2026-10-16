// apps/web/src/features/dashboard/hooks/useUserLayouts.js
//
// Loads + persists the current user's dashboard layouts.
//
// Extracted from DashboardPage.jsx / BacktesterDashboardPage.jsx during
// Phase B so the two pages share one hydration contract. The boot gate
// relies on `layoutsReady` to stay on the skeleton until the layout
// subscription has resolved at least once — otherwise the grid mounts
// empty and then "pops" when layouts arrive.
//
// Hydration contract:
//   • On first callback:
//       - remote layouts present → adopt them
//       - remote empty/missing   → seed with buildDefaultLayouts() and
//                                   push the seed to the server
//       - set layoutsReady = true in both cases
//   • On subsequent callbacks (currently only fires once, but kept for
//     future realtime sync via SSE):
//       - if suppressRemotePush is true (caller is in edit mode), drop
//         the push so the user's uncommitted changes are not clobbered
//
// Callers persist their own edits via saveUserLayouts() after they've
// committed — see saveEdit() in DashboardPage.

import { useEffect, useRef, useState } from 'react';

import {
  subscribeToUserLayouts,
  saveUserLayouts,
} from '@/features/dashboard/api/layouts';
import { buildDefaultLayouts } from '@/features/dashboard/layout/dashboardLayout';

/**
 * @param {object}  opts
 * @param {string=} opts.userId               — current user id (from useAuth)
 * @param {boolean} opts.suppressRemotePush   — true while the caller is in
 *                                              edit mode; remote pushes are
 *                                              ignored so uncommitted edits
 *                                              survive
 */
export function useUserLayouts({ userId, suppressRemotePush = false } = {}) {
  const [layouts, setLayouts] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [layoutsReady, setLayoutsReady] = useState(false);

  const hydratedRef = useRef(false);
  const suppressRef = useRef(suppressRemotePush);

  // Mirror the caller's suppress flag into a ref so the subscription
  // callback (created once, when the effect runs) always reads the latest
  // value without needing a re-subscription.
  useEffect(() => {
    suppressRef.current = suppressRemotePush;
  }, [suppressRemotePush]);

  useEffect(() => {
    if (!userId) return undefined;

    const unsub = subscribeToUserLayouts(userId, (remote) => {
      const hasRemote =
        remote && Array.isArray(remote.layouts) && remote.layouts.length > 0;

      if (!hydratedRef.current) {
        hydratedRef.current = true;

        if (hasRemote) {
          setLayouts(remote.layouts);
          setActiveId(remote.activeId);
        } else {
          const seed = buildDefaultLayouts();
          setLayouts(seed);
          setActiveId(seed[0].id);
          saveUserLayouts(userId, seed, seed[0].id).catch((err) =>
            console.error('[layouts] initial push failed:', err)
          );
        }

        setLayoutsReady(true);
        return;
      }

      if (hasRemote && !suppressRef.current) {
        setLayouts(remote.layouts);
        setActiveId(remote.activeId);
      }
    });

    return () => {
      unsub();
    };
  }, [userId]);

  return {
    layouts,
    setLayouts,
    activeId,
    setActiveId,
    layoutsReady,
  };
}