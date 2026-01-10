
import React, { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { LoginForm } from './LoginForm';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { tokenManager } from '../utils/token-manager';

interface AuthProviderProps {
  children: React.ReactNode;
}


export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { isAuthenticated, isLoading, initializeAuth, logout, clearAuth } = useAuthStore();
  const [isInitializing, setIsInitializing] = React.useState(true);

  // Debug logging disabled to reduce console noise
  // console.log('AuthProvider render - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);


  useEffect(() => {
    // Uygulama başlangıcında auth durumunu kontrol et
    const init = async () => {
      await initializeAuth();
      setIsInitializing(false);
    };
    init();
  }, [initializeAuth]);

  // NOTE: Removed aggressive session check here to avoid forcing logout on a single failed /me call
  // The initialization flow (`initializeAuth`) is responsible for restoring auth state and setting `isInitialized`.

  // Only show loading screen during initialization, not during login/forgot-password
  if (isInitializing) {
    // console.log('AuthProvider: Showing loading screen');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // SECURITY FIX: If user is on forgot-password page, force logout and render forgot-password page directly
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  if (currentPath === '/forgot-password') {
    // console.log('AuthProvider: On forgot-password page');
    if (isAuthenticated) {
      // console.log('AuthProvider: User is authenticated, forcing logout for security');
      // Use TokenManager to clear tokens (single source of truth)
      tokenManager.clearTokens();
      clearAuth();
      // Force page reload to ensure clean state
      window.location.reload();
    }
    // Render ForgotPasswordPage directly (no MainLayout)
    // console.log('AuthProvider: Rendering ForgotPasswordPage');
    return <ForgotPasswordPage />;
  }


  if (!isAuthenticated) {
    // console.log('AuthProvider: Showing login form');
    return <LoginForm />;
  }

  // console.log('AuthProvider: Rendering children (MainLayout)');
  return <>{children}</>;
};