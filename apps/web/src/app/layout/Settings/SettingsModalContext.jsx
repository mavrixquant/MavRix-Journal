
import { createContext, useContext } from 'react';

const SettingsModalContext = createContext(null);

export function SettingsModalProvider({
  openSettings,
  closeSettings,
  children,
}) {
  return (
    <SettingsModalContext.Provider value={{ openSettings, closeSettings }}>
      {children}
    </SettingsModalContext.Provider>
  );
}

export function useSettingsModal() {
  const ctx = useContext(SettingsModalContext);
  if (!ctx) {
    throw new Error(
      'useSettingsModal must be used inside <SettingsModalProvider>.'
    );
  }
  return ctx;
}