import React, { Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { FeatureGate } from '../components/common/FeatureGate'
import { PermissionGate } from '../components/PermissionGate'
import { NoPermissionPlaceholder } from '../components/ui/NoPermissionPlaceholder'

const AppointmentsPage = React.lazy(() => import('../pages/appointments'))

function LoadingSpinner() {
  return (
    <div className="flex min-h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
    </div>
  )
}

function GatedAppointmentsPage() {
  return (
    <FeatureGate featureKey="appointments">
      <PermissionGate permission="appointments.view" fallback={<NoPermissionPlaceholder height="h-[80vh]" message="Randevular sayfasını görüntüleme izniniz yok" />}>
        <Suspense fallback={<LoadingSpinner />}>
          <AppointmentsPage />
        </Suspense>
      </PermissionGate>
    </FeatureGate>
  )
}

export const Route = createFileRoute('/appointments')({
  component: GatedAppointmentsPage,
})
