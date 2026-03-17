import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import PageLoadingFallback from '../components/PageLoadingFallback'

const BillingAndPaymentsPage = lazy(() => import('../pages/admin/BillingAndPaymentsPage'))

export const Route = createFileRoute('/billing')({
    component: () => (
        <Suspense fallback={<PageLoadingFallback />}>
            <BillingAndPaymentsPage />
        </Suspense>
    ),
})
