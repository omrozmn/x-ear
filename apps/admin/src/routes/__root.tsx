import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { AdminLayout } from '../components/admin/AdminLayout'
import { AIChatWidget } from '../ai/AIChatWidget'

export const Route = createRootRoute({
    component: () => (
        <>
            <AdminLayout>
                <Outlet />
            </AdminLayout>
            <AIChatWidget />
            <TanStackRouterDevtools />
        </>
    ),
})
