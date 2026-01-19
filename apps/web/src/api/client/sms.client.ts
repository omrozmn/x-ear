/**
 * SMS API Client Adapter
 * 
 * This adapter provides a single point of import for all sms-related API operations.
 * Instead of importing directly from @/api/generated/sms/sms, use this adapter.
 * 
 * Usage:
 *   import { useListSmCredit } from '@/api/client/sms.client';
 */

export {
  useListSmCredit,
  getListSmCreditQueryKey,
  useListSmHeaders,
  getListSmHeadersQueryKey,
  useCreateCommunicationMessageSendSms,
  useListSubscriptionCurrent,
  useListAddons,
} from '@/api/generated/index';

export type { } from '@/api/generated/schemas';
