import { listSubscriptionCurrent } from '@/api/client/subscriptions.client';
import { unwrapObject } from '../utils/response-unwrap';

export interface SubscriptionInfo {
    isExpired?: boolean;
    daysRemaining?: number;
    plan?: {
        name?: string;
    };
}

export const subscriptionService = {
    getCurrentSubscription: async (): Promise<SubscriptionInfo | null> => {
        try {
            const response = await listSubscriptionCurrent();
            return unwrapObject<SubscriptionInfo>(response);
        } catch (error) {
            console.error('Failed to get current subscription:', error);
            return null;
        }
    }
};
