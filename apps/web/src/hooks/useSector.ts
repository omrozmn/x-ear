import { useContext } from 'react';
import { SectorContext } from '../contexts/SectorContext';
import { getSectorConfig, isModuleEnabled as checkModuleEnabled } from '@x-ear/ui-web';
import type { SectorContextValue } from '../contexts/SectorContext';

/**
 * Access current sector context.
 *
 * @example
 *   const { sector, isModuleEnabled, isHearingSector } = useSector();
 *   if (isModuleEnabled('sgk')) { ... }
 */
export function useSector(): SectorContextValue {
  const ctx = useContext(SectorContext);
  if (!ctx) {
    // Graceful fallback: if not wrapped in SectorProvider, default to hearing
    return {
      sector: 'hearing',
      sectorConfig: getSectorConfig('hearing'),
      enabledModules: [],
      isModuleEnabled: (moduleId: string) => checkModuleEnabled(moduleId, 'hearing'),
      isHearingSector: () => true,
      isLoading: false,
    };
  }
  return ctx;
}
