import { createContext, useContext, useState, useMemo } from 'react';

const ChangelogModalContext = createContext(null);

export function ChangelogProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('latest'); // 'latest' | 'all' | 'specific'
  const [targetVersion, setTargetVersion] = useState(null);

  const openLatest = () => { setMode('latest'); setTargetVersion(null); setIsOpen(true); };
  const openAll = () => { setMode('all'); setTargetVersion(null); setIsOpen(true); };
  const openSpecific = (version) => { setMode('specific'); setTargetVersion(version); setIsOpen(true); };
  const close = () => setIsOpen(false);

  const value = useMemo(() => ({ isOpen, mode, targetVersion, openLatest, openAll, openSpecific, close }), [isOpen, mode, targetVersion]);

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