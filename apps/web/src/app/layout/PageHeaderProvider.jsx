
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

export function usePageHeaderContext() {
  const ctx = useContext(PageHeaderContext);
  if (!ctx) {
    throw new Error(
      'usePageHeaderContext must be used inside <PageHeaderProvider>.'
    );
  }
  return ctx;
}

export function usePageHeader({ title, badge, badgeVariant, subtitle }) {
  const { setConfig } = usePageHeaderContext();
  const idRef = useRef(null);
  if (idRef.current === null) {
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