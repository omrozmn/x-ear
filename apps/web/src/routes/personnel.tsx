import React, { Suspense } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PermissionGate } from '../components/PermissionGate'
import { NoPermissionPlaceholder } from '../components/ui/NoPermissionPlaceholder'

const PersonnelManagementPage = React.lazy(() => import('../pages/PersonnelManagementPage'))

function LoadingSpinner() {
  return (
    <div className="flex min-h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
    </div>
  )
}

function GatedPersonnelPage() {
  return (
    <PermissionGate anyOf={['team.view', 'team.permissions']} fallback={<NoPermissionPlaceholder height="h-[80vh]" message="Personel sayfasını görüntüleme izniniz yok" />}>
      <Suspense fallback={<LoadingSpinner />}>
        <PersonnelManagementPage />
      </Suspense>
    </PermissionGate>
  )
}

export const Route = createFileRoute('/personnel')({
  component: GatedPersonnelPage,
})
