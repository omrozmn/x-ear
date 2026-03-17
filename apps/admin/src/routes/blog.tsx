import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import PageLoadingFallback from '../components/PageLoadingFallback'

const ContentManagementPage = lazy(() => import('../pages/admin/ContentManagementPage'))

export const Route = createFileRoute('/blog')({
    component: () => (
        <Suspense fallback={<PageLoadingFallback />}>
            <ContentManagementPage />
        </Suspense>
    ),
})
