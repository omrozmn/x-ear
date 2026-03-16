import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSector } from './useSector';
import { applySectorOverlay } from '../i18n';

/**
 * Hook that applies sector-specific i18n overlay when sector changes.
 *
 * Usage in a component:
 *   const { st } = useSectorTerminology();
 *   st('party')      // → "Hasta" for hearing, "Müşteri" for pharmacy
 *   st('app_title')  // → "Hasta Yönetim Sistemi" / "Eczane Yönetim Sistemi"
 */
export function useSectorTerminology() {
  const { sector, isLoading } = useSector();
  const { t, i18n } = useTranslation('sector');

  useEffect(() => {
    if (!isLoading && sector) {
      applySectorOverlay(sector);
    }
  }, [sector, isLoading, i18n.language]);

  return {
    /** Sector-aware translation function (reads from 'sector' namespace) */
    st: t,
    /** Current sector code */
    sector,
  };
}
