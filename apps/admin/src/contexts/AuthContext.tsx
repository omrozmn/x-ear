import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useAdminLogin } from '@/lib/api-client';
import { tokenManager } from '@/lib/api';
import { LoginCredentials, AdminUser as TypeAdminUser } from '@/types';
import toast from 'react-hot-toast';

interface AuthContextType {
    user: TypeAdminUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (credentials: LoginCredentials & { mfa_token?: string }) => Promise<{ user?: TypeAdminUser; token?: string; requires_mfa?: boolean; tokens?: any }>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, token, setAuth, clearAuth, isAuthenticated, _hasHydrated } = useAuthStore();
    const [isLoading, setIsLoading] = useState(true);
    const { mutateAsync: adminLogin } = useAdminLogin();

    useEffect(() => {
        // Wait for store hydration
        if (!_hasHydrated) {
            return;
        }

        // Check if token exists and is valid
        const initAuth = async () => {
            let currentToken = token;

            // Fallback to localStorage if store is empty (e.g. before hydration or if persist failed)
            if (!currentToken) {
                const storedToken = localStorage.getItem('admin_token');
                if (storedToken) {
                    currentToken = storedToken;
                    // We don't have user object here, but we can set token
                    // Ideally we should fetch profile here
                }
            }

            if (currentToken) {
                try {
                    tokenManager.setToken(currentToken);

                    // If we recovered token from localStorage but store was empty, update store
                    if (!token && currentToken) {
                        // We set user to null initially, ideally we should fetch profile here
                        // But this ensures isAuthenticated becomes true
                        setAuth(user || { id: 'rehydrated', email: '', role: 'ADMIN' } as any, currentToken);

                        // Optional: Fetch profile to get real user data
                        // const response = await adminApi.get('/admin/auth/me');
                        // if (response.data.user) setAuth(response.data.user, currentToken);
                    }
                } catch (error) {
                    console.error('Auth recovery error:', error);
                    clearAuth();
                    tokenManager.clearToken();
                }
            }
            setIsLoading(false);
        };

        initAuth();
    }, [token, clearAuth, _hasHydrated]);

    const login = async (credentials: LoginCredentials & { mfa_token?: string }) => {
        try {
            const response = await adminLogin({ data: credentials }) as any;

            console.log('Login response after unwrap:', response);

            // Handle MFA requirement - response is already unwrapped to {token, user, requires_mfa}
            if (response.requires_mfa) {
                return { requires_mfa: true };
            }

            // After envelope unwrapping, response is directly {token, user, requires_mfa}
            if (response.token && response.user) {
                const { token, user } = response;
                setAuth(user as unknown as TypeAdminUser, token);
                tokenManager.setToken(token);
                toast.success('Giriş başarılı');
                return { user: user as unknown as TypeAdminUser, token };
            }

            // Fallback: if response still has nested structure (shouldn't happen after unwrap fix)
            if (response.data && response.data.token && response.data.user) {
                const { token, user } = response.data;
                setAuth(user as unknown as TypeAdminUser, token);
                tokenManager.setToken(token);
                toast.success('Giriş başarılı');
                return { user: user as unknown as TypeAdminUser, token };
            }

            console.error('Unexpected login response format:', response);
            throw new Error('Invalid login response format');
        } catch (error: any) {
            console.error('Login error:', error);
            throw error;
        }
    };

    const logout = () => {
        clearAuth();
        tokenManager.clearToken();
        tokenManager.clearRefreshToken();
        toast.success('Çıkış yapıldı');
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
