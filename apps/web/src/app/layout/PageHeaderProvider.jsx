// apps/web/src/app/layout/PageHeaderProvider.jsx
//
// Global page-header context.
//
// Individual route pages publish their title/badge/subtitle into this
// provider so the global <HeaderBar /> can render them in the slot to the
// left of the account selector. This keeps the page title in ONE place
// across the whole app.
//
// Usage (inside any page component):
//
//   import { usePageHeader } from '@/app/layout/PageHeaderProvider';
//
//   usePageHeader({
//     title: 'Dashboard',
//     badge: 'Live',              // optional
//     badgeVariant: 'is-live',    // optional — 'is-live' | 'is-demo'
//                                 //           | 'is-backtest' | 'is-default'
//     subtitle: '42 trades',      // optional
//   });
//
// The provider is mounted once in <AppLayout /> and wraps both the
// HeaderBar and the Outlet, so any route under the app shell can publish.
//
// All values passed to usePageHeader are PRIMITIVES (strings). This is
// intentional: the effect below re-runs whenever any dep changes, and
// primitive deps give stable equality without deep-compare churn. Never
// pass objects/arrays to this hook.
//
// Cleanup / race handling:
//   Each hook instance receives a unique Symbol id. When it unmounts, its
//   cleanup only clears the config if the stored id still matches its own.
//   This prevents a route-change race where route A's cleanup wipes route
//   B's freshly-set config.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const PageHeaderContext = createContext(null);

export function PageHeaderProvider({ children }) {
  const [config, setConfigState] = useState(null);

  // Stable setter that accepts either a raw config object or an updater fn.
  // Passing an updater lets the hook cleanup selectively clear only its own
  // config (see usePageHeader below).
  const setConfig = useCallback((next) => {
    setConfigState((prev) => (typeof next === 'function' ? next(prev) : next));
  }, []);

  const value = useMemo(() => ({ config, setConfig }), [config, setConfig]);

  return (
    <PageHeaderContext.Provider value={value}>
      {children}
    </PageHeaderContext.Provider>
  );
}

/**
 * Read the current page-header config. Used by <HeaderBar /> (and any
 * other chrome that needs the same info). Throws if rendered outside
 * the provider — a hard error is preferable to a silently missing title.
 */
export function usePageHeaderContext() {
  const ctx = useContext(PageHeaderContext);
  if (!ctx) {
    throw new Error(
      'usePageHeaderContext must be used inside <PageHeaderProvider>.'
    );
  }
  return ctx;
}

/**
 * Publish the current page's header info. Clears on unmount.
 *
 * @param {object}  cfg
 * @param {string}  cfg.title
 * @param {string=} cfg.badge
 * @param {string=} cfg.badgeVariant   'is-live' | 'is-demo' | 'is-backtest' | 'is-default'
 * @param {string=} cfg.subtitle
 */
export function usePageHeader({ title, badge, badgeVariant, subtitle }) {
  const { setConfig } = usePageHeaderContext();
  const idRef = useRef(null);
  if (idRef.current === null) {
    // Lazily allocate a unique id on first render.
    idRef.current = Symbol('page-header');
  }

  useEffect(() => {
    const myId = idRef.current;
    setConfig({
      id: myId,
      title: title || '',
      badge: badge || null,
      badgeVariant: badgeVariant || 'is-default',
      subtitle: subtitle || null,
    });
    return () => {
      setConfig((prev) => (prev && prev.id === myId ? null : prev));
    };
  }, [title, badge, badgeVariant, subtitle, setConfig]);
}