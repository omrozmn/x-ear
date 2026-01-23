import { Button, Input } from '@x-ear/ui-web';
import { useState } from 'react';
import { Eye, EyeOff, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useTheme } from './theme-provider';
import '../styles/login-animations.css';

export function LoginForm() {
  const { setTheme, theme } = useTheme();

  const getInitialCreds = () => {
    const savedCreds = localStorage.getItem('xear_last_login');
    if (savedCreds) {
      try {
        const { username, password } = JSON.parse(savedCreds);
        return {
          username: username || '',
          password: password || '',
        };
      } catch {
        // Ignore parse errors for saved credentials
      }
    }
    return { username: '', password: '' };
  };

  const initialCreds = getInitialCreds();
  const [username, setUsername] = useState(initialCreds.username);
  const [password, setPassword] = useState(initialCreds.password);
  const [showPassword, setShowPassword] = useState(false);

  // OTP state - reserved for future implementation
  // const [otpCode, _setOtpCode] = useState('');
  // const [phoneNumber, _setPhoneNumber] = useState('');

  const { login, isLoading, error, setError } = useAuthStore();

  // Debug: Log error state changes
  console.log('LoginForm error state:', error);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Kullanıcı adı ve şifre gereklidir');
      return;
    }

    // Clear previous error
    setError(null);

    try {
      // Son giriş yapılan credentials'ı localStorage'a kaydet
      localStorage.setItem('xear_last_login', JSON.stringify({ username, password }));
      await login({ username: username.trim(), password });
      // If login successful and no OTP required, redirect
      // If OTP required, state update will trigger re-render showing OTP form
      if (!useAuthStore.getState().requiresOtp) {
        window.location.replace('/');
      }
    } catch (error: unknown) {
      // Error is already set by the store, but ensure it's displayed
      console.error('Login failed:', error);

      // If store didn't set an error, set a generic one
      const currentError = useAuthStore.getState().error;

      if (!currentError) {
        setError('Giriş başarısız oldu. Lütfen tekrar deneyin.');
      }
    }
  };

  // OTP handlers - reserved for future implementation
  /*
  const _handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) return;

    try {
      await verifyOtp(otpCode);
      if (useAuthStore.getState().isAuthenticated) {
        window.location.replace('/');
      }
    } catch (error) {
      console.error('OTP verification failed:', error);
    }
  };

  const _handleSendOtp = async () => {
    if (!phoneNumber.trim()) return;
    try {
      await sendOtp(phoneNumber);
      // Maybe show success toast?
    } catch (error) {
      console.error('Send OTP failed:', error);
    }
  };
  */

  // The conditional rendering for OTP form is removed.
  // The LoginForm will now always render the standard username/password form.
  // OTP handling is expected to be managed globally, e.g., via a modal.

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full w-10 h-10 p-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-gray-200 dark:border-gray-700"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5 text-yellow-500" />
          ) : (
            <Moon className="h-5 w-5 text-gray-700" />
          )}
        </Button>
      </div>

      {/* Modern gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-black opacity-100 dark:opacity-50"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 via-transparent to-purple-600/10 dark:from-blue-900/20 dark:via-transparent dark:to-purple-900/20"></div>

      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-300 dark:bg-blue-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-20 dark:opacity-10 animate-pulse"></div>
      <div className="absolute top-0 right-0 w-72 h-72 bg-purple-300 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-20 dark:opacity-10 animate-pulse animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 dark:bg-pink-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-xl opacity-20 dark:opacity-10 animate-pulse animation-delay-4000"></div>

      {/* Background logo - watermark style */}
      <div className="absolute bottom-10 right-10 opacity-5 pointer-events-none grayscale dark:invert">
        <img src="/logo/transparent.png" alt="" className="h-32 w-auto" />
      </div>

      <div className="relative z-10 max-w-md w-full mx-4">
        <div className="bg-white/80 dark:bg-gray-900/60 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 dark:border-gray-700 p-8 glass-effect">
          {/* Logo Section */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-6">
              <img
                src="/logo/transparent.png"
                alt="X-EAR Logo"
                className="h-20 w-auto mx-auto drop-shadow-lg"
              />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent mb-2">
              X-EAR CRM
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              İşitme Cihazı Hasta Yönetim Sistemi
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Kullanıcı Adı / Telefon / E-posta
                </label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 dark:bg-gray-800/50 dark:text-white backdrop-blur-sm login-form-transition focus-ring-enhanced placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder="Kullanıcı adı, telefon veya e-posta"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError(null);
                  }}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Şifre
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="w-full px-4 py-3 pr-12 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 dark:bg-gray-800/50 dark:text-white backdrop-blur-sm login-form-transition focus-ring-enhanced placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="Şifrenizi girin"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (error) setError(null);
                    }}
                    disabled={isLoading}
                  />
                  <button data-allow-raw="true"
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                    aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 animate-shake">
                <p className="text-sm text-red-700 dark:text-red-300 text-center font-medium">{error}</p>
              </div>
            )}

            <button data-allow-raw="true"
              type="submit"
              disabled={isLoading || !username.trim() || !password.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 dark:from-blue-500 dark:to-purple-500 dark:hover:from-blue-600 dark:hover:to-purple-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg login-button-hover focus-ring-enhanced"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                  Giriş yapılıyor...
                </div>
              ) : (
                'Giriş Yap'
              )}
            </button>

            <div className="text-center">
              <button data-allow-raw="true"
                type="button"
                onClick={() => {
                  // Force logout before going to forgot-password
                  try {
                    const { logout } = useAuthStore.getState();
                    logout();
                    localStorage.clear();
                    sessionStorage.clear();
                    if (typeof window !== 'undefined') {
                      delete window.__AUTH_TOKEN__;
                    }
                  } catch (e) {
                    console.error('Logout failed:', e);
                  }
                  // Navigate to forgot-password
                  window.location.href = '/forgot-password';
                }}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors font-medium"
              >
                Şifremi Unuttum
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}