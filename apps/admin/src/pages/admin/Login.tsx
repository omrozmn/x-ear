import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye as EyeIcon, EyeOff as EyeSlashIcon, Lock, Mail, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { adminApi, tokenManager } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';
import { useAuth } from '@/contexts/AuthContext';
import type { LoginCredentials } from '@/types';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  mfa_token: z.string().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

const Login: React.FC = () => {
  const { login, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    clearErrors,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Redirect if already authenticated
  if (isAuthenticated) {
    const from = (location.state as any)?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    clearErrors();

    try {
      const result = await login(data);

      if (result.requires_mfa) {
        setRequiresMFA(true);
        toast.success('Please enter your MFA code');
      } else if (result.tokens) {
        // Login successful, redirect will happen automatically
        // const from = (location.state as any)?.from?.pathname || '/dashboard';
        window.location.href = '/'; // Redirect to dashboard/home
      }
    } catch (error: any) {
      const apiError = error.response?.data?.error;

      if (apiError?.fields) {
        // Handle field-specific errors
        Object.entries(apiError.fields).forEach(([field, message]) => {
          setError(field as keyof LoginFormData, {
            type: 'server',
            message: message as string,
          });
        });
      } else {
        // Handle general errors
        toast.error(apiError?.message || 'Login failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="loading-spinner-lg"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-primary-100">
            <svg
              className="h-8 w-8 text-primary-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            X-Ear Admin Panel
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your admin account
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className={errors.email ? 'input-error' : 'input'}
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={errors.password ? 'input-error pr-10' : 'input pr-10'}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                  ) : (
                    <EyeIcon className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
              )}
            </div>

            {requiresMFA && (
              <div className="animate-slide-in">
                <label htmlFor="mfa_token" className="label">
                  MFA Code
                </label>
                <input
                  {...register('mfa_token')}
                  type="text"
                  autoComplete="one-time-code"
                  className={errors.mfa_token ? 'input-error' : 'input'}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                />
                {errors.mfa_token && (
                  <p className="mt-1 text-sm text-red-600">{errors.mfa_token.message}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="loading-spinner mr-2"></div>
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Need help?{' '}
              <a
                href="mailto:support@x-ear.com"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Contact support
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;