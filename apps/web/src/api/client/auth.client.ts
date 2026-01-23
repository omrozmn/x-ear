/**
 * Auth API Client Adapter
 * 
 * This adapter provides a single point of import for all auth-related API operations.
 * Instead of importing directly from @/api/generated/auth/auth, use this adapter.
 * 
 * Usage:
 *   import { createAuthLogin } from '@/api/client/auth.client';
 */

export {
  createAuthLogin,
  createAuthLookupPhone,
  createAuthVerifyOtp,
  createAuthResetPassword,
  createAuthForgotPassword,
  createAuthRefresh,
  listAuthMe as getAuthMe,
  createAuthSendVerificationOtp,
  createAuthSetPassword,
  useCreateAuthLogin,
  useCreateAuthLookupPhone,
  useCreateAuthVerifyOtp,
  useCreateAuthResetPassword,
  useCreateAuthForgotPassword,
  useCreateAuthRefresh,
  useListAuthMe as useGetAuthMe,
  useCreateAuthSendVerificationOtp,
  useCreateAuthSetPassword,
} from '@/api/generated/index';

export type {
  LoginRequest,
  LoginResponse,
  LookupPhoneRequest,
  LookupPhoneResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  RefreshTokenResponse,
  AuthUserRead,
  ResponseEnvelopeLoginResponse,
  ResponseEnvelopeVerifyOtpResponse,
  ResponseEnvelopeLookupPhoneResponse,
  ResponseEnvelopeRefreshTokenResponse,
} from '@/api/generated/schemas';
