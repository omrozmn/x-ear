import { useFeatures } from './useFeatures';

export function useECommerceFeature(): { enabled: boolean; loading: boolean } {
  const { isFeatureEnabled, isLoading } = useFeatures();
  return {
    enabled: isFeatureEnabled('ecommerce'),
    loading: isLoading,
  };
}
