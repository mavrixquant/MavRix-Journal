// apps/web/src/app/providers/RootProviders.jsx
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/shared/api/queryClient';

import { AuthProvider, useAuth } from './AuthProvider';
import { AppProvider } from './AppProvider';

/** Inner component so we can read auth context to key AppProvider. */
function KeyedAppProvider({ children }) {
  const { user } = useAuth();
  return <AppProvider key={user?.id ?? 'anon'}>{children}</AppProvider>;
}

export function RootProviders({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <KeyedAppProvider>{children}</KeyedAppProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}