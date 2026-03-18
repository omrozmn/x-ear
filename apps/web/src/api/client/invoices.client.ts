/**
 * Invoices API Client Adapter
 *
 * This adapter provides a single point of import for all invoice-related API operations.
 * Instead of importing directly from @/api/generated/invoices/invoices, use this adapter.
 *
 * Usage:
 *   import { listInvoices, createInvoice } from '@/api/client/invoices.client';
 */

import { useQuery } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';
import { customInstance } from '@/api/orval-mutator';

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
  listAdminInvoices,
} from '@/api/generated/index';

export type { InvoiceCreate, InvoiceUpdate } from '@/api/generated/schemas';

// These types were removed from generated schemas after API regeneration.
// Using `any` as a fallback until the backend re-exposes them.
export type IncomingInvoiceResponse = any;
export type OutgoingInvoiceResponse = any;
export type SchemasInvoicesNewInvoiceStatus = string;

// ─── Stubs for removed endpoints ────────────────────────────────────────────
// The following functions were previously generated but have been removed.
// They are kept here as thin wrappers so existing pages keep compiling.

export function listIncomingInvoices(params?: Record<string, any>, signal?: AbortSignal) {
  return customInstance<any>({
    url: `/api/invoices/incoming`,
    method: 'GET',
    params,
    signal,
  });
}

export function useListIncomingInvoices(params?: Record<string, any>, options?: { query?: Partial<UseQueryOptions<any>> }) {
  return useQuery({
    queryKey: ['/api/invoices/incoming', params],
    queryFn: ({ signal }) => listIncomingInvoices(params, signal),
    ...options?.query,
  });
}

export function listOutgoingInvoices(params?: Record<string, any>, signal?: AbortSignal) {
  return customInstance<any>({
    url: `/api/invoices/outgoing`,
    method: 'GET',
    params,
    signal,
  });
}

export function useListOutgoingInvoices(params?: Record<string, any>, options?: { query?: Partial<UseQueryOptions<any>> }) {
  return useQuery({
    queryKey: ['/api/invoices/outgoing', params],
    queryFn: ({ signal }) => listOutgoingInvoices(params, signal),
    ...options?.query,
  });
}

export function getInvoiceSummary(signal?: AbortSignal) {
  return customInstance<any>({
    url: `/api/invoices/summary`,
    method: 'GET',
    signal,
  });
}

export function useGetInvoiceSummary(options?: { query?: Partial<UseQueryOptions<any>> }) {
  return useQuery({
    queryKey: ['/api/invoices/summary'],
    queryFn: ({ signal }) => getInvoiceSummary(signal),
    ...options?.query,
  });
}

export function getInvoiceDocument(invoiceId: number | string, params?: Record<string, any>, signal?: AbortSignal) {
  return customInstance<any>({
    url: `/api/invoices/${invoiceId}/document`,
    method: 'GET',
    params,
    signal,
  });
}

export { getInvoiceDocument as listInvoicePdf };
