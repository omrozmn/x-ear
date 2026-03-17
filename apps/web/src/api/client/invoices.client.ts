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
  listIncomingInvoices,
  useListIncomingInvoices,
  listOutgoingInvoices,
  useListOutgoingInvoices,
  getInvoiceSummary,
  useGetInvoiceSummary,
  createInvoiceIssue,
  listAdminInvoices,
  getInvoiceDocument as listInvoicePdf,
} from '@/api/generated/index';

export type { InvoiceCreate, InvoiceUpdate, IncomingInvoiceResponse, OutgoingInvoiceResponse, SchemasInvoicesNewInvoiceStatus } from '@/api/generated/schemas';
