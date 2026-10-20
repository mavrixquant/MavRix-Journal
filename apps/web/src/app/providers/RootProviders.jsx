import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/shared/api/queryClient';

import { SettingsProvider } from '@/app/layout/Settings/SettingsProvider';
import { AuthProvider, useAuth } from './AuthProvider';
import { AppProvider } from './AppProvider';

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