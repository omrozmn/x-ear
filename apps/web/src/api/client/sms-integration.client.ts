/**
 * SMS Integration API Client Adapter
 * 
 * This adapter provides a single point of import for all SMS integration-related API operations.
 * 
 * Usage:
 *   import { useListSmHeaders } from '@/api/client/sms-integration.client';
 */

export {
  useListSmHeaders,
  useListSmCredit,
  useListSmConfig,
  useUpdateSmConfig,
  useCreateSmHeaders,
  useCreateSmAudiences,
  useCreateSmDocumentUpload,
  useDeleteSmDocument,
  useCreateSmDocumentSubmit,
  useListSmPackages,
  useListSmAudiences,
  getListSmHeadersQueryKey,
  getListSmCreditQueryKey,
  getListSmConfigQueryKey,
  getListSmPackagesQueryKey,
  getListSmAudiencesQueryKey,
} from '@/api/generated/index';

export type { } from '@/api/generated/schemas';
