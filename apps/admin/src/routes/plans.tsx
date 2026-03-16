import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import PageLoadingFallback from '../components/PageLoadingFallback'

const Plans = lazy(() => import('../pages/admin/Plans'))

export const Route = createFileRoute('/plans')({
    component: () => (
        <Suspense fallback={<PageLoadingFallback />}>
            <Plans />
        </Suspense>
    ),
})
