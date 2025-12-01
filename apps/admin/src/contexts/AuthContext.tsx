import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { adminApiInstance as adminApi, tokenManager } from '@/lib/api';
import { LoginCredentials, AdminUser } from '@/types';
import toast from 'react-hot-toast';

interface AuthContextType {
    user: AdminUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (credentials: LoginCredentials & { mfa_token?: string }) => Promise<{ user?: AdminUser; token?: string; requires_mfa?: boolean; tokens?: any }>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, token, setAuth, clearAuth, isAuthenticated, _hasHydrated } = useAuthStore();
    const [isLoading, setIsLoading] = useState(true);

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
            const response = await adminApi.post('/admin/auth/login', credentials);
            const responseData = response.data;

            // Handle different response structures
            const data = responseData.data || responseData;
            const token = responseData.access_token || responseData.token || data.token;
            const refreshToken = responseData.refreshToken || responseData.refresh_token || data.refreshToken || data.refresh_token;
            const user = responseData.data || responseData.user || data.user;

            if (data.requires_mfa) {
                return { requires_mfa: true };
            }

            if (token && user) {
                setAuth(user, token);
                tokenManager.setToken(token);
                if (refreshToken) {
                    tokenManager.setRefreshToken(refreshToken);
                }
                toast.success('Giriş başarılı');
                return { user, token, tokens: { access_token: token, refresh_token: refreshToken } };
            }

            return data;
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
