import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import PageLoadingFallback from '../components/PageLoadingFallback'

const BlogAutomationPage = lazy(() => import('../pages/admin/BlogAutomationPage'))

export const Route = createFileRoute('/blog-automation')({
    component: () => (
        <Suspense fallback={<PageLoadingFallback />}>
            <BlogAutomationPage />
        </Suspense>
    ),
})
