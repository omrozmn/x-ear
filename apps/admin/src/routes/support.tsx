import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import PageLoadingFallback from '../components/PageLoadingFallback'

const SupportPage = lazy(() => import('../pages/admin/Support'))

export const Route = createFileRoute('/support')({
    component: () => (
        <Suspense fallback={<PageLoadingFallback />}>
            <SupportPage />
        </Suspense>
    ),
})
