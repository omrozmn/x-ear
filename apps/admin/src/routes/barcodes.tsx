import { lazy, Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import PageLoadingFallback from '../components/PageLoadingFallback'

const BarcodeAndPrintingPage = lazy(() => import('../pages/admin/BarcodeAndPrintingPage'))

export const Route = createFileRoute('/barcodes')({
    component: () => (
        <Suspense fallback={<PageLoadingFallback />}>
            <BarcodeAndPrintingPage />
        </Suspense>
    ),
})
