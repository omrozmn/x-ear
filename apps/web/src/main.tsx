import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'
import { storageMigrator } from './utils/storage-migrator'
import { useAuthStore } from './stores/authStore'
import { AUTH_TOKEN } from './constants/storage-keys'
import { MantineProvider } from '@mantine/core';

console.log('main.tsx loaded');

// Synchronously restore persisted token (hard-refresh safe)
try {
  const persisted = localStorage.getItem(AUTH_TOKEN) || localStorage.getItem('auth_token')
    if (persisted) {
    if (typeof window !== 'undefined') {
      // ensure in-memory helper is set for non-axios callers
      (window as Window & { __AUTH_TOKEN__?: string }).__AUTH_TOKEN__ = persisted
    }
    try {
      // `apiClient`'s interceptor reads `window.__AUTH_TOKEN__` so setting that is sufficient
      // Avoid global axios.defaults usage; centralized interceptor will handle auth headers.
    } catch (e) {
      // ignore
    }
  } else {
    // If no token in localStorage, try to read common cookie names synchronously
    try {
      if (typeof document !== 'undefined' && document.cookie) {
        const cookies = document.cookie.split(';').map(c => c.trim());
        const cookieMap: Record<string, string> = {};
        for (const c of cookies) {
          const [k, ...v] = c.split('=');
          cookieMap[k] = decodeURIComponent(v.join('='));
        }
        const possibleKeys = ['auth_token', 'x-ear.auth.token@v1', 'x-ear.auth.token', 'AUTH_TOKEN'];
        for (const key of possibleKeys) {
          const val = cookieMap[key];
            if (val) {
            (window as Window & { __AUTH_TOKEN__?: string }).__AUTH_TOKEN__ = val;
            // Avoid setting global axios.defaults here; central interceptor will attach Authorization header.
            break;
          }
        }
      }
    } catch (e) {
      // ignore cookie read errors
    }
  }
} catch (e) {
  console.error('Token restore error:', e);
}

console.log('Starting migration and auth init...');

// Simplified: Just render the app directly without waiting for async operations
(async () => {
  try {
    // Run migration in background (non-blocking)
    storageMigrator.migrate().catch(e => console.warn('Migration failed:', e));
    
    // Initialize auth in background (non-blocking)
    useAuthStore.getState().initializeAuth().catch(e => console.warn('Auth init failed:', e));
    
    console.log('Rendering App...');
    
    // Render immediately
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <MantineProvider>
          <App />
        </MantineProvider>
      </React.StrictMode>,
    );
    
    console.log('App rendered');
  } catch (error) {
    console.error('Fatal error:', error);
    
    // Fallback render
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <div style={{ padding: '20px', color: 'red' }}>
          <h1>Error Loading App</h1>
          <pre>{String(error)}</pre>
        </div>
      </React.StrictMode>
    );
  }
})();



