import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import PageLoadingFallback from '../components/PageLoadingFallback'

const ReportsAndLogsPage = lazy(() => import('../pages/admin/ReportsAndLogsPage'))

export const Route = createFileRoute('/analytics')({
    component: () => (
        <Suspense fallback={<PageLoadingFallback />}>
            <ReportsAndLogsPage />
        </Suspense>
    ),
})
