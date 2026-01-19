/**
 * Branches API Client Adapter
 * 
 * This adapter provides a single point of import for all branches-related API operations.
 * Instead of importing directly from @/api/generated/branches/branches, use this adapter.
 * 
 * Usage:
 *   import { useListBranches } from '@/api/client/branches.client';
 */

export {
  useListBranches,
  getListBranchesQueryKey,
  useListParties,
  getListPartiesQueryKey,
  useListPartyCount,
  getListPartyCountQueryKey,
  useListSmHeaders,
  getListSmHeadersQueryKey,
} from '@/api/generated/index';

export type { } from '@/api/generated/schemas';
