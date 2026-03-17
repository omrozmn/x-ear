import React, { Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { FeatureGate } from '../components/common/FeatureGate'
import { PermissionGate } from '../components/PermissionGate'
import { NoPermissionPlaceholder } from '../components/ui/NoPermissionPlaceholder'

const PurchasesPage = React.lazy(() => import('../pages/PurchasesPage').then(m => ({ default: m.PurchasesPage })))

function LoadingSpinner() {
  return (
    <div className="flex min-h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
    </div>
  )
}

function GatedPurchasesPage() {
  return (
    <FeatureGate featureKey="purchases">
      <PermissionGate permission="invoices.view" fallback={<NoPermissionPlaceholder height="h-[80vh]" message="Alışlar sayfasını görüntüleme izniniz yok" />}>
        <Suspense fallback={<LoadingSpinner />}>
          <PurchasesPage />
        </Suspense>
      </PermissionGate>
    </FeatureGate>
  )
}

export const Route = createFileRoute('/purchases')({
  component: GatedPurchasesPage,
})
