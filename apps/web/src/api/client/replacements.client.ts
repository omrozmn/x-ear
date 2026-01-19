/**
 * Replacements API Client Adapter
 * 
 * This adapter provides a single point of import for all replacement-related API operations.
 * Instead of importing directly from @/api/generated/replacements/replacements, use this adapter.
 * 
 * Usage:
 *   import { updateReplacementStatus, createReplacementInvoice } from '@/api/client/replacements.client';
 */

export {
  listPatientReplacements as listReplacements,
  getReplacement,
  createPatientReplacements as createReplacement,
  createPatientReplacements,
  updateReplacementStatus,
  createReplacementInvoice,
  createReturnInvoiceSendToGib,
  getListPatientReplacementsQueryKey as getListReplacementsQueryKey,
  useListPatientReplacements as useListReplacements,
  useGetReplacement,
  useCreatePatientReplacements as useCreateReplacement,
  useCreatePatientReplacements,
  useUpdateReplacementStatus,
  useCreateReplacementInvoice,
  useCreateReturnInvoiceSendToGib,
} from '@/api/generated/index';

export type { ReplacementCreate, ReplacementStatusUpdate } from '@/api/generated/schemas';
