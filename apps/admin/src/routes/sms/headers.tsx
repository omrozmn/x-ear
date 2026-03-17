import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import PageLoadingFallback from '../../components/PageLoadingFallback'

const SmsManagementPage = lazy(() => import('../../pages/admin/SmsManagementPage'))

export const Route = createFileRoute('/sms/headers')({
    component: () => (
        <Suspense fallback={<PageLoadingFallback />}>
            <SmsManagementPage />
        </Suspense>
    ),
})
