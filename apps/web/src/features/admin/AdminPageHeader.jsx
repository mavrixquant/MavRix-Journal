import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

/**
 * Lightweight page-header context for the admin panel.
 *
 * Mirrors `usePageHeader` from the main app but lives entirely inside
 * /features/admin. Each admin page calls `useAdminPageHeader({ eyebrow,
 * title, subtitle })` once near the top of its component; AdminHeader
 * reads the config from context and renders it in the sticky top bar.
 *
 * Falls back to the current URL segment (e.g. "users" → "Users") if a
 * page forgets to register a title.
 */
const AdminPageHeaderContext = createContext(null);

export function AdminPageHeaderProvider({ children }) {
  const [config, setConfigState] = useState(null);

  const setConfig = useCallback((next) => {
    setConfigState((prev) => (typeof next === 'function' ? next(prev) : next));
  }, []);

  const value = useMemo(() => ({ config, setConfig }), [config, setConfig]);

  return (
    <AdminPageHeaderContext.Provider value={value}>
      {children}
    </AdminPageHeaderContext.Provider>
  );
}

export function useAdminPageHeaderContext() {
  const ctx = useContext(AdminPageHeaderContext);
  if (!ctx) {
    throw new Error(
      'useAdminPageHeaderContext must be used inside <AdminPageHeaderProvider>.'
    );
  }
  return ctx;
}

export function useAdminPageHeader({ eyebrow, title, subtitle }) {
  const { setConfig } = useAdminPageHeaderContext();

  const idRef = useRef(null);
  if (idRef.current === null) {
    idRef.current = Symbol('admin-page-header');
  }

  useEffect(() => {
    const myId = idRef.current;
    setConfig({
      id: myId,
      eyebrow: eyebrow || null,
      title: title || '',
      subtitle: subtitle || null,
    });
    return () => {
      setConfig((prev) => (prev && prev.id === myId ? null : prev));
    };
  }, [eyebrow, title, subtitle, setConfig]);
}