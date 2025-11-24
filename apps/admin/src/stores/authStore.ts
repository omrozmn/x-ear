import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AdminUser } from '@/types';

interface AuthState {
    user: AdminUser | null;
    token: string | null;
    isAuthenticated: boolean;
    setAuth: (user: AdminUser, token: string) => void;
    clearAuth: () => void;
    updateUser: (user: Partial<AdminUser>) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
            clearAuth: () => set({ user: null, token: null, isAuthenticated: false }),
            updateUser: (userData) =>
                set((state) => ({
                    user: state.user ? { ...state.user, ...userData } : null,
                })),
        }),
        {
            name: 'admin-auth-storage',
        }
    )
);
