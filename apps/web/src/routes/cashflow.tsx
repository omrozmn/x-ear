import { createFileRoute } from '@tanstack/react-router';
import { CashflowPage } from '../pages/CashflowPage';
import { FeatureGate } from '../components/common/FeatureGate';
import { PermissionGate } from '../components/PermissionGate';
import { NoPermissionPlaceholder } from '../components/ui/NoPermissionPlaceholder';

function GatedCashflowPage() {
  return (
    <FeatureGate featureKey="cashflow">
      <PermissionGate anyOf={['finance.view', 'finance.cash_register']} fallback={<NoPermissionPlaceholder height="h-[80vh]" message="Kasa akışı sayfasını görüntüleme izniniz yok" />}>
        <CashflowPage />
      </PermissionGate>
    </FeatureGate>
  );
}

export const Route = createFileRoute('/cashflow')({
  component: GatedCashflowPage,
});
