import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import PageLoadingFallback from '../components/PageLoadingFallback'

const CountriesPage = lazy(() => import('../pages/admin/CountriesPage'))

export const Route = createFileRoute('/countries')({
    component: () => (
        <Suspense fallback={<PageLoadingFallback />}>
            <CountriesPage />
        </Suspense>
    ),
})
