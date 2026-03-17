import React, { Suspense } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { FeatureGate } from '../components/common/FeatureGate';

const WebsiteBuilderPage = React.lazy(() => import('../pages/WebsiteBuilderPage'));

function LoadingSpinner() {
  return (
    <div className="flex min-h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
    </div>
  );
}

function GatedWebManagementPage() {
  return (
    <FeatureGate featureKey="website_builder">
      <Suspense fallback={<LoadingSpinner />}>
        <WebsiteBuilderPage />
      </Suspense>
    </FeatureGate>
  );
}

export const Route = createFileRoute('/web-management')({
  component: GatedWebManagementPage,
});
