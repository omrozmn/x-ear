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
  useCreatePaymentPoPaytrInitiate,
  useCreatePoCommissionInstallmentOptions,
  createPaymentRecords,
} from '@/api/generated/index';

export type { } from '@/api/generated/schemas';
