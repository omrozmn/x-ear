/**
 * AI Client Adapter
 * 
 * Re-exports generated AI clients for use in the application.
 * This adapter layer satisifes the no-restricted-imports rule.
 */

import { apiClient } from '../orval-mutator';
import type { AiActionPlanResponse } from '@/api/generated/schemas';

export * from '../generated/ai-actions/ai-actions';
export * from '../generated/ai-chat/ai-chat';
export * from '../generated/ai-status/ai-status';

/**
 * Get pending actions manually (since generated client misses list endpoint)
 */
export async function getPendingActions(params: {
    tenant_id?: string;
    party_id?: string | null;
    status?: string;
}): Promise<{ actions: AiActionPlanResponse[]; total: number }> {
    const response = await apiClient.get<{ actions: AiActionPlanResponse[]; total: number }>('/api/ai/actions', {
        params,
    });
    return response.data;
}
