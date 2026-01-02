import { subscriptionsGetCurrent } from '@/api/generated';

export type SubscriptionInfo = any;

export const subscriptionService = {
    getCurrentSubscription: async (): Promise<SubscriptionInfo> => {
        const response = await subscriptionsGetCurrent();
        return response as any;
    }
};
