/**
 * Auth Utilities - Helper functions for getting current user info
 */
import { useAuthStore } from '../stores/authStore';

/**
 * Get current user info for API calls
 * Returns user id, name, and email
 */
export const getCurrentUser = () => {
    const state = useAuthStore.getState();
    const user = state.user;

    if (!user) {
        return {
            userId: 'system',
            userName: 'System',
            userEmail: ''
        };
    }

    return {
        userId: user.id,
        userName: user.name || user.email,
        userEmail: user.email
    };
};

/**
 * Get current user ID for createdBy, assignedBy fields
 */
export const getCurrentUserId = (): string => {
    const state = useAuthStore.getState();
    return state.user?.id || 'system';
};

/**
 * Get current user name for display purposes
 */
export const getCurrentUserName = (): string => {
    const state = useAuthStore.getState();
    const user = state.user;
    return user?.name || user?.email || 'System';
};

/**
 * Hook version for use in React components
 */
export const useCurrentUser = () => {
    const user = useAuthStore((state) => state.user);

    return {
        userId: user?.id || 'system',
        userName: user?.name || user?.email || 'System',
        userEmail: user?.email || '',
        isAuthenticated: !!user
    };
};
