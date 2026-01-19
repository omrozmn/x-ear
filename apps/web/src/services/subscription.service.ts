import { listSubscriptionCurrent } from '@/api/client/subscriptions.client';
import type { CurrentSubscriptionResponse } from '@/api/generated/schemas';

export type SubscriptionInfo = CurrentSubscriptionResponse;

export const subscriptionService = {
    getCurrentSubscription: async (): Promise<SubscriptionInfo> => {
        const response = await listSubscriptionCurrent();
        return response as SubscriptionInfo;
    }
};
