import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/index.css'
import { storageMigrator } from './utils/storage-migrator'
import { useAuthStore } from './stores/authStore'
import axios from 'axios'
import { AUTH_TOKEN } from './constants/storage-keys'
import { MantineProvider } from '@mantine/core';

// Synchronously restore persisted token (hard-refresh safe)
try {
  const persisted = localStorage.getItem(AUTH_TOKEN) || localStorage.getItem('auth_token')
  if (persisted) {
    if (typeof window !== 'undefined') {
      // ensure in-memory helper is set for non-axios callers
      (window as Window & { __AUTH_TOKEN__?: string }).__AUTH_TOKEN__ = persisted
    }
    try {
      axios.defaults.headers.common['Authorization'] = `Bearer ${persisted}`
    } catch (e) {
      // ignore
    }
  }
} catch (e) {
  // ignore storage read errors
}

// Run storage migration before app initialization
storageMigrator.migrate().then(async () => {
  try {
    // Initialize auth before rendering to ensure token is available for interceptors
    await useAuthStore.getState().initializeAuth();
  } catch (e) {
    console.warn('initializeAuth failed before render:', e);
  }

  // Dynamically import App after token restore so module-level axios instances
  // pick up the `axios.defaults.headers.common['Authorization']` we set above.
  try {
    const { default: App } = await import('./App.tsx');
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <MantineProvider>
          <App />
        </MantineProvider>
      </React.StrictMode>,
    );
  } catch (e) {
    console.error('Failed to load App after token restore:', e);
  }
}).catch(async (error) => {
  console.error('Storage migration failed:', error)
  try {
    await useAuthStore.getState().initializeAuth();
  } catch (e) {
    console.warn('initializeAuth failed in migration catch:', e);
  }
  // Still render the app even if migration fails
  try {
    const { default: App } = await import('./App.tsx');
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <MantineProvider>
          <App />
        </MantineProvider>
      </React.StrictMode>,
    );
  } catch (e) {
    console.error('Failed to load App in migration catch:', e);
  }
})
