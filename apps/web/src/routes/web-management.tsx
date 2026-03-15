import { createFileRoute } from '@tanstack/react-router';
import WebsiteBuilderPage from '../pages/WebsiteBuilderPage';
import { FeatureGate } from '../components/common/FeatureGate';

function GatedWebManagementPage() {
  return (
    <FeatureGate featureKey="website_builder">
      <WebsiteBuilderPage />
    </FeatureGate>
  );
}

export const Route = createFileRoute('/web-management')({
  component: GatedWebManagementPage,
});
