/**
 * Settings API Client Adapter
 * 
 * This adapter provides a single point of import for all settings-related API operations.
 * Instead of importing directly from @/api/generated/settings/settings, use this adapter.
 * 
 * Usage:
 *   import { useListSettings } from '@/api/client/settings.client';
 */

export {
  useListSettings,
  getListSettingsQueryKey,
} from '@/api/generated/index';

export type { } from '@/api/generated/schemas';
