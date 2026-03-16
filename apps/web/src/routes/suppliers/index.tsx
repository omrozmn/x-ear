import { createFileRoute } from '@tanstack/react-router';
import SuppliersPage from '../../pages/SuppliersPage';
import { FeatureGate } from '../../components/common/FeatureGate';
import { PermissionGate } from '../../components/PermissionGate';
import { NoPermissionPlaceholder } from '../../components/ui/NoPermissionPlaceholder';

function GatedSuppliersPage() {
  return (
    <FeatureGate featureKey="suppliers">
      <PermissionGate permission="inventory.view" fallback={<NoPermissionPlaceholder height="h-[80vh]" message="Tedarikçiler sayfasını görüntüleme izniniz yok" />}>
        <SuppliersPage />
      </PermissionGate>
    </FeatureGate>
  );
}

export const Route = createFileRoute('/suppliers/')({
  component: GatedSuppliersPage,
});