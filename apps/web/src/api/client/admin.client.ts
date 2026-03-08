/**
 * Admin API Client Adapter
 * 
 * This adapter provides a single point of import for all admin-related API operations.
 * Instead of importing directly from @/api/generated/admin/admin, use this adapter.
 * 
 * Usage:
 *   import { useCreateAdminDebugSwitchTenant } from '@/api/client/admin.client';
 */

export {
  useCreateAdminDebugSwitchTenant,
  useCreateAdminDebugExitImpersonation,
} from '../generated/admin/admin';

// Stub exports for backward compatibility - these endpoints don't exist in backend
export const useListAdminDebugAvailableRoles = () => ({ data: null, isLoading: false });
export const useCreateAdminDebugSwitchRole = () => ({
  mutate: () => {
    console.warn('useCreateAdminDebugSwitchRole: Role switching not available, only tenant switching');
  },
  isPending: false
});
export const getListAdminDebugAvailableRolesQueryKey = () => ['admin-debug-available-roles'];

export type { } from '../generated/schemas';
