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

export const Route = createFileRoute('/automation')({
  component: GatedAutomationPage,
})
