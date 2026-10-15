// apps/web/src/app/layout/Settings/SettingsModalContext.jsx
//
// Global "open the Settings modal at tab X" trigger.
//
// AppLayout owns the modal's open/close state (it already did before this
// context existed). This context exposes those two setters to any
// descendant — HeaderBar keeps using its own local callbacks, but now the
// ChatRail (and any future feature) can also say:
//
//     const { openSettings } = useSettingsModal();
//     openSettings('chats');
//
// Without a provider above it, useSettingsModal() throws — that's
// preferable to silently doing nothing.

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

/**
 * Returns { openSettings(tab?), closeSettings() }.
 *
 * @param {string} [tab]  Tab id — 'account' | 'appearance' | 'preferences'
 *                        | 'notifications' | 'chats' | 'data' | 'about'.
 *                        Defaults to 'account' (matches SettingsModal's own
 *                        default).
 */
export function useSettingsModal() {
  const ctx = useContext(SettingsModalContext);
  if (!ctx) {
    throw new Error(
      'useSettingsModal must be used inside <SettingsModalProvider>.'
    );
  }
  return ctx;
}