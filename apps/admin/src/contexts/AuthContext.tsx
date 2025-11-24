import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { adminApi, tokenManager } from '@/lib/api';
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
    const { user, token, setAuth, clearAuth, isAuthenticated } = useAuthStore();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check if token exists and is valid
        const initAuth = async () => {
            if (token) {
                try {
                    // Verify token or fetch user profile
                    // const response = await adminApi.get('/admin/profile');
                    // updateUser(response.data.data);
                    tokenManager.setToken(token);
                } catch (error) {
                    clearAuth();
                    tokenManager.clearToken();
                }
            }
            setIsLoading(false);
        };

        initAuth();
    }, [token, clearAuth]);

    const login = async (credentials: LoginCredentials & { mfa_token?: string }) => {
        try {
            const response = await adminApi.post('/admin/auth/login', credentials);
            const data = response.data.data;

            if (data.requires_mfa) {
                return { requires_mfa: true };
            }

            if (data.token && data.user) {
                setAuth(data.user, data.token);
                tokenManager.setToken(data.token);
                toast.success('Login successful');
                return { user: data.user, token: data.token, tokens: { access_token: data.token } };
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
        toast.success('Logged out successfully');
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
