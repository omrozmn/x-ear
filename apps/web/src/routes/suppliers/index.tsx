import { createFileRoute } from '@tanstack/react-router';
import SuppliersPage from '../../pages/SuppliersPage';
import { FeatureGate } from '../../components/common/FeatureGate';

function GatedSuppliersPage() {
  return (
    <FeatureGate featureKey="suppliers">
      <SuppliersPage />
    </FeatureGate>
  );
}

export const Route = createFileRoute('/suppliers/')({
  component: GatedSuppliersPage,
});