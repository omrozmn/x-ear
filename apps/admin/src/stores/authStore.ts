import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { AdminUser } from '@/types';

interface AuthState {
    user: AdminUser | null;
    token: string | null;
    isAuthenticated: boolean;
    _hasHydrated: boolean;
    setAuth: (user: AdminUser, token: string) => void;
    clearAuth: () => void;
    updateUser: (user: Partial<AdminUser>) => void;
    setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            _hasHydrated: false,
            setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
            clearAuth: () => set({ user: null, token: null, isAuthenticated: false }),
            updateUser: (userData) =>
                set((state) => ({
                    user: state.user ? { ...state.user, ...userData } : null,
                })),
            setHasHydrated: (state) => set({ _hasHydrated: state }),
        }),
        {
            name: 'admin-auth-storage', // name of the item in the storage (must be unique)
            storage: createJSONStorage(() => localStorage), // (optional) by default, 'localStorage' is used
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        }
    )
);
