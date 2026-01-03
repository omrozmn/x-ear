import { create } from 'zustand';
import { apiClient } from '../api/orval-mutator';
import { persist } from 'zustand/middleware';
import {
  authRefresh,
  authVerifyOtp,
  authSendVerificationOtp,
  authForgotPassword
} from '@/api/generated/auth/auth';
import { adminAdminLogin } from '@/api/generated/admin/admin';
import { DEV_CONFIG } from '../config/dev-config';
import { subscriptionService } from '../services/subscription.service';
import { tokenManager } from '../utils/token-manager';

// Manual auth functions not in generated API
const authLookupPhone = async (data: { identifier: string }) => {
  return apiClient({
    url: '/api/auth/lookup-phone',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data
  });
};

const authResetPassword = async (data: { identifier: string; otp: string; newPassword: string }) => {
  return apiClient({
    url: '/api/auth/reset-password',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    data
  });
};

// Extend Window interface to include __AUTH_TOKEN__
declare global {
  interface Window {
    __AUTH_TOKEN__?: string;
  }
}

interface User {
  id: string;
  username?: string;
  email: string;
  name: string;
  role?: string;
  phone?: string;
  isPhoneVerified?: boolean;
  isImpersonating?: boolean;
  realUserEmail?: string;
  // Tenant impersonation
  effectiveTenantId?: string;
  tenantName?: string;
  isImpersonatingTenant?: boolean;
}

interface SubscriptionStatus {
  isExpired: boolean;
  daysRemaining: number;
  planName: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  subscription: SubscriptionStatus | null;
  requiresOtp: boolean;
  requiresPhone: boolean;
  maskedPhone: string | null;
}

interface AuthActions {
  setAuth: (user: User, token: string, refreshToken?: string | null) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  login: (credentials: LoginCredentials) => Promise<void>;
  verifyOtp: (otp: string) => Promise<void>;
  sendOtp: (phone: string) => Promise<void>;
  forgotPassword: (phone: string) => Promise<void>;
  verifyResetOtp: (phone: string, otp: string) => Promise<void>;
  resetPassword: (phone: string, otp: string, newPassword: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  initializeAuth: () => Promise<void>;
  checkSubscription: () => Promise<void>;
  lookupPhone: (identifier: string) => Promise<{ maskedPhone?: string; isPhoneInput: boolean }>;
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
      isInitialized: false,
      error: null,
      subscription: null,
      requiresOtp: false,
      requiresPhone: false,
      maskedPhone: null,

      // Actions
      setAuth: (user: User, token: string, refreshToken?: string | null) => {
        set({
          user,
          token,
          refreshToken: refreshToken || get().refreshToken, // Keep existing if not provided
          isAuthenticated: true,
          error: null,
        });

        // Use TokenManager for token storage (single source of truth)
        tokenManager.setTokens(token, refreshToken);

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
          isInitialized: true,
          error: null,
          subscription: null,
        });

        // Use TokenManager to clear all tokens (single source of truth)
        tokenManager.clearTokens();

        // Clear tenant ID separately (not managed by TokenManager)
        try {
          localStorage.removeItem('current_tenant_id');
        } catch (e) {
          // ignore storage errors
        }
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
                isExpired: Boolean(subInfo.isExpired),
                daysRemaining: subInfo.daysRemaining ?? 0,
                planName: subInfo.plan?.name || 'Unknown'
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

          // Use admin login endpoint for admin panel
          const response = await adminAdminLogin({ email: credentials.username, password: credentials.password });

          // customInstance extracts axios response.data, which contains our backend response
          const responseData = response as any;

