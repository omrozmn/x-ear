import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { AdminLayout } from '../components/admin/AdminLayout'

export const Route = createRootRoute({
    component: () => (
        <>
            <AdminLayout>
                <Outlet />
            </AdminLayout>
            <TanStackRouterDevtools />
        </>
    ),
})
