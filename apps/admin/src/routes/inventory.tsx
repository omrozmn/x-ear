import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import PageLoadingFallback from '../components/PageLoadingFallback'

const InventoryAndOpsPage = lazy(() => import('../pages/admin/InventoryAndOpsPage'))

export const Route = createFileRoute('/inventory')({
    component: () => (
        <Suspense fallback={<PageLoadingFallback />}>
            <InventoryAndOpsPage />
        </Suspense>
    ),
})
