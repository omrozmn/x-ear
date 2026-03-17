import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import PageLoadingFallback from '../components/PageLoadingFallback'

const PlansAndAddonsPage = lazy(() => import('../pages/admin/PlansAndAddonsPage'))

export const Route = createFileRoute('/plans')({
    component: () => (
        <Suspense fallback={<PageLoadingFallback />}>
            <PlansAndAddonsPage />
        </Suspense>
    ),
})
