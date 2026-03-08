import { apiClient, ApiResponse } from './client';

export interface AIOpportunity {
    id: string;
    tenantId: string;
    scope: string;
    category?: string;
    type: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    state: 'NEW' | 'ACKNOWLEDGED' | 'DISMISSED' | 'SIMULATED' | 'APPROVED' | 'EXECUTED' | 'FAILED' | 'EXPIRED';
    title: string;
    explanation?: string[];
    evidence?: Record<string, unknown>;
    confidenceScore: number;
    impactScore: number;
    recommendedCapability?: string;
    recommendedActionLabel?: string;
    actionStatus?: {
        mode: 'SIMULATE' | 'EXECUTE';
        state: string;
        approvalRequired: boolean;
        planId?: string;
    };
    createdAt: string;
    expiresAt?: string;
}

export interface ListOpportunitiesParams {
    state?: string; // Changed from status to state
    category?: string;
    limit?: number;
    offset?: number;
}

class AiApi {
    async listOpportunities(params: ListOpportunitiesParams = {}): Promise<ApiResponse<AIOpportunity[]>> {
        const searchParams = new URLSearchParams();
        if (params.state) searchParams.append('status', params.state); // API still uses 'status' query param
        if (params.category) searchParams.append('category', params.category);
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.offset) searchParams.append('offset', params.offset.toString());

        const queryString = searchParams.toString();
        const endpoint = `/api/ai/opportunities${queryString ? `?${queryString}` : ''}`;

        return apiClient.request<AIOpportunity[]>(endpoint);
    }

    async getOpportunity(id: string): Promise<ApiResponse<AIOpportunity>> {
        return apiClient.request<AIOpportunity>(`/api/ai/opportunities/${id}`);
    }

    async updateOpportunityState(id: string, newState: string): Promise<ApiResponse<AIOpportunity>> {
        return apiClient.request<AIOpportunity>(`/api/ai/opportunities/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: newState }), // Payload uses 'status' because of Pydantic alias populate_by_name
        });
    }

    async simulateAction(id: string): Promise<ApiResponse<Record<string, unknown>>> {
        return apiClient.request<Record<string, unknown>>(`/api/ai/opportunities/${id}/simulate`, {
            method: 'POST',
        });
    }
}

export const aiApi = new AiApi();
