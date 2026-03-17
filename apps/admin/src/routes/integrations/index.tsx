import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import PageLoadingFallback from '@/components/PageLoadingFallback'

const IntegrationsAndKeysPage = lazy(() => import('@/pages/admin/IntegrationsAndKeysPage'))

export const Route = createFileRoute('/integrations/')({
    component: () => (
        <Suspense fallback={<PageLoadingFallback />}>
            <IntegrationsAndKeysPage />
        </Suspense>
    ),
})
