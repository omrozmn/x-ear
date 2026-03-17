import { createRootRoute, Outlet, useRouterState, Navigate } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { AdminLayout } from '../components/admin/AdminLayout'
import { RoutePermissionGate } from '../components/admin/RoutePermissionGate'
import NotFound from '../pages/admin/NotFound'
import { useAuth } from '../contexts/useAuth'

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/unauthorized']

function RootComponent() {
    const { isAuthenticated, isLoading } = useAuth()
    const router = useRouterState()
    const currentPath = router.location.pathname

    const isPublicRoute = PUBLIC_ROUTES.some(route => currentPath === route || currentPath.startsWith(route + '/'))

    // Show nothing while auth is loading (prevents flash)
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-100">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
        )
    }

    // Redirect to login if not authenticated and not on a public route
    if (!isAuthenticated && !isPublicRoute) {
        return <Navigate to="/login" />
    }

    // Redirect to dashboard if authenticated and on login page
    if (isAuthenticated && currentPath === '/login') {
        return <Navigate to="/dashboard" />
    }

    return (
        <>
            <AdminLayout>
                {isPublicRoute ? (
                    <Outlet />
                ) : (
                    <RoutePermissionGate>
                        <Outlet />
                    </RoutePermissionGate>
                )}
            </AdminLayout>
            {import.meta.env.DEV && <TanStackRouterDevtools />}
        </>
    )
}

export const Route = createRootRoute({
    component: RootComponent,
    notFoundComponent: NotFound,
})
