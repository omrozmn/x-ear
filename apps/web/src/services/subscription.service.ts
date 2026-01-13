import { listSubscriptionCurrent } from '@/api/generated';

export type SubscriptionInfo = any;

export const subscriptionService = {
    getCurrentSubscription: async (): Promise<SubscriptionInfo> => {
        const response = await listSubscriptionCurrent();
        return response as any;
    }
};
