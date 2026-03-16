import { createFileRoute } from '@tanstack/react-router';
import { UtsWorkbench } from '@/components/uts/UtsWorkbench';
import { FeatureGate } from '../components/common/FeatureGate';
import { ModuleGate } from '../components/common/ModuleGate';
import { PermissionGate } from '../components/PermissionGate';
import { NoPermissionPlaceholder } from '../components/ui/NoPermissionPlaceholder';

function GatedUTSPage() {
  return (
    <ModuleGate module="uts">
      <FeatureGate featureKey="uts">
        <PermissionGate permission="sgk.view" fallback={<NoPermissionPlaceholder height="h-[80vh]" message="UTS sayfasını görüntüleme izniniz yok" />}>
          <UtsWorkbench />
        </PermissionGate>
      </FeatureGate>
    </ModuleGate>
  );
}

export const Route = createFileRoute('/uts')({
  component: GatedUTSPage,
});