          // Backend response: { success, data: { token, user, requires_mfa, refreshToken } }
          if (responseData && responseData.success && responseData.data) {
            const { token, user: userData, requires_mfa, refreshToken } = responseData.data;

            if (requires_mfa) {
              // Handle MFA requirement
              set({ requiresOtp: true, isLoading: false });
              return;
            }

            if (token && userData) {
              const user: User = {
                id: userData.id,
                email: userData.email,
                name: userData.first_name && userData.last_name
                  ? `${userData.first_name} ${userData.last_name}`.trim()
                  : userData.email,
                role: userData.role || 'user',
                phone: undefined, // Admin users don't have phone
                isPhoneVerified: true // Admin users are always verified
              };

              // Check if tenant has changed (extract from JWT token)
              const previousTenantId = localStorage.getItem('current_tenant_id');
              const newToken = token;
              let newTenantId: string | null = null;

              try {
                // Decode JWT to get tenant_id (simple base64 decode, no verification needed here)
                const payload = JSON.parse(atob(newToken.split('.')[1]));
                newTenantId = payload.tenant_id || null;

                // If tenant changed, clear IndexedDB to prevent data leakage
                if (previousTenantId && newTenantId && previousTenantId !== newTenantId) {
                  console.log('Tenant changed, clearing IndexedDB:', previousTenantId, '->', newTenantId);
                  try {
                    const { indexedDBManager } = await import('../utils/indexeddb');
                    await indexedDBManager.clearAll();
                  } catch (error) {
                    console.error('Failed to clear IndexedDB on tenant change:', error);
                  }
                }

                // Store new tenant ID
                if (newTenantId) {
                  localStorage.setItem('current_tenant_id', newTenantId);
                }
              } catch (error) {
                console.error('Failed to decode JWT or clear IndexedDB:', error);
              }

              // Store tokens
              set({
                user,
                token: newToken,
                refreshToken: refreshToken || null, // Store refresh token if provided
                isAuthenticated: true,
                error: null,
                requiresOtp: false,
                requiresPhone: false,
                maskedPhone: null,
              });

              // DEBUG LOG
              console.log('[authStore] Login successful, storing tokens via TokenManager:', {
                hasAccessToken: !!newToken,
                hasRefreshToken: !!refreshToken,
                accessTokenPreview: newToken.substring(0, 50) + '...',
                refreshTokenPreview: refreshToken ? refreshToken.substring(0, 50) + '...' : 'N/A',
                user: {
                  id: user.id,
                  email: user.email,
                  role: user.role
                }
              });

              // Use TokenManager for token storage (single source of truth)
              tokenManager.setTokens(newToken, refreshToken || null);

              // Check subscription
              await checkSubscription();

              // Trigger lazy services that need auth (don't await, fire-and-forget)
              try {
                const { appointmentService } = await import('../services/appointment.service');
                appointmentService.triggerServerSync();
              } catch (e) { /* ignore */ }
            } else {
              console.error('Missing required fields:', {
                success: responseData?.success,
                token: !!token,
                userData: !!userData
              });
              throw new Error('Sunucudan geçersiz yanıt alındı - eksik token veya kullanıcı bilgisi');
            }
          } else {
            console.error('Invalid response structure:', { responseData });
            throw new Error('Sunucudan geçersiz yanıt alındı');
          }
        } catch (error: any) {
          console.log('=== LOGIN ERROR ===');
          console.error('Login error:', error);

          let errorMessage = 'Giriş başarısız. Lütfen bilgilerinizi kontrol edin.';

          if (error.response?.status === 401) {
            errorMessage = 'Geçersiz kullanıcı adı veya şifre';
          } else if (error.response?.status === 403) {
            errorMessage = 'Bu hesap engellenmiş. Lütfen yönetici ile iletişime geçin.';
          } else if (error.response?.status === 500) {
            errorMessage = 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.';
          } else if (error.response?.data?.error) {
            errorMessage = error.response.data.error;
          } else if (error.response?.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error.message && !error.message.includes('status code') && !error.message.includes('Network')) {
            errorMessage = error.message;
          } else if (error.code === 'ERR_NETWORK' || error.message?.includes('Network')) {
            errorMessage = 'Bağlantı hatası. İnternet bağlantınızı kontrol edin.';
          }

          console.log('Setting error message:', errorMessage);

          // Reset authentication state on error AND preserve error message
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            requiresOtp: false,
            requiresPhone: false,
            maskedPhone: null,
            error: errorMessage, // Preserve error message
          });

          throw error; // Re-throw so UI can handle it
        } finally {
          setLoading(false);
        }
      },

      verifyOtp: async (otp: string) => {
        const { token, setLoading, setError, checkSubscription } = get();
        // We might be logged in but unverified, so we have a token.
        // Or we might be in a pre-auth state (legacy).
        // With the new flow, we are logged in, so we have a token.

        if (!token) {
          setError('Oturum süresi doldu, lütfen tekrar giriş yapın');
          return;
        }

        try {
          setLoading(true);
          setError(null);

          // Use Orval-generated function
          const data = await authVerifyOtp({ otp }) as any;

          if (data?.success) {
            const { access_token: newToken, refreshToken, data: userData } = data;

            // Update user with verified status
            const user: User = {
              id: userData.id,
              username: userData.username,
              email: userData.email,
              name: userData.fullName || userData.firstName || userData.username,
              role: userData.role || 'user',
              phone: userData.phone,
              isPhoneVerified: true // Explicitly set to true
            };

            set({
              user,
              token: newToken,
              refreshToken: refreshToken || null,
              isAuthenticated: true,
              error: null,
              requiresOtp: false,
              requiresPhone: false,
              maskedPhone: null
            });

            // Use TokenManager for token storage (single source of truth)
            tokenManager.setTokens(newToken, refreshToken || null);

            await checkSubscription();
          } else {
            setError('Doğrulama başarısız');
          }
        } catch (error: any) {
          console.error('OTP Verification error:', error);
          setError(error.response?.data?.message || error.message || 'Doğrulama başarısız');
          throw error;
        } finally {
          setLoading(false);
        }
      },

      sendOtp: async (phone: string) => {
        const { token, setLoading, setError } = get();
        if (!token) {
          setError('Oturum süresi doldu, lütfen tekrar giriş yapın');
          return;
        }

        try {
          setLoading(true);
          setError(null);

          await authSendVerificationOtp({ phone });

          // If success, we might want to update state to show OTP input if it wasn't shown
          // But usually we just show a success message
          // If phone was required, now it's sent, so we can hide phone input? 
          // Or just keep it.

        } catch (error: any) {
          console.error('Send OTP error:', error);
          setError(error.response?.data?.error || error.message || 'OTP gönderilemedi');
          throw error;
        } finally {
          setLoading(false);
        }
      },

      forgotPassword: async (phone: string) => {
        const { setLoading, setError } = get();

        try {
          setLoading(true);
          setError(null);

          console.log('=== FORGOT PASSWORD DEBUG ===');
          console.log('Phone:', phone);
          console.log('Making request to:', '/api/auth/forgot-password');

          const data = await authForgotPassword({
            identifier: phone,
            captcha_token: 'dummy' // TODO: Implement proper captcha
          }) as any;

          console.log('Response received:', data);

          if (data?.success) {
            // OTP sent successfully - no error, function completes successfully
            console.log('OTP sent successfully');
          } else {
            console.log('Response not successful, throwing error');
            throw new Error(data?.error || 'OTP gönderilemedi');
          }
        } catch (error: any) {
          console.log('=== FORGOT PASSWORD ERROR ===');
          console.error('Forgot password error:', error);
          console.error('Error response:', error.response);
          console.error('Error status:', error.response?.status);
          console.error('Error data:', error.response?.data);

          let errorMessage = 'OTP gönderilemedi';

          if (error.response?.status === 404) {
            errorMessage = 'Bu telefon numarasına kayıtlı kullanıcı bulunamadı';
            console.log('404 error detected, message:', errorMessage);
          } else if (error.response?.data?.error) {
            // Translate common backend errors
            const backendError = error.response.data.error;
            if (backendError.includes('not found') || backendError.includes('User not found')) {
              errorMessage = 'Bu telefon numarasına kayıtlı kullanıcı bulunamadı';
            } else {
              errorMessage = backendError;
            }
            console.log('Backend error message:', errorMessage);
          } else if (error.message) {
            errorMessage = error.message;
            console.log('Generic error message:', errorMessage);
          }

          console.log('Final error message:', errorMessage);
          setError(errorMessage);
          throw new Error(errorMessage);
        } finally {
          setLoading(false);
        }
      },

      lookupPhone: async (identifier: string) => {
        const { setLoading, setError } = get();
        try {
          setLoading(true);
          setError(null);

          const response = await authLookupPhone({ identifier });

          if (response?.status === 200 && response?.data?.success) {
            return {
              maskedPhone: response.data.masked_phone,
              isPhoneInput: response.data.is_phone_input
            };
          } else {
            throw new Error(response?.data?.error || 'Kullanıcı bulunamadı');
          }
        } catch (error: any) {
          // Handle "not found" explicitly
          if (error.response?.status === 404) {
            const msg = 'Kayıtlı kullanıcı bulunamadı';
            setError(msg);
            throw new Error(msg);
          }
          const msg = error.response?.data?.error || error.message || 'Bir hata oluştu';
          setError(msg);
          throw new Error(msg);
        } finally {
          setLoading(false);
        }
      },


      verifyResetOtp: async (phone: string, otp: string) => {
        const { setLoading, setError } = get();

        try {
          setLoading(true);
          setError(null);

          const data = await authVerifyOtp({
            identifier: phone,
            otp: otp
          }) as any;

          if (data?.success) {
            // OTP verified successfully
          } else {
            throw new Error('Doğrulama başarısız');
          }
        } catch (error: any) {
          console.error('Verify reset OTP error:', error);
          setError(error.response?.data?.message || error.message || 'Doğrulama başarısız');
          throw error;
        } finally {
          setLoading(false);
        }
      },

      resetPassword: async (phone: string, otp: string, newPassword: string) => {
        const { setLoading, setError } = get();

        try {
          setLoading(true);
          setError(null);

          const data = await authResetPassword({
            identifier: phone,
            otp: otp,
            newPassword: newPassword
          }) as any;

          if (data?.success) {
            // Password reset successfully
          } else {
            throw new Error('Şifre sıfırlanamadı');
          }
        } catch (error: any) {
          console.error('Reset password error:', error);
          setError(error.response?.data?.error || error.message || 'Şifre sıfırlanamadı');
          throw error;
        } finally {
          setLoading(false);
        }
      },

      logout: async () => {
        // Clear IndexedDB to prevent tenant data leakage
        try {
          const { indexedDBManager } = await import('../utils/indexeddb');
          await indexedDBManager.clearAll();
          console.log('IndexedDB cleared on logout');
        } catch (error) {
          console.error('Failed to clear IndexedDB on logout:', error);
        }

        get().clearAuth();
      },

      refreshAuth: async () => {
        try {
          const { clearAuth } = get();
          const refreshToken = tokenManager.refreshToken;

          if (!refreshToken) {
            clearAuth();
            return;
          }

          // authRefresh uses refresh token from Authorization header (set by apiClient interceptor)
          const responseData = await authRefresh() as any;
          if (responseData && (responseData.access_token || responseData.accessToken)) {
            // Backend should return { access_token, data: user } format
            const newToken = responseData.access_token || responseData.accessToken;
            set({ token: newToken });
            // Use TokenManager to update access token
            tokenManager.updateAccessToken(newToken);
          } else {
            clearAuth();
          }
        } catch (error) {
          console.error('Token refresh failed:', error);
          get().clearAuth();
        }
      },

      initializeAuth: async () => {
        const { setLoading, login, checkSubscription, clearAuth } = get();

        // Always validate token, don't trust persisted isAuthenticated
        // The persisted state might have isAuthenticated=true but with an expired token

        // Get tokens from TokenManager (single source of truth)
        const storedToken = tokenManager.accessToken;
        const storedRefreshToken = tokenManager.refreshToken;

        console.log('[initializeAuth] TokenManager state:', {
          hasAccessToken: !!storedToken,
          hasRefreshToken: !!storedRefreshToken,
          isExpired: tokenManager.isAccessTokenExpired(),
          ttl: tokenManager.getAccessTokenTTL()
        });

        if (storedToken && !tokenManager.isAccessTokenExpired()) {
          try {
            // Get current user info from API
            const { usersGetCurrentUser } = await import('../api/generated/users/users');
            const response = await usersGetCurrentUser();

            // customInstance returns response.data directly: {success, data: {...}}
            const responseData = response as any;
            console.log('[initializeAuth] API response:', responseData);

            // Extract nested user data
            const userData = responseData?.data || responseData;

            if (userData && (userData.id || userData.email)) {
              // Get impersonation status from TokenManager
              const payload = tokenManager.payload;
              const isImpersonating = payload?.is_impersonating === true;
              const realUserEmail = payload?.real_user_email;

              // Admin users are always phone verified (they don't need phone verification)
              const isAdmin = tokenManager.isAdmin();
              const isPhoneVerified = isAdmin ? true : userData.isPhoneVerified === true;

              const transformedUser: User = {
                id: userData.id || '',
                email: userData.email || '',
                name: `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.fullName || userData.username || '',
                role: userData.role || 'user',
                phone: userData.phone,
                isPhoneVerified,
                isImpersonating,
                realUserEmail,
                // Preserve tenant impersonation details from token
                effectiveTenantId: payload?.effective_tenant_id as string | undefined,
                // If tenant name is in token, use it. Backend doesn't strictly put name in token usually, 
                // but we can try to keep what was persisted if not available, OR rely on what /me returns if updated.
                // However, /me usually returns DB user. 
                // Let's use persisted tenantName if we are impersonating tenant and token confirms it.
                tenantName: (payload?.is_impersonating_tenant ? userData.tenantName : undefined),
                isImpersonatingTenant: payload?.is_impersonating_tenant as boolean | undefined
              };

              // If we are impersonating a tenant, try to restore tenantName from storage if available
              // because token usually stores IDs not names to save space
              if (transformedUser.isImpersonatingTenant) {
                const storedUser = get().user;
                if (storedUser?.tenantName && !transformedUser.tenantName) {
                  transformedUser.tenantName = storedUser.tenantName;
                }
              }

              console.log('[initializeAuth] Transformed user:', transformedUser, { isAdmin });

              set({
                user: transformedUser,
                token: storedToken,
                refreshToken: storedRefreshToken,
                isAuthenticated: true,
                isInitialized: true,
                error: null,
              });

              await checkSubscription();

              // Trigger lazy services that need auth
              try {
                const { appointmentService } = await import('../services/appointment.service');
                appointmentService.triggerServerSync();
              } catch (e) { /* ignore */ }

              console.log('Auth state restored successfully with user:', transformedUser);
              return;
            }
          } catch (err) {
            console.warn('Failed to fetch current user during restore (token likely expired):', err);
            // Token is invalid/expired, clear via TokenManager
            tokenManager.clearTokens();
            localStorage.removeItem('auth-storage'); // Clear Zustand persist storage
            clearAuth();
          }
        } else if (storedToken && tokenManager.isAccessTokenExpired() && storedRefreshToken) {
          // Token expired but we have refresh token - try to refresh
          console.log('[initializeAuth] Token expired, attempting refresh...');
          try {
            await get().refreshAuth();
            // If refresh succeeded, retry initialization
            const newToken = tokenManager.accessToken;
            if (newToken && !tokenManager.isAccessTokenExpired()) {
              return get().initializeAuth();
            }
          } catch (e) {
            console.warn('[initializeAuth] Refresh failed:', e);
            tokenManager.clearTokens();
            clearAuth();
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
        // Mark initialization attempt complete (success or failure)
        try {
          set({ isInitialized: true });
        } catch (e) { }
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
        error: state.error, // Include error in persistence
      }),
    }
  )
);