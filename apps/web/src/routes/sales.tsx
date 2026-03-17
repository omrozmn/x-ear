import { createFileRoute } from '@tanstack/react-router'
import { SalesPage } from '../pages/SalesPage'
import { FeatureGate } from '../components/common/FeatureGate'
import { PermissionGate } from '../components/PermissionGate'
import { NoPermissionPlaceholder } from '../components/ui/NoPermissionPlaceholder'

function GatedSalesPage() {
  return (
    <FeatureGate featureKey="sales">
      <PermissionGate permission="sales.view" fallback={<NoPermissionPlaceholder height="h-[80vh]" message="Satışlar sayfasını görüntüleme izniniz yok" />}>
        <SalesPage />
      </PermissionGate>
    </FeatureGate>
  )
}

export const Route = createFileRoute('/sales')({
  component: GatedSalesPage,
})