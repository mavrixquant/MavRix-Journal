
import { useEffect, useRef, useState } from 'react';

import {
  subscribeToUserLayouts,
  saveUserLayouts,
} from '@/features/dashboard/api/layouts';
import { buildDefaultLayouts } from '@/features/dashboard/layout/dashboardLayout';

export function useUserLayouts({ userId, suppressRemotePush = false } = {}) {
  const [layouts, setLayouts] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [layoutsReady, setLayoutsReady] = useState(false);

  const hydratedRef = useRef(false);
  const suppressRef = useRef(suppressRemotePush);

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