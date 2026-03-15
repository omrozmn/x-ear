import { createFileRoute } from '@tanstack/react-router'
import { PurchasesPage } from '../pages/PurchasesPage'
import { FeatureGate } from '../components/common/FeatureGate'

function GatedPurchasesPage() {
  return (
    <FeatureGate featureKey="purchases">
      <PurchasesPage />
    </FeatureGate>
  )
}

export const Route = createFileRoute('/purchases')({
  component: GatedPurchasesPage,
})