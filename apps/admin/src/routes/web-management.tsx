import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import PageLoadingFallback from '../components/PageLoadingFallback'

const WebManagementOversightPage = lazy(() => import('../pages/admin/WebManagementOversightPage'))

export const Route = createFileRoute('/web-management')({
    component: () => (
        <Suspense fallback={<PageLoadingFallback />}>
            <WebManagementOversightPage />
        </Suspense>
    ),
})
