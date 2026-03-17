import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import PageLoadingFallback from '../components/PageLoadingFallback'

const SystemLogsPage = lazy(() => import('../pages/admin/SystemLogsPage'))

export const Route = createFileRoute('/activity-logs')({
    component: () => (
        <Suspense fallback={<PageLoadingFallback />}>
            <SystemLogsPage />
        </Suspense>
    ),
})
