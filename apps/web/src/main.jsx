// apps/web/src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import App from '@/app/App';
import ErrorBoundary from '@/app/ErrorBoundary';
import { RootProviders } from '@/app/providers/RootProviders';
import { Toaster } from '@/shared/ui/sonner';

import '@/styles/global.css';
import '@fontsource/space-grotesk';
import '@fontsource/inter';
import '@fontsource/ibm-plex-mono';
import '@/shared/charts/register';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <RootProviders>
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
      </RootProviders>
    </ErrorBoundary>
  </React.StrictMode>
);