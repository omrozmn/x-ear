import { apiClient } from './apiClient';

export interface SubscriptionInfo {
    tenant: any;
    plan: any;
    is_expired: boolean;
    days_remaining: number;
}

export const subscriptionService = {
    getCurrentSubscription: async (): Promise<SubscriptionInfo> => {
        const response = await apiClient.get<any>('/subscriptions/current');
        return response.data.data;
    }
};
