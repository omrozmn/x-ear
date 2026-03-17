import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import PageLoadingFallback from '../components/PageLoadingFallback'

const FeaturesAndLocalizationPage = lazy(() => import('../pages/admin/FeaturesAndLocalizationPage'))

export const Route = createFileRoute('/features')({
    component: () => (
        <Suspense fallback={<PageLoadingFallback />}>
            <FeaturesAndLocalizationPage />
        </Suspense>
    ),
})
