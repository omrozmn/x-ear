import { customInstance } from '../api/orval-mutator';

export interface SubscriptionInfo {
    tenant: any;
    plan: any;
    is_expired: boolean;
    days_remaining: number;
}

export const subscriptionService = {
    getCurrentSubscription: async (): Promise<SubscriptionInfo> => {
        const response = await customInstance<{ data: SubscriptionInfo }>({
            url: '/api/subscriptions/current',
            method: 'GET',
        });
        return response.data.data;
    }
};
