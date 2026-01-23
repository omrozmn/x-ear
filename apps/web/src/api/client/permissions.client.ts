/**
 * Permissions API Client Adapter
 * 
 * This adapter provides a single point of import for all permission-related API operations.
 * 
 * Usage:
 *   import { useListPermissions } from '@/api/client/permissions.client';
 */

export {
  useListPermissions,
  getListPermissionsQueryKey,
  useListRoles,
  getListRolesQueryKey,
  useCreateRoles,
  useUpdateRole,
  useGetPermissionRole,
  getGetPermissionRoleQueryKey,
  useUpdatePermissionRole,
  getUpdatePermissionRoleMutationOptions,
} from '@/api/generated/index';

export type { PermissionRead } from '@/api/generated/schemas';
