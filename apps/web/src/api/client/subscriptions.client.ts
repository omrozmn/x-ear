/**
 * Subscriptions API Client Adapter
 * 
 * This adapter provides a single point of import for all subscription-related API operations.
 * Instead of importing directly from @/api/generated/subscriptions/subscriptions, use this adapter.
 * 
 * Usage:
 *   import { listSubscriptionCurrent } from '@/api/client/subscriptions.client';
 */

export {
  listSubscriptionCurrent,
  getListSubscriptionCurrentQueryKey,
  useListSubscriptionCurrent,
  listSubscriptionFeatures,
  getListSubscriptionFeaturesQueryKey,
  useListSubscriptionFeatures,
} from '@/api/generated/index';

export type { } from '@/api/generated/schemas';
