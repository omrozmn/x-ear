import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import PageLoadingFallback from '../components/PageLoadingFallback'

const Features = lazy(() => import('../pages/admin/Features'))

export const Route = createFileRoute('/features')({
    component: () => (
        <Suspense fallback={<PageLoadingFallback />}>
            <Features />
        </Suspense>
    ),
})
