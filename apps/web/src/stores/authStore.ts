import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '../api/client';
import { DEV_CONFIG } from '../config/dev-config';

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

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  initializeAuth: () => Promise<void>;
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

      // Actions
      setAuth: (user: User, token: string) => {
        set({
          user,
          token,
          isAuthenticated: true,
          error: null,
        });

        // Store token in localStorage for persistence
        localStorage.setItem('auth_token', token);
        
        // Set global token for immediate use
        if (typeof window !== 'undefined') {
          window.__AUTH_TOKEN__ = token;
        }
      },

      clearAuth: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          error: null,
        });

        // Clear localStorage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('auth_token_timestamp');
        
        // Clear global token
        if (typeof window !== 'undefined') {
          delete window.__AUTH_TOKEN__;
        }
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      login: async (credentials: LoginCredentials) => {
        const { setLoading, setError } = get();
        
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

              // Store tokens in localStorage for persistence
              localStorage.setItem('auth_token', token);
              if (refreshToken) {
                localStorage.setItem('refresh_token', refreshToken);
              }
              localStorage.setItem('auth_token_timestamp', Date.now().toString());
              
              // Set global token for immediate use
              if (typeof window !== 'undefined') {
                window.__AUTH_TOKEN__ = token;
              }
              
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
            localStorage.setItem('auth_token', newToken);
            
            if (typeof window !== 'undefined') {
              window.__AUTH_TOKEN__ = newToken;
            }
          } else {
            clearAuth();
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
          get().clearAuth();
        }
      },

      initializeAuth: async () => {
        const { setLoading, login, isAuthenticated } = get();
        
        // Prevent multiple initialization calls
        if (isAuthenticated) {
          return;
        }
        
        if (DEV_CONFIG.AUTO_LOGIN_ENABLED) {
          const storedToken = localStorage.getItem('auth_token');
          const storedRefreshToken = localStorage.getItem('refresh_token');
          const tokenTimestamp = localStorage.getItem('auth_token_timestamp');
          
          if (storedToken && tokenTimestamp) {
            const now = Date.now();
            const tokenAge = now - parseInt(tokenTimestamp);
            
            if (tokenAge < DEV_CONFIG.TOKEN_PERSISTENCE_DURATION) {
              // Token is still valid, restore auth state
              try {
                // Try to get user info with stored token
                if (typeof window !== 'undefined') {
                  window.__AUTH_TOKEN__ = storedToken;
                }
                
                // Get current user info from API
                const { usersGetCurrentUser } = await import('../api/generated/xEarCRMAPIAutoGenerated').then(module => module.getXEarCRMAPIAutoGenerated());
                const userResponse = await usersGetCurrentUser();
                
                if (userResponse.status === 200 && userResponse.data) {
                  const userData = userResponse.data;
                  const transformedUser = {
                    id: userData.id || '',
                    email: userData.email || '',
                    name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.username || '',
                    role: userData.role || 'user'
                  };
                  
                  // Set auth state with stored tokens and real user data
                  set({
                    user: transformedUser,
                    token: storedToken,
                    refreshToken: storedRefreshToken,
                    isAuthenticated: true,
                    error: null,
                  });
                  
                  console.log('Auth state restored successfully with user:', transformedUser);
                  return;
                }
              } catch (error) {
                console.warn('Failed to restore auth state, will try auto-login:', error);
                // Clear invalid token
                localStorage.removeItem('auth_token');
                localStorage.removeItem('refresh_token');
                localStorage.removeItem('auth_token_timestamp');
              }
            }
          }
          
          // No valid stored token or restoration failed, try auto-login
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
      }),
    }
  )
);