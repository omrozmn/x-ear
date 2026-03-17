import { useListSubscriptionFeatures } from '@/api/generated/index';

type FeatureFlagsResponse = {
  data?: {
    features?: Record<string, boolean>;
    planName?: string | null;
    isSuperAdmin?: boolean;
  };
  features?: Record<string, boolean>;
  planName?: string | null;
  isSuperAdmin?: boolean;
};

type UseFeaturesResult = {
  data: FeatureFlagsResponse | undefined;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  features: Record<string, boolean>;
  planName: string | null;
  isSuperAdmin: boolean;
  isFeatureEnabled: (featureKey: string) => boolean;
};

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

export function useFeatures(): UseFeaturesResult {
  const query = useListSubscriptionFeatures({
    query: {
      staleTime: 5 * 60 * 1000, // 5 min
      retry: 1,
    },
  });

  const raw = query.data as FeatureFlagsResponse | undefined;
  const featuresData = raw?.data ?? raw;

  const rawFeatures: Record<string, boolean> = featuresData?.features ?? {};
  const features = buildFeatureMap(rawFeatures);
  const planName: string | null = featuresData?.planName ?? null;
  const isSuperAdmin: boolean = featuresData?.isSuperAdmin ?? false;

  const isFeatureEnabled = (featureKey: string): boolean => {
    if (!featuresData?.features) return true; // allow all while loading
    return features[featureKey] ?? false;
  };

  return {
    data: raw,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    features,
    planName,
    isSuperAdmin,
    isFeatureEnabled,
  };
}
