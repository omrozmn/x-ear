import { createFileRoute } from '@tanstack/react-router'
import AutomationPage from '../pages/AutomationPage'
import { FeatureGate } from '../components/common/FeatureGate'
import { PermissionGate } from '../components/PermissionGate'
import { NoPermissionPlaceholder } from '../components/ui/NoPermissionPlaceholder'

function GatedAutomationPage() {
  return (
    <FeatureGate featureKey="automation">
      <PermissionGate permission="settings.view" fallback={<NoPermissionPlaceholder height="h-[80vh]" message="Otomasyon sayfasını görüntüleme izniniz yok" />}>
        <AutomationPage />
      </PermissionGate>
    </FeatureGate>
  )
}

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TanStack Router type generation out of sync
export const Route = createFileRoute('/automation')({
  component: GatedAutomationPage,
})
