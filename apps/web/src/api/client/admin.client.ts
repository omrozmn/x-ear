/**
 * Admin API Client Adapter
 * 
 * This adapter provides a single point of import for all admin-related API operations.
 * Instead of importing directly from @/api/generated/admin/admin, use this adapter.
 * 
 * Usage:
 *   import { useCreateAdminDebugSwitchRole } from '@/api/client/admin.client';
 */

export {
  useCreateAdminDebugSwitchRole,
  useCreateAdminDebugExitImpersonation,
  useListAdminDebugAvailableRoles,
  getListAdminDebugAvailableRolesQueryKey,
} from '@/api/generated/index';

export type { } from '@/api/generated/schemas';
