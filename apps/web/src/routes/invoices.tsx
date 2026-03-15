import { createFileRoute, Outlet } from '@tanstack/react-router'
import { FeatureGate } from '../components/common/FeatureGate'

export const Route = createFileRoute('/invoices')({
  component: InvoicesLayout,
})

function InvoicesLayout() {
  return (
    <FeatureGate featureKey="invoices">
      <Outlet />
    </FeatureGate>
  )
}