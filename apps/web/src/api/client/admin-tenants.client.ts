/**
 * Admin Tenants API Client Adapter
 * 
 * This adapter provides a single point of import for all admin-tenants-related API operations.
 * Instead of importing directly from @/api/generated/admin-tenants/admin-tenants, use this adapter.
 * 
 * Usage:
 *   import { useCreateAdminDebugSwitchTenant } from '@/api/client/admin-tenants.client';
 */

export {
  useCreateAdminDebugSwitchTenant,
  useCreateAdminDebugExitImpersonation,
  useListAdminTenants,
  getListAdminTenantsQueryKey,
} from '@/api/generated/index';

export type { TenantRead } from '@/api/generated/schemas';
