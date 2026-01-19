/**
 * Payment Integrations API Client Adapter
 * 
 * This adapter provides a single point of import for all payment integration-related API operations.
 * 
 * Usage:
 *   import { useUpdatePaymentPoPaytrConfig } from '@/api/client/payment-integrations.client';
 */

export {
  useUpdatePaymentPoPaytrConfig,
  useListPaymentPoPaytrConfig,
  getListPaymentPoPaytrConfigQueryKey,
} from '@/api/generated/index';

export type { } from '@/api/generated/schemas';
