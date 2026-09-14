// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/app/App';
import { AuthProvider } from '@/app/providers/AuthProvider';
import { AppProvider } from '@/app/providers/AppProvider';
import '@/styles/global.css';
import '@fontsource/space-grotesk';
import '@fontsource/inter';
import '@fontsource/ibm-plex-mono';
import '@/shared/utils/chartConfig';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </AuthProvider>
  </React.StrictMode>
);