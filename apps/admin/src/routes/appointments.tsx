import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import PageLoadingFallback from '../components/PageLoadingFallback'

const AdminAppointmentsPage = lazy(() => import('../pages/admin/AdminAppointmentsPage'))

export const Route = createFileRoute('/appointments')({
    component: () => (
        <Suspense fallback={<PageLoadingFallback />}>
            <AdminAppointmentsPage />
        </Suspense>
    ),
})
