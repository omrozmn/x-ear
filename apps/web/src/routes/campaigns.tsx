import { createFileRoute } from '@tanstack/react-router'
import SmsPage from '../pages/campaigns/SmsPage'
import { FeatureGate } from '../components/common/FeatureGate'
import { PermissionGate } from '../components/PermissionGate'
import { NoPermissionPlaceholder } from '../components/ui/NoPermissionPlaceholder'

function GatedCampaignsPage() {
  return (
    <FeatureGate featureKey="campaigns">
      <PermissionGate permission="campaigns.view" fallback={<NoPermissionPlaceholder height="h-[80vh]" message="Kampanyalar sayfasını görüntüleme izniniz yok" />}>
        <SmsPage />
      </PermissionGate>
    </FeatureGate>
  )
}

export const Route = createFileRoute('/campaigns')({
    component: GatedCampaignsPage,
})
