import { createFileRoute } from '@tanstack/react-router'
import { PartiesPage } from '../../pages/PartiesPage'
import { FeatureGate } from '../../components/common/FeatureGate'

function GatedPartiesPage() {
  return (
    <FeatureGate featureKey="patients">
      <PartiesPage />
    </FeatureGate>
  )
}

export const Route = createFileRoute('/parties/')({
  component: GatedPartiesPage,
})
