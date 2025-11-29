import { create } from 'zustand';
import axios from 'axios';
import { persist } from 'zustand/middleware';
import { apiClient } from '../api/client';
import { AUTH_TOKEN, REFRESH_TOKEN } from '../constants/storage-keys';
import { DEV_CONFIG } from '../config/dev-config';
import { subscriptionService } from '../services/subscription.service';

// Extend Window interface to include __AUTH_TOKEN__
declare global {
  interface Window {
    __AUTH_TOKEN__?: string;
  }
}

interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
}

interface SubscriptionStatus {
  is_expired: boolean;
  days_remaining: number;
  plan_name: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  subscription: SubscriptionStatus | null;
}

interface AuthActions {
  setAuth: (user: User, token: string) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  checkSubscription: () => Promise<void>;
}

interface LoginCredentials {
  username: string;
  password: string;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      subscription: null,

      // Actions
      setAuth: (user: User, token: string) => {
        set({
          user,
          token,
          isAuthenticated: true,
          error: null,
        });

        // Store token in both legacy and new storage keys for persistence
        try {
          localStorage.setItem('auth_token', token);
          localStorage.setItem(AUTH_TOKEN, token);
        } catch (e) {
          // ignore storage errors
        }

        // Set global token for immediate use
        if (typeof window !== 'undefined') {
          window.__AUTH_TOKEN__ = token;
        }

        // Ensure global axios will send Authorization header for generated clients
        try {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } catch (e) {}

        // Check subscription after auth set
        get().checkSubscription();
      },

      setUser: (user: User) => {
        set({ user });
      },

