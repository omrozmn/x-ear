import { createFileRoute } from '@tanstack/react-router';
import { UtsWorkbench } from '@/components/uts/UtsWorkbench';
import { FeatureGate } from '../components/common/FeatureGate';

function GatedUTSPage() {
  return (
    <FeatureGate featureKey="uts_integration">
      <UtsWorkbench />
    </FeatureGate>
  );
}

export const Route = createFileRoute('/uts')({
  component: GatedUTSPage,
});
