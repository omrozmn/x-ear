/**
 * Payments API Client Adapter
 * 
 * This adapter provides a single point of import for all payments-related API operations.
 * Instead of importing directly from @/api/generated/payments/payments, use this adapter.
 * 
 * Usage:
 *   import { useCreatePaymentPoPaytrInitiate } from '@/api/client/payments.client';
 */

export {
  createPaymentRecords,
  getListPartyPaymentRecordsQueryKey,
  getListSalePromissoryNotesQueryKey,
  useCreatePaymentRecords,
  useListPartyPaymentRecords,
  useListSalePromissoryNotes,
} from '../generated/payments/payments';

export {
  useCreatePaymentPoPaytrInitiate,
} from '../generated/payment-integrations/payment-integrations';

export {
  useCreatePoCommissionInstallmentOptions,
} from '../generated/pos-commission/pos-commission';
