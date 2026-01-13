import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/index.css'
import App from './App.tsx'
import { storageMigrator } from './utils/storage-migrator'
import { tokenManager } from './utils/token-manager'
import { useAuthStore } from './stores/authStore'
import { MantineProvider } from '@mantine/core';

console.log('main.tsx loaded');

// Sync tokens from Zustand persist to TokenManager
// This ensures TokenManager has the latest tokens from Zustand persist storage
function syncTokensFromZustand() {
  try {
    // Read directly from localStorage to avoid Zustand state timing issues
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      const zustandToken = parsed?.state?.token;
      const zustandRefresh = parsed?.state?.createAuthRefresh;
      
      if (zustandToken && !tokenManager.accessToken) {
        console.log('[main.tsx] Syncing tokens from Zustand persist storage...');
        tokenManager.setTokens(zustandToken, zustandRefresh || null);
        console.log('[main.tsx] Tokens synced successfully');
      }
    }
  } catch (e) {
    console.warn('[main.tsx] Failed to sync tokens from Zustand:', e);
  }
}

// TokenManager handles all token hydration from storage automatically on construction
console.log('[main.tsx] TokenManager initialized:', {
  hasAccessToken: !!tokenManager.accessToken,
  hasRefreshToken: !!tokenManager.createAuthRefresh,
  isExpired: tokenManager.isAccessTokenExpired(),
  userId: tokenManager.getUserId()
});

// Sync tokens from Zustand persist if TokenManager didn't find them
syncTokensFromZustand();

console.log('[main.tsx] After sync:', {
  hasAccessToken: !!tokenManager.accessToken,
  hasRefreshToken: !!tokenManager.createAuthRefresh,
});

console.log('Starting migration and auth init...');

// Simplified: Just render the app directly without waiting for async operations
(async () => {
  try {
    // Run migration in background (non-blocking) - only for non-token data
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



