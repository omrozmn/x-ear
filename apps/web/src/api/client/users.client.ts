/**
 * Users API Client Adapter
 * 
 * This adapter provides a single point of import for all users-related API operations.
 * Instead of importing directly from @/api/generated/users/users, use this adapter.
 * 
 * Usage:
 *   import { useListUserMe } from '@/api/client/users.client';
 */

export {
  useListUserMe,
  getListUserMeQueryKey,
  useUpdateUserMe,
  useCreateUserMePassword,
} from '@/api/generated/index';

export type { } from '@/api/generated/schemas';
