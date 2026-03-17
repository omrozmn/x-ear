import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import PageLoadingFallback from '../components/PageLoadingFallback'

const BarcodeServicePage = lazy(() => import('../pages/admin/BarcodeServicePage'))

export const Route = createFileRoute('/barcodes')({
    component: () => (
        <Suspense fallback={<PageLoadingFallback />}>
            <BarcodeServicePage />
        </Suspense>
    ),
})
