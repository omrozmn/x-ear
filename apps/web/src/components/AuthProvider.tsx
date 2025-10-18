import React, { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { LoginForm } from './LoginForm';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { isAuthenticated, isLoading, initializeAuth } = useAuthStore();

  console.log('AuthProvider render - isAuthenticated:', isAuthenticated, 'isLoading:', isLoading);

  useEffect(() => {
    // Uygulama başlangıcında auth durumunu kontrol et
    initializeAuth();
  }, []); // Empty dependency array to run only once on mount

  if (isLoading) {
    console.log('AuthProvider: Showing loading screen');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    console.log('AuthProvider: Showing login form');
    return <LoginForm />;
  }

  console.log('AuthProvider: Rendering children (MainLayout)');
  return <>{children}</>;
};