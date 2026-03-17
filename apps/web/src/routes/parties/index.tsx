import { createFileRoute } from '@tanstack/react-router'
import { PartiesPage } from '../../pages/PartiesPage'
import { FeatureGate } from '../../components/common/FeatureGate'
import { PermissionGate } from '../../components/PermissionGate'
import { NoPermissionPlaceholder } from '../../components/ui/NoPermissionPlaceholder'

function GatedPartiesPage() {
  return (
    <FeatureGate featureKey="patients">
      <PermissionGate permission="parties.view" fallback={<NoPermissionPlaceholder height="h-[80vh]" message="Hasta listesi sayfasını görüntüleme izniniz yok" />}>
        <PartiesPage />
      </PermissionGate>
    </FeatureGate>
  )
}

export const Route = createFileRoute('/parties/')({
  component: GatedPartiesPage,
})
