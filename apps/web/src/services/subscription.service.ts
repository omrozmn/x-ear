import { getCurrent } from '@/api/generated';

export type SubscriptionInfo = any;

export const subscriptionService = {
    getCurrentSubscription: async (): Promise<SubscriptionInfo> => {
        const response = await getCurrent();
        return response as any;
    }
};
