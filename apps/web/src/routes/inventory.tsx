import { createFileRoute, Outlet } from '@tanstack/react-router'
import { FeatureGate } from '../components/common/FeatureGate'

export const Route = createFileRoute('/inventory')({
  component: InventoryLayout,
})

function InventoryLayout() {
  return (
    <FeatureGate featureKey="inventory">
      <Outlet />
    </FeatureGate>
  )
}
