import { createFileRoute } from '@tanstack/react-router'
import AutomationPage from '../pages/AutomationPage'
import { FeatureGate } from '../components/common/FeatureGate'

function GatedAutomationPage() {
  return (
    <FeatureGate featureKey="automation">
      <AutomationPage />
    </FeatureGate>
  )
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TanStack Router type generation out of sync
export const Route = createFileRoute('/automation')({
  component: GatedAutomationPage,
})
