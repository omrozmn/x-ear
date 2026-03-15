import React, { createContext, useCallback, useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { useAuthStore } from '@/stores/authStore';
import { useCreateAdminAuthLogin } from '@/lib/api-client';
import { tokenManager, adminApiInstance } from '@/lib/api';
import { AdminRole, LoginCredentials, AdminUser as TypeAdminUser } from '@/types';
import type {
    AdminLoginResponse,
    ResponseEnvelopeAdminLoginResponse,
    ResponseEnvelopeRefreshTokenResponse,
} from '@/api/generated/schemas';
import toast from 'react-hot-toast';

type LoginResult = {
    user?: TypeAdminUser;
    token?: string;
    requires_mfa?: boolean;
    tokens?: {
        token: string;
        refreshToken?: string;
    };
};

export interface AuthContextType {
    user: TypeAdminUser | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (credentials: LoginCredentials & { mfa_token?: string }) => Promise<LoginResult>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function unwrapLoginResponse(
    response: AdminLoginResponse | ResponseEnvelopeAdminLoginResponse | null | undefined
): AdminLoginResponse | null {
    if (!response) {
        return null;
    }

    if ('token' in response && typeof response.token === 'string') {
        return response;
    }

    if ('data' in response && response.data && typeof response.data === 'object' && 'token' in response.data) {
        return response.data;
    }

    return null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, token, setAuth, clearAuth, isAuthenticated, _hasHydrated } = useAuthStore();
    const [isLoading, setIsLoading] = useState(true);
    const { mutateAsync: adminLogin } = useCreateAdminAuthLogin();

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
                        setAuth(user || createRehydratedAdminUser(), currentToken);

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
    }, [token, clearAuth, _hasHydrated, setAuth, user]);

    const logout = useCallback(() => {
        console.warn('[AuthContext] Logout called', new Error().stack);
        clearAuth();
        tokenManager.clearToken();
        tokenManager.clearRefreshToken();
        toast.success('Çıkış yapıldı');
        window.location.replace('/login');
    }, [clearAuth]);

    const silentRefresh = useCallback(async () => {
        const refreshToken = tokenManager.getRefreshToken();
        if (!refreshToken || !isAuthenticated) return;

        try {
            // BUG-010: Silent refresh using the backend refresh endpoint
            // We use adminApiInstance directly to provide the custom Authorization header
            const response = await adminApiInstance.post<ResponseEnvelopeRefreshTokenResponse>('/api/auth/refresh', {}, {
                headers: {
                    'Authorization': `Bearer ${refreshToken}`
                }
            });

            const newToken = response.data?.data?.accessToken;
            if (newToken) {
                if (user) setAuth(user, newToken);
                tokenManager.setToken(newToken);
                console.log('[Auth] Token silently refreshed');
            }
        } catch (error: unknown) {
            console.error('[Auth] Silent refresh failed:', error);
            // If refresh fails with 401/403, our refresh token is likely invalid/expired
            if (isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
                logout();
            }
        }
    }, [isAuthenticated, logout, setAuth, user]);

    useEffect(() => {
        if (isAuthenticated) {
            // Refresh every 30 minutes (access tokens usually last ~8h, but refresh often to be safe)
            const interval = setInterval(silentRefresh, 30 * 60 * 1000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated, silentRefresh]);

    const login = async (credentials: LoginCredentials & { mfa_token?: string }): Promise<LoginResult> => {
        try {
            const response = await adminLogin({ data: credentials });
            const payload = unwrapLoginResponse(response);

            console.log('Login response (unwrapped):', response);

            // Handle MFA requirement
            if (payload?.requires_mfa) {
                return { requires_mfa: true };
            }

            // Response is already unwrapped by mutator: {token, user, refreshToken, requiresMfa}
            if (payload?.token && payload.user) {
                const currentUser = mapAdminUser(payload.user);
                const currentToken = payload.token;
                const refreshToken = payload.refresh_token;

                setAuth(currentUser, currentToken);
                tokenManager.setToken(currentToken);
                if (refreshToken) tokenManager.setRefreshToken(refreshToken);

                toast.success('Giriş başarılı');
                return {
                    user: currentUser,
                    token: currentToken,
                    tokens: { token: currentToken, refreshToken }
                };
            }

            console.error('Unexpected login response format:', response);
            throw new Error('Invalid login response format');
        } catch (error: unknown) {
            console.error('Login error:', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

function createRehydratedAdminUser(): TypeAdminUser {
    const now = new Date().toISOString();
    return {
        id: 'rehydrated',
        email: '',
        role: AdminRole.ADMIN,
        is_active: true,
        created_at: now,
    };
}

function mapAdminUser(user: NonNullable<ResponseEnvelopeAdminLoginResponse['data']>['user']): TypeAdminUser {
    const now = new Date().toISOString();
    return {
        id: typeof user.id === 'string' ? user.id : 'unknown',
        email: typeof user.email === 'string' ? user.email : '',
        first_name: typeof user.first_name === 'string' ? user.first_name : undefined,
        last_name: typeof user.last_name === 'string' ? user.last_name : undefined,
        name: typeof user.name === 'string' ? user.name : undefined,
        role: isAdminRole(user.role) ? user.role : AdminRole.ADMIN,
        is_active: typeof user.is_active === 'boolean' ? user.is_active : true,
        status: user.status === 'active' || user.status === 'inactive' ? user.status : undefined,
        last_login: typeof user.last_login === 'string' ? user.last_login : undefined,
        tenant_id: typeof user.tenant_id === 'string' ? user.tenant_id : undefined,
        created_at: typeof user.created_at === 'string' ? user.created_at : now,
    };
}

function isAdminRole(value: unknown): value is TypeAdminUser['role'] {
    return value === AdminRole.SUPER_ADMIN
        || value === AdminRole.OWNER
        || value === AdminRole.ADMIN
        || value === AdminRole.STAFF
        || value === AdminRole.VIEWER;
}

export { AuthContext };
