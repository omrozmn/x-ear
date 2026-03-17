import { createFileRoute, Outlet } from '@tanstack/react-router'
import { FeatureGate } from '../components/common/FeatureGate'
import { PermissionGate } from '../components/PermissionGate'
import { NoPermissionPlaceholder } from '../components/ui/NoPermissionPlaceholder'

export const Route = createFileRoute('/invoices')({
  component: InvoicesLayout,
})

function InvoicesLayout() {
  return (
    <FeatureGate featureKey="invoices">
      <PermissionGate permission="invoices.view" fallback={<NoPermissionPlaceholder height="h-[80vh]" message="Faturalar sayfasını görüntüleme izniniz yok" />}>
        <Outlet />
      </PermissionGate>
    </FeatureGate>
  )
}