import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/index.css'
import { storageMigrator } from './utils/storage-migrator'
import { MantineProvider } from '@mantine/core';

// Run storage migration before app initialization
storageMigrator.migrate().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <MantineProvider>
        <App />
      </MantineProvider>
    </React.StrictMode>,
  )
}).catch((error) => {
  console.error('Storage migration failed:', error)
  // Still render the app even if migration fails
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <MantineProvider>
        <App />
      </MantineProvider>
    </React.StrictMode>,
  )
})
