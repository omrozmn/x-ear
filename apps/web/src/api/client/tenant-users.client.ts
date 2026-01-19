/**
 * Tenant Users API Client Adapter
 * 
 * This adapter provides a single point of import for all tenant user-related API operations.
 * 
 * Usage:
 *   import { useListTenantUsers } from '@/api/client/tenant-users.client';
 */

export {
  useListTenantUsers,
  useCreateTenantUser as useCreateTenantUsers,
  useUpdateTenantUser,
  useDeleteTenantUser,
  getListTenantUsersQueryKey,
} from '@/api/generated/index';

export type { TenantUserCreate, TenantUserUpdate } from '@/api/generated/schemas';
