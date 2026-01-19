/**
 * Documents API Client Adapter
 * 
 * This adapter provides a single point of import for all document-related API operations.
 * 
 * Usage:
 *   import { createPatientDocuments } from '@/api/client/documents.client';
 */

export {
  listPatientDocuments,
  createPatientDocuments,
  deletePatientDocument,
  useListPatientDocuments,
  useCreatePatientDocuments,
  useDeletePatientDocument,
  getListPatientDocumentsQueryKey,
} from '@/api/generated/index';

export type { DocumentCreate } from '@/api/generated/schemas';
