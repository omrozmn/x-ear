/**
 * SGK Credentials API Client Adapter
 * 
 * Re-exports Orval-generated hooks for SGK login credential management.
 * 
 * Usage:
 *   import { useGetSgkCredentials, useUpdateSgkCredentials } from '@/api/client/sgk-credentials.client';
 */

export {
  useGetSgkCredentials,
  getGetSgkCredentialsQueryKey,
  getGetSgkCredentialsQueryOptions,
  useUpdateSgkCredentials,
  getUpdateSgkCredentialsMutationOptions,
} from '@/api/generated/sgk-credentials/sgk-credentials';
