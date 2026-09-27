import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/app/App';
import { AuthProvider, useAuth } from '@/app/providers/AuthProvider';
import { AppProvider } from '@/app/providers/AppProvider';
import '@/styles/global.css';   // imports tailwind + tokens
import '@fontsource/space-grotesk';
import '@fontsource/inter';
import '@fontsource/ibm-plex-mono';
import '@/shared/utils/chartConfig';

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