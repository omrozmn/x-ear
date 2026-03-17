import React, { Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { FeatureGate } from '../components/common/FeatureGate'
import { PermissionGate } from '../components/PermissionGate'
import { NoPermissionPlaceholder } from '../components/ui/NoPermissionPlaceholder'

const AutomationPage = React.lazy(() => import('../pages/AutomationPage'))

function LoadingSpinner() {
  return (
    <div className="flex min-h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
    </div>
  )
}

function GatedAutomationPage() {
  return (
    <FeatureGate featureKey="automation">
      <PermissionGate permission="settings.view" fallback={<NoPermissionPlaceholder height="h-[80vh]" message="Otomasyon sayfasını görüntüleme izniniz yok" />}>
        <Suspense fallback={<LoadingSpinner />}>
          <AutomationPage />
        </Suspense>
      </PermissionGate>
    </FeatureGate>
  )
}

export const Route = createFileRoute('/automation')({
  component: GatedAutomationPage,
})
