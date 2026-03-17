import React, { Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { FeatureGate } from '../components/common/FeatureGate'
import { PermissionGate } from '../components/PermissionGate'
import { NoPermissionPlaceholder } from '../components/ui/NoPermissionPlaceholder'

const SalesPage = React.lazy(() => import('../pages/SalesPage').then(m => ({ default: m.SalesPage })))

function LoadingSpinner() {
  return (
    <div className="flex min-h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
    </div>
  )
}

function GatedSalesPage() {
  return (
    <FeatureGate featureKey="sales">
      <PermissionGate permission="sales.view" fallback={<NoPermissionPlaceholder height="h-[80vh]" message="Satışlar sayfasını görüntüleme izniniz yok" />}>
        <Suspense fallback={<LoadingSpinner />}>
          <SalesPage />
        </Suspense>
      </PermissionGate>
    </FeatureGate>
  )
}

export const Route = createFileRoute('/sales')({
  component: GatedSalesPage,
})
