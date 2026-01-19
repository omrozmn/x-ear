/**
 * Invoices API Client Adapter
 * 
 * This adapter provides a single point of import for all invoice-related API operations.
 * Instead of importing directly from @/api/generated/invoices/invoices, use this adapter.
 * 
 * Usage:
 *   import { listInvoices, createInvoice } from '@/api/client/invoices.client';
 */

export {
  listInvoices,
  getInvoice,
  createInvoices as createInvoice,
  updateInvoice,
  deleteInvoice,
  createInvoiceSendToGib,
  createInvoiceBulkUpload,
  listInvoiceTemplates,
  createInvoiceTemplates,
  listInvoicePrintQueue,
  createInvoicePrintQueue,
  getListInvoicesQueryKey,
  useListInvoices,
  useGetInvoice,
  useCreateInvoices as useCreateInvoice,
  useUpdateInvoice,
  useDeleteInvoice,
  useCreateInvoiceSendToGib,
  useCreateInvoiceBulkUpload,
  useListInvoiceTemplates,
  useCreateInvoiceTemplates,
  useListInvoicePrintQueue,
  useCreateInvoicePrintQueue,
  createInvoiceIssue,
  listInvoicePdf,
  useCreateInvoiceIssue,
  useListInvoicePdf,
  listAdminInvoices,
  getListAdminInvoicesQueryKey,
  useListAdminInvoices,
} from '@/api/generated/index';

export type { InvoiceCreate, InvoiceUpdate } from '@/api/generated/schemas';
