import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { AdminLayout } from '../components/admin/AdminLayout'
import NotFound from '../pages/admin/NotFound'

export const Route = createRootRoute({
    component: () => (
        <>
            <AdminLayout>
                <Outlet />
            </AdminLayout>
            <TanStackRouterDevtools />
        </>
    ),
    notFoundComponent: NotFound,
})
