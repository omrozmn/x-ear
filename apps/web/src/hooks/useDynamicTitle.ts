import { useEffect } from 'react';
import { useSector } from './useSector';

/**
 * Dynamically sets document.title based on the current tenant sector.
 * Call once in the root layout or App component.
 */
export function useDynamicTitle() {
  const { sectorConfig, isLoading } = useSector();

  useEffect(() => {
    if (!isLoading && sectorConfig) {
      document.title = `X-Ear - ${sectorConfig.description}`;
    }
  }, [sectorConfig, isLoading]);
}
