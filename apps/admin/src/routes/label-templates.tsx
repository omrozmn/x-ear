import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import PageLoadingFallback from '../components/PageLoadingFallback'

const LabelTemplatesPage = lazy(() => import('../pages/admin/LabelTemplatesPage'))

export const Route = createFileRoute('/label-templates')({
    component: () => (
        <Suspense fallback={<PageLoadingFallback />}>
            <LabelTemplatesPage />
        </Suspense>
    ),
})
