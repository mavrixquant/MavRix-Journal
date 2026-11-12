import { createContext, useContext, useState, useMemo, useCallback } from 'react';

const ChangelogModalContext = createContext(null);

export function ChangelogProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('latest'); // 'latest' | 'all' | 'specific'
  const [targetVersion, setTargetVersion] = useState(null);

  const openLatest = useCallback(() => {
    setMode('latest');
    setTargetVersion(null);
    setIsOpen(true);
  }, []);

  const openAll = useCallback(() => {
    setMode('all');
    setTargetVersion(null);
    setIsOpen(true);
  }, []);

  const openSpecific = useCallback((version) => {
    setMode('specific');
    setTargetVersion(version);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const value = useMemo(
    () => ({ isOpen, mode, targetVersion, openLatest, openAll, openSpecific, close }),
    [isOpen, mode, targetVersion, openLatest, openAll, openSpecific, close]
  );

  return (
    <ChangelogModalContext.Provider value={value}>
      {children}
    </ChangelogModalContext.Provider>
  );
}

export function useChangelogModal() {
  const ctx = useContext(ChangelogModalContext);
  if (!ctx) throw new Error('useChangelogModal must be used inside <ChangelogProvider>');
  return ctx;
}