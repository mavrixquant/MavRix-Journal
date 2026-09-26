// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/app/App';
import { AuthProvider, useAuth } from '@/app/providers/AuthProvider';
import { AppProvider } from '@/app/providers/AppProvider';
import '@/styles/global.css';
import '@fontsource/space-grotesk';
import '@fontsource/inter';
import '@fontsource/ibm-plex-mono';
import '@/shared/utils/chartConfig';

// Wrapper so we can key AppProvider by the current user id.
// When the user changes (login, logout, switch account), AppProvider
// remounts with fresh state — no stale selectedAccountId, no stale trades.
function AppShell() {
  const { user } = useAuth();
  return (
    <AppProvider key={user?.id ?? 'anon'}>
      <App />
    </AppProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  </React.StrictMode>
);