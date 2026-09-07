// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import './styles/global.css';
import '@fontsource/space-grotesk';
import '@fontsource/inter';
import '@fontsource/ibm-plex-mono';
import './utils/chartConfig';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </AuthProvider>
  </React.StrictMode>
);