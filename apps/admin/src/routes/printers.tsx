import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import PageLoadingFallback from '../components/PageLoadingFallback'

const PrinterManagementPage = lazy(() => import('../pages/admin/PrinterManagementPage'))

export const Route = createFileRoute('/printers')({
    component: () => (
        <Suspense fallback={<PageLoadingFallback />}>
            <PrinterManagementPage />
        </Suspense>
    ),
})
