import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import PageLoadingFallback from '../components/PageLoadingFallback'

const TenantsPage = lazy(() => import('../pages/admin/TenantsPage'))

export const Route = createFileRoute('/tenants')({
    component: () => (
        <Suspense fallback={<PageLoadingFallback />}>
            <TenantsPage />
        </Suspense>
    ),
})
