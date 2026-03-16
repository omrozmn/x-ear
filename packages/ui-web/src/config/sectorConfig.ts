/**
 * Sector Configuration for Multi-Sector Platform.
 *
 * Defines which modules, terminology, and default roles apply per sector.
 * This is the frontend counterpart to the backend module_registry.py.
 *
 * Usage:
 *   import { getSectorConfig, isModuleEnabled } from '@x-ear/ui-web/config/sectorConfig';
 *   const config = getSectorConfig('hearing');
 *   config.enabledModules.includes('sgk'); // true
 */

// ============================================================================
// Types
// ============================================================================

export type SectorCode = 'hearing' | 'pharmacy' | 'hospital' | 'hotel' | 'beauty' | 'general';

export interface SectorConfig {
  /** Sector identifier */
  sector: SectorCode;
  /** Human-readable label */
  label: string;
  /** Modules enabled for this sector */
  enabledModules: string[];
  /** i18n namespace for sector terminology overlay */
  terminologyNamespace: string;
  /** Default role names for new tenants in this sector */
  defaultRoles: string[];
  /** Badge color for admin UI */
  badgeColor: string;
  /** Short description */
  description: string;
}

// ============================================================================
// Universal modules (available in ALL sectors)
// ============================================================================

const UNIVERSAL_MODULES = [
  'appointments',
  'inventory',
  'invoices',
  'sales',
  'campaigns',
  'personnel',
  'reports',
] as const;

// ============================================================================
// Sector Definitions
// ============================================================================

const SECTOR_CONFIGS: Record<SectorCode, SectorConfig> = {
  hearing: {
    sector: 'hearing',
    label: 'İşitme Merkezi',
    enabledModules: [
      ...UNIVERSAL_MODULES,
      'hearing_tests',
      'devices',
      'noah',
      'sgk',
      'uts',
    ],
    terminologyNamespace: 'sector_hearing',
    defaultRoles: ['Admin', 'Odyolog', 'Resepsiyonist', 'Muhasebeci'],
    badgeColor: 'blue',
    description: 'İşitme merkezi yönetim sistemi',
  },
  pharmacy: {
    sector: 'pharmacy',
    label: 'Eczane',
    enabledModules: [...UNIVERSAL_MODULES],
    terminologyNamespace: 'sector_pharmacy',
    defaultRoles: ['Admin', 'Eczacı', 'Teknisyen', 'Kasiyer'],
    badgeColor: 'green',
    description: 'Eczane yönetim sistemi',
  },
  hospital: {
    sector: 'hospital',
    label: 'Hastane',
    enabledModules: [...UNIVERSAL_MODULES],
    terminologyNamespace: 'sector_hospital',
    defaultRoles: ['Admin', 'Doktor', 'Hemşire', 'Resepsiyonist'],
    badgeColor: 'red',
    description: 'Hastane yönetim sistemi',
  },
  hotel: {
    sector: 'hotel',
    label: 'Otel',
    enabledModules: [...UNIVERSAL_MODULES],
    terminologyNamespace: 'sector_hotel',
    defaultRoles: ['Admin', 'Resepsiyonist', 'Housekeeping'],
    badgeColor: 'orange',
    description: 'Otel yönetim sistemi',
  },
  beauty: {
    sector: 'beauty',
    label: 'Güzellik Salonu',
    enabledModules: [...UNIVERSAL_MODULES],
    terminologyNamespace: 'sector_beauty',
    defaultRoles: ['Admin', 'Uzman', 'Resepsiyonist'],
    badgeColor: 'pink',
    description: 'Güzellik salonu yönetim sistemi',
  },
  general: {
    sector: 'general',
    label: 'Genel CRM',
    enabledModules: [...UNIVERSAL_MODULES],
    terminologyNamespace: 'sector_general',
    defaultRoles: ['Admin', 'Yönetici', 'Personel', 'Muhasebeci'],
    badgeColor: 'gray',
    description: 'Genel iş yönetim sistemi',
  },
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Get the full configuration for a sector.
 * Falls back to 'hearing' if the sector code is unknown.
 */
export function getSectorConfig(sector: SectorCode | string): SectorConfig {
  return SECTOR_CONFIGS[sector as SectorCode] ?? SECTOR_CONFIGS.hearing;
}

/**
 * Check if a module is enabled for a given sector.
 */
export function isModuleEnabled(moduleId: string, sector: SectorCode | string): boolean {
  const config = getSectorConfig(sector);
  return config.enabledModules.includes(moduleId);
}

/**
 * Get all available sector codes.
 */
export function getAllSectors(): SectorCode[] {
  return Object.keys(SECTOR_CONFIGS) as SectorCode[];
}

/**
 * Get all sector configs as an array.
 */
export function getAllSectorConfigs(): SectorConfig[] {
  return Object.values(SECTOR_CONFIGS);
}

export { SECTOR_CONFIGS, UNIVERSAL_MODULES };
