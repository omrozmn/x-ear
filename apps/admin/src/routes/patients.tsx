import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import PageLoadingFallback from '../components/PageLoadingFallback'

const PatientsAndAppointmentsPage = lazy(() => import('../pages/admin/PatientsAndAppointmentsPage'))

export const Route = createFileRoute('/patients')({
    component: () => (
        <Suspense fallback={<PageLoadingFallback />}>
            <PatientsAndAppointmentsPage />
        </Suspense>
    ),
})
