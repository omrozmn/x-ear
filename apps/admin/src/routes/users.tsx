import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import PageLoadingFallback from '../components/PageLoadingFallback'

const UsersPage = lazy(() => import('../pages/admin/Users'))

export const Route = createFileRoute('/users')({
    component: () => (
        <Suspense fallback={<PageLoadingFallback />}>
            <UsersPage />
        </Suspense>
    ),
})
