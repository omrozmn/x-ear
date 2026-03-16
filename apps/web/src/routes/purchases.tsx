import { createFileRoute } from '@tanstack/react-router'
import { PurchasesPage } from '../pages/PurchasesPage'
import { FeatureGate } from '../components/common/FeatureGate'
import { PermissionGate } from '../components/PermissionGate'
import { NoPermissionPlaceholder } from '../components/ui/NoPermissionPlaceholder'

function GatedPurchasesPage() {
  return (
    <FeatureGate featureKey="purchases">
      <PermissionGate permission="invoices.view" fallback={<NoPermissionPlaceholder height="h-[80vh]" message="Alışlar sayfasını görüntüleme izniniz yok" />}>
        <PurchasesPage />
      </PermissionGate>
    </FeatureGate>
  )
}

export const Route = createFileRoute('/purchases')({
  component: GatedPurchasesPage,
})