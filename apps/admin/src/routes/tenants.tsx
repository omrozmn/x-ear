import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import PageLoadingFallback from '../components/PageLoadingFallback'

const TenantsAndUsersPage = lazy(() => import('../pages/admin/TenantsAndUsersPage'))

export const Route = createFileRoute('/tenants')({
    component: () => (
        <Suspense fallback={<PageLoadingFallback />}>
            <TenantsAndUsersPage />
        </Suspense>
    ),
})
