import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles/index.css'
import './i18n';
import App from './App.tsx'
/*
import { storageMigrator } from './utils/storage-migrator'
import { tokenManager } from './utils/token-manager'
import { MantineProvider } from '@mantine/core';
import { AUTH_STORAGE_PERSIST } from './constants/storage-keys';
*/

console.log('XXX DEBUG: Imports loaded, attempting to render App XXX');

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      {/* <MantineProvider> */}
      <App />
      {/* </MantineProvider> */}
    </React.StrictMode>,
  );
  console.log('XXX DEBUG: Render called XXX');
} catch (e) {
  console.error('XXX DEBUG: Render FAILED XXX', e);
}

/*
// ... (rest of the original code)
*/



