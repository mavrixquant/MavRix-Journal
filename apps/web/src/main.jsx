// apps/web/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import App from '@/app/App';
import ErrorBoundary from '@/app/ErrorBoundary';
import { AuthProvider, useAuth } from '@/app/providers/AuthProvider';
import { AppProvider } from '@/app/providers/AppProvider';
import { Toaster } from '@/components/ui/sonner';
import { queryClient } from '@/lib/queryClient';

import '@/styles/global.css';
import '@fontsource/space-grotesk';
import '@fontsource/inter';
import '@fontsource/ibm-plex-mono';
import '@/shared/utils/chartConfig';

function AppShell() {
  const { user } = useAuth();
  return (
    <AppProvider key={user?.id ?? 'anon'}>
      <App />
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#11151F',
            border: '1px solid #212836',
            color: '#E7E9EE',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: '12.5px',
          },
        }}
      />
      {import.meta.env.DEV && (
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
      )}
    </AppProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);