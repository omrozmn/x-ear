import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import PageLoadingFallback from '../components/PageLoadingFallback'

const AdminBirFaturaPage = lazy(() => import('../pages/admin/AdminBirFaturaPage'))

export const Route = createFileRoute('/billing')({
    component: () => (
        <Suspense fallback={<PageLoadingFallback />}>
            <AdminBirFaturaPage />
        </Suspense>
    ),
})
