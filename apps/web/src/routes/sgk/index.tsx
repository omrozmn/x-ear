import { createFileRoute } from '@tanstack/react-router'
import SGKPage from '../../pages/sgk/SGKPage'
import { FeatureGate } from '../../components/common/FeatureGate'

function GatedSGKPage() {
  return (
    <FeatureGate featureKey="sgk">
      <SGKPage />
    </FeatureGate>
  )
}

export const Route = createFileRoute('/sgk/')({
  component: GatedSGKPage,
})