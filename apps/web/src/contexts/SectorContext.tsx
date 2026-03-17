import { createContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useFeatures } from '../hooks/useFeatures';
import { getSectorConfig, isModuleEnabled as checkModuleEnabled } from '@x-ear/ui-web';
import type { SectorCode, SectorConfig } from '@x-ear/ui-web';

// ============================================================================
// Types
// ============================================================================

export interface SectorContextValue {
  /** Current tenant sector code */
  sector: SectorCode;
  /** Full sector configuration */
  sectorConfig: SectorConfig;
  /** List of enabled module IDs from backend */
  enabledModules: string[];
  /** Check if a module is enabled for current sector */
  isModuleEnabled: (moduleId: string) => boolean;
  /** Convenience: is this a hearing-sector tenant? */
  isHearingSector: () => boolean;
  /** Loading state */
  isLoading: boolean;
}

// ============================================================================
// Context
// ============================================================================

export const SectorContext = createContext<SectorContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface SectorProviderProps {
  children: ReactNode;
}

export function SectorProvider({ children }: SectorProviderProps) {
  const { data, isLoading } = useFeatures();

  const value = useMemo<SectorContextValue>(() => {
    // Extract sector from features API response
    const rawData = (data as Record<string, unknown>)?.data ?? data;
    const sector = (
      (rawData as Record<string, unknown>)?.sector as SectorCode
    ) ?? 'hearing';
    const enabledModules = (
      (rawData as Record<string, unknown>)?.enabledModules ??
      (rawData as Record<string, unknown>)?.enabled_modules ??
      []
    ) as string[];

    const sectorConfig = getSectorConfig(sector);

    return {
      sector,
      sectorConfig,
      enabledModules,
      isModuleEnabled: (moduleId: string) => {
        // Backend-provided module list takes precedence
        if (enabledModules.length > 0) {
          return enabledModules.includes(moduleId);
        }
        // Fallback to static config
        return checkModuleEnabled(moduleId, sector);
      },
      isHearingSector: () => sector === 'hearing',
      isLoading,
    };
  }, [data, isLoading]);

  return (
    <SectorContext.Provider value={value}>
      {children}
    </SectorContext.Provider>
  );
}
