/**
 * SGK API Client Adapter
 * 
 * This adapter provides a single point of import for all SGK-related API operations.
 * Instead of importing directly from @/api/generated/sgk/sgk, use this adapter.
 * 
 * Usage:
 *   import { getSgkWorkflow, listSgkEReceiptDownloadPatientForm } from '@/api/client/sgk.client';
 */

export {
  getSgkWorkflow,
  listSgkEReceiptDownloadPatientForm,
  listSgkDocuments,
  createSgkDocuments,
  deleteSgkDocument,
  createSgkWorkflowCreate,
  updateSgkWorkflowStatus,
  getListSgkDocumentsQueryKey,
  useGetSgkWorkflow,
  useListSgkEReceiptDownloadPatientForm,
  useListSgkDocuments,
  useCreateSgkDocuments,
  useDeleteSgkDocument,
} from '@/api/generated/index';

export type { UploadSGKDocumentRequest } from '@/api/generated/schemas';
