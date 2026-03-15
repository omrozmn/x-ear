import { createFileRoute } from '@tanstack/react-router';
import { CashflowPage } from '../pages/CashflowPage';
import { FeatureGate } from '../components/common/FeatureGate';

function GatedCashflowPage() {
  return (
    <FeatureGate featureKey="cashflow">
      <CashflowPage />
    </FeatureGate>
  );
}

export const Route = createFileRoute('/cashflow')({
  component: GatedCashflowPage,
});
