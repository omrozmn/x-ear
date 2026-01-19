/**
 * Communications API Client Adapter
 * 
 * This adapter provides a single point of import for all communication-related API operations.
 * 
 * Usage:
 *   import { listCommunicationStats } from '@/api/client/communications.client';
 */

export {
  listCommunicationStats,
  listCommunicationMessages,
  listCommunicationTemplates,
  createCommunicationMessageSendSms,
  createCommunicationMessageSendEmail,
  updateCommunicationTemplate,
  createCommunicationTemplates,
  deleteCommunicationTemplate,
  useListCommunicationStats,
  useListCommunicationMessages,
  useListCommunicationTemplates,
  getListCommunicationStatsQueryKey,
  getListCommunicationMessagesQueryKey,
  getListCommunicationTemplatesQueryKey,
} from '@/api/generated/index';

export type { } from '@/api/generated/schemas';
