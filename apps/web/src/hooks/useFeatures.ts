import { useListSubscriptionFeatures } from '@/api/generated/index';

/**
 * Convert camelCase key to snake_case for feature flag lookup.
 * hybridCamelize converts API response keys (website_builder → websiteBuilder),
 * but FeatureGate components use snake_case keys, so we need to check both.
 */
function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase();
}

function buildFeatureMap(raw: Record<string, boolean>): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(raw)) {
    result[key] = value;
    // Also store snake_case version if key is camelCase
    const snake = toSnakeCase(key);
    if (snake !== key) {
      result[snake] = value;
    }
  }
  return result;
}

export function useFeatures() {
  const query = useListSubscriptionFeatures({
    query: {
      staleTime: 5 * 60 * 1000, // 5 min
      retry: 1,
    },
  });

  const raw = query.data as any;
  const featuresData = raw?.data ?? raw;

  const rawFeatures: Record<string, boolean> = featuresData?.features ?? {};
  const features = buildFeatureMap(rawFeatures);
  const planName: string | null = featuresData?.planName ?? featuresData?.plan_name ?? null;
  const isSuperAdmin: boolean = featuresData?.isSuperAdmin ?? featuresData?.is_super_admin ?? false;

  const isFeatureEnabled = (featureKey: string): boolean => {
    if (!featuresData?.features) return true; // allow all while loading
    return features[featureKey] ?? false;
  };

  return {
    ...query,
    features,
    planName,
    isSuperAdmin,
    isFeatureEnabled,
  };
}
