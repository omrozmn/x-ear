import React, { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { HelmetProvider } from 'react-helmet-async'
import { AuthProvider } from './contexts/AuthContext'
import { ErrorBoundary } from './components/ErrorBoundary'

// Import the generated route tree
import { routeTree } from './routeTree.gen'

import './index.css'
import './styles/admin-mobile.css'

// Create a new router instance
const router = createRouter({
    routeTree,
    basepath: import.meta.env.BASE_URL.replace(/\/$/, '') || undefined,
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router
    }
}

const queryClient = new QueryClient()

// --- DEBUG TRAP (dev-only) ---
if (import.meta.env.DEV && typeof window !== 'undefined') {
    const originalRemoveItem = window.localStorage.removeItem;
    const originalClear = window.localStorage.clear;

    window.localStorage.removeItem = function (...args: [string]) {
        const [key] = args;
        if (key === 'admin_token') {
            console.warn('[DEV TRAP] localStorage.removeItem("admin_token") called', new Error().stack);
        }
        return originalRemoveItem.apply(this, args);
    };

    window.localStorage.clear = function (...args: []) {
        console.warn('[DEV TRAP] localStorage.clear() called', new Error().stack);
        return originalClear.apply(this, args);
    };
}
// --- DEBUG TRAP END ---

// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
    const root = ReactDOM.createRoot(rootElement)
    root.render(
        <StrictMode>
            <ErrorBoundary>
                <HelmetProvider>
                    <QueryClientProvider client={queryClient}>
                        <AuthProvider>
                            <RouterProvider router={router} />
                            <Toaster position="top-right" />
                        </AuthProvider>
                    </QueryClientProvider>
                </HelmetProvider>
            </ErrorBoundary>
        </StrictMode>,
    )
}
