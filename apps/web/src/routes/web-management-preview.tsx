import { createFileRoute } from '@tanstack/react-router';
import WebsiteBuilderPreviewPage from '../pages/WebsiteBuilderPreviewPage';
import { FeatureGate } from '../components/common/FeatureGate';

function GatedPreviewPage() {
  return (
    <FeatureGate featureKey="website_builder">
      <WebsiteBuilderPreviewPage />
    </FeatureGate>
  );
}

export const Route = createFileRoute('/web-management-preview')({
  component: GatedPreviewPage,
});