      clearAuth: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
          subscription: null,
        });

        // Clear localStorage (both legacy and new keys)
        try {
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('auth_token_timestamp');
          localStorage.removeItem(AUTH_TOKEN);
          localStorage.removeItem(REFRESH_TOKEN);
        } catch (e) {
          // ignore storage errors
        }

        // Clear global token
        if (typeof window !== 'undefined') {
          delete window.__AUTH_TOKEN__;
        }

        // Remove global axios Authorization header
        try {
          delete axios.defaults.headers.common['Authorization'];
        } catch (e) {}
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      checkSubscription: async () => {
        try {
          const subInfo = await subscriptionService.getCurrentSubscription();
          if (subInfo) {
            set({
              subscription: {
                is_expired: subInfo.is_expired,
                days_remaining: subInfo.days_remaining,
                plan_name: subInfo.plan?.name || 'Unknown'
              }
            });
          }
        } catch (error) {
          console.error('Failed to check subscription:', error);
        }
      },

      login: async (credentials: LoginCredentials) => {
        const { setLoading, setError, checkSubscription } = get();

        try {
          setLoading(true);
          setError(null);

          console.log('Attempting login with credentials:', { username: credentials.username, password: '***' }); // Debug log

          const response = await apiClient.login(credentials);

          console.log('Login response:', response); // Debug log
          console.log('Response status:', response.status); // Debug log
          console.log('Response data:', response.data); // Debug log

          if (response.status === 200 && response.data) {
            // response.data is the backend response: { access_token, data: user, success, requestId, timestamp }
            const responseData = response.data;
            const { access_token: token, data: userData, success, refreshToken } = responseData;

            console.log('Parsed token:', token); // Debug log
            console.log('Parsed userData:', userData); // Debug log
            console.log('Success:', success); // Debug log
            console.log('RefreshToken:', refreshToken); // Debug log
            console.log('Full response data:', responseData); // Debug log

            if (success && token && userData) {
              // Transform user data to match expected format
              const transformedUser = {
                id: userData.id,
                email: userData.email,
                name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.username,
                role: userData.role
              };

              // Store tokens (now includes refresh token from backend)
              set({
                user: transformedUser,
                token,
                refreshToken: refreshToken || null,
                isAuthenticated: true,
                error: null,
              });

              // Persist tokens under both legacy and new keys
              try {
                localStorage.setItem('auth_token', token);
                localStorage.setItem(AUTH_TOKEN, token);
                if (refreshToken) {
                  localStorage.setItem('refresh_token', refreshToken);
                  localStorage.setItem(REFRESH_TOKEN, refreshToken);
                }
                localStorage.setItem('auth_token_timestamp', Date.now().toString());
              } catch (e) {
                // ignore storage errors
              }

              // Set global token for immediate use
              if (typeof window !== 'undefined') {
                window.__AUTH_TOKEN__ = token;
              }

              // Ensure global axios will send Authorization header for generated clients
              try {
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
              } catch (e) {}

              // Check subscription
              await checkSubscription();

              console.log('Login successful, user authenticated'); // Debug log
            } else {
              console.error('Missing required fields:', { success, token: !!token, userData: !!userData });
              throw new Error('Invalid response from server - missing token or user');
            }
          } else if (response.status === 401) {
            // Handle authentication error
            const errorMessage = (response.data as any)?.error || 'Invalid credentials';
            console.error('Authentication failed:', errorMessage);
            throw new Error(errorMessage);
          } else {
            console.error('Invalid response structure:', { status: response.status, hasData: !!response.data });
            throw new Error('Invalid response from server');
          }
        } catch (error) {
          console.error('Login error:', error);
          setError(error instanceof Error ? error.message : 'Login failed');
        } finally {
          setLoading(false);
        }
      },

      logout: () => {
        get().clearAuth();
      },

      refreshAuth: async () => {
        try {
          const { refreshToken, clearAuth } = get();

          if (!refreshToken) {
            clearAuth();
            return;
          }

          const response = await apiClient.refreshToken();
          if (response.status === 200 && response.data) {
            // Backend should return { access_token, data: user } format
            const { access_token: newToken } = response.data;
            set({ token: newToken });
            try {
              localStorage.setItem('auth_token', newToken);
              localStorage.setItem(AUTH_TOKEN, newToken);
            } catch (e) {}
            if (typeof window !== 'undefined') {
              window.__AUTH_TOKEN__ = newToken;
            }
            // Update global axios header after refresh
            try {
              axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            } catch (e) {}
          } else {
            clearAuth();
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
          get().clearAuth();
        }
      },

      initializeAuth: async () => {
        const { setLoading, login, isAuthenticated, checkSubscription } = get();

        // Prevent multiple initialization calls
        if (isAuthenticated) {
          checkSubscription();
          return;
        }

        // Try to restore auth from persisted tokens (always)
        const storedToken = localStorage.getItem('auth_token');
        const storedRefreshToken = localStorage.getItem('refresh_token');
        const tokenTimestamp = localStorage.getItem('auth_token_timestamp');

        if (storedToken && tokenTimestamp) {
          try {
            const now = Date.now();
            const tokenAge = now - parseInt(tokenTimestamp);

            if (tokenAge < DEV_CONFIG.TOKEN_PERSISTENCE_DURATION) {
              // Token is still valid, restore auth state
              if (typeof window !== 'undefined') {
                window.__AUTH_TOKEN__ = storedToken;
              }

              // Get current user info from API
              try {
                const { usersGetCurrentUser } = await import('../api/generated/xEarCRMAPIAutoGenerated');
                const userResponse = await usersGetCurrentUser();

                if (userResponse.status === 200 && userResponse.data) {
                  const userData = userResponse.data;
                  const transformedUser = {
                    id: userData.id || '',
                    email: userData.email || '',
                    name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.username || '',
                    role: userData.role || 'user'
                  };

                  set({
                    user: transformedUser,
                    token: storedToken,
                    refreshToken: storedRefreshToken,
                    isAuthenticated: true,
                    error: null,
                  });

                  await checkSubscription();
                  console.log('Auth state restored successfully with user:', transformedUser);
                  return;
                }
              } catch (err) {
                console.warn('Failed to fetch current user during restore:', err);
                // If fetch fails, clear persisted tokens
                localStorage.removeItem('auth_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('auth_token_timestamp');
              }
            }
          } catch (error) {
            console.warn('Failed to restore auth state:', error);
            localStorage.removeItem('auth_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('auth_token_timestamp');
          }
        }

        // If restoration failed and auto-login is enabled in dev, try auto-login
        if (DEV_CONFIG.AUTO_LOGIN_ENABLED) {
          try {
            setLoading(true);
            await login(DEV_CONFIG.DEFAULT_CREDENTIALS);
          } catch (error) {
            console.warn('Auto-login failed:', error);
          } finally {
            setLoading(false);
          }
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        subscription: state.subscription,
      }),
    }
  )
);