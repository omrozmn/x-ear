import { createFileRoute } from '@tanstack/react-router'
import SGKPage from '../../pages/sgk/SGKPage'
import { FeatureGate } from '../../components/common/FeatureGate'
import { ModuleGate } from '../../components/common/ModuleGate'
import { PermissionGate } from '../../components/PermissionGate'
import { NoPermissionPlaceholder } from '../../components/ui/NoPermissionPlaceholder'

function GatedSGKPage() {
  return (
    <ModuleGate module="sgk">
      <FeatureGate featureKey="sgk">
        <PermissionGate permission="sgk.view" fallback={<NoPermissionPlaceholder height="h-[80vh]" message="SGK sayfasını görüntüleme izniniz yok" />}>
          <SGKPage />
        </PermissionGate>
      </FeatureGate>
    </ModuleGate>
  )
}

export const Route = createFileRoute('/sgk/')({
  component: GatedSGKPage,
})