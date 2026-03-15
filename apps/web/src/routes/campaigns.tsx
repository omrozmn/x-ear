import { createFileRoute } from '@tanstack/react-router'
import SmsPage from '../pages/campaigns/SmsPage'
import { FeatureGate } from '../components/common/FeatureGate'

function GatedCampaignsPage() {
  return (
    <FeatureGate featureKey="campaigns">
      <SmsPage />
    </FeatureGate>
  )
}

export const Route = createFileRoute('/campaigns')({
    component: GatedCampaignsPage,
})
