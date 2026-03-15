import { createFileRoute } from '@tanstack/react-router'
import { SalesPage } from '../pages/SalesPage'
import { FeatureGate } from '../components/common/FeatureGate'

function GatedSalesPage() {
  return (
    <FeatureGate featureKey="sales">
      <SalesPage />
    </FeatureGate>
  )
}

export const Route = createFileRoute('/sales')({
  component: GatedSalesPage,
})