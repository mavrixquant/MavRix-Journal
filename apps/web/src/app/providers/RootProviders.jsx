// apps/web/src/app/providers/RootProviders.jsx
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/shared/api/queryClient';

import { SettingsProvider } from '@/app/layout/Settings/SettingsProvider';
import { AuthProvider, useAuth } from './AuthProvider';
import { AppProvider } from './AppProvider';

/**
 * Re-keys SettingsProvider by the current user's id so switching accounts
 * fully resets preferences state. The key change forces a remount, which
 * re-runs the hydration effect and re-reads the per-user localStorage
 * namespace.
 */
function KeyedSettingsProvider({ children }) {
  const { user } = useAuth();
  return (
    <SettingsProvider
      key={user?.id ?? 'anon'}
      userId={user?.id ?? null}
    >
      {children}
    </SettingsProvider>
  );
}

/** Inner component so we can read auth context to key AppProvider. */
function KeyedAppProvider({ children }) {
  const { user } = useAuth();
  return <AppProvider key={user?.id ?? 'anon'}>{children}</AppProvider>;
}

export function RootProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <KeyedSettingsProvider>
          <KeyedAppProvider>{children}</KeyedAppProvider>
        </KeyedSettingsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}