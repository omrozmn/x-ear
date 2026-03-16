import { createFileRoute, Outlet } from '@tanstack/react-router'
import { FeatureGate } from '../components/common/FeatureGate'
import { PermissionGate } from '../components/PermissionGate'
import { NoPermissionPlaceholder } from '../components/ui/NoPermissionPlaceholder'

export const Route = createFileRoute('/inventory')({
  component: InventoryLayout,
})

function InventoryLayout() {
  return (
    <FeatureGate featureKey="inventory">
      <PermissionGate permission="inventory.view" fallback={<NoPermissionPlaceholder height="h-[80vh]" message="Envanter sayfasını görüntüleme izniniz yok" />}>
        <Outlet />
      </PermissionGate>
    </FeatureGate>
  )
}
