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
