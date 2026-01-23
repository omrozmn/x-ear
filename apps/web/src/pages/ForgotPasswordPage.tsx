
import { useState } from 'react';
import { Input, Button } from '@x-ear/ui-web';
import { ArrowLeft, Phone, Lock, CheckCircle, Eye, EyeOff, User, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import '../styles/login-animations.css';

type Step = 'identifier' | 'confirmPhone' | 'otp' | 'newPassword' | 'success';

export function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('identifier');

  // State for identifier (username/email/phone)
  const [identifier, setIdentifier] = useState('');

  // State relative to phone number logic
  const [maskedPhone, setMaskedPhone] = useState('');
  const [fullPhone, setFullPhone] = useState(''); // The user must enter this if they used username/email

  // The phone number we will use for actual API calls
  // If user entered phone initially, this is equal to identifier
  // If user entered username, this is equal to fullPhone after confirmation
  const [workingPhone, setWorkingPhone] = useState('');

  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { forgotPassword, verifyResetOtp, resetPassword, lookupPhone } = useAuthStore();

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;

    try {
      setIsLoading(true);
      setError(null);

      const result = await lookupPhone(identifier);

      if (result.isPhoneInput) {
        // Identifier is already a phone number
        setWorkingPhone(identifier); // Use it directly
        // Call forgotPassword to trigger OTP send
        await forgotPassword(identifier);
        setStep('otp');
      } else {
        // Identifier is username/email
        // We need to confirm phone number
        if (result.maskedPhone) {
          setMaskedPhone(result.maskedPhone);
          setStep('confirmPhone');
        } else {
          // Should not happen if lookupPhone succeeds
          throw new Error('Telefon numarası bulunamadı');
        }
      }
    } catch (error: any) {
      setError(error.message || 'Kullanıcı bulunamadı');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullPhone.trim()) return;

    // Validate phone logic if needed (length, etc.) or just let backend decide
    // Just blindly call forgotPassword(fullPhone). Backend will match to user by phone. 
    // If phone matches the user found by phone, OTP sends.
    // NOTE: This assumes phone is unique.

    // We can also do a quick check against masked phone to fail fast on frontend?
    // Masked: ******1234. Input: 05550001234. 
    // Check if input ends with the last 4 digits displayed.
    if (maskedPhone && fullPhone.length > 4) {
      const visibleSuffix = maskedPhone.slice(-4);
      if (!fullPhone.endsWith(visibleSuffix)) {
        setError(`Telefon numarası ${visibleSuffix} ile bitmelidir`);
        return;
      }
    }

    try {
      setIsLoading(true);
      setError(null);
      setWorkingPhone(fullPhone);
      await forgotPassword(fullPhone);
      setStep('otp');
    } catch (error: any) {
      setError(error.message || 'Doğrulama hatası');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;

    try {
      setIsLoading(true);
      setError(null);
      await verifyResetOtp(workingPhone, otp);
      setStep('newPassword');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Doğrulama başarısız');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword.trim() || !confirmPassword.trim()) return;

    if (newPassword !== confirmPassword) {
      setError('Şifreler eşleşmiyor');
      return;
    }

    if (newPassword.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await resetPassword(workingPhone, otp, newPassword);
      setStep('success');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Şifre sıfırlanamadı');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'identifier':
        return (
          <form onSubmit={handleLookup} className="space-y-6">
            <div className="text-center mb-6">
              <User className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Şifremi Unuttum</h2>
              <p className="text-gray-600 text-sm">
                Kullanıcı adı, e-posta veya telefon numaranızı girin
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kullanıcı Bilgisi
              </label>
              <Input
                type="text"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                placeholder="Kullanıcı adı / E-posta / 0555..."
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              disabled={!identifier.trim()}
              loading={isLoading}
              fullWidth
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
            >
              Devam Et
            </Button>
          </form>
        );

      case 'confirmPhone':
        return (
          <form onSubmit={handleConfirmPhone} className="space-y-6">
            <div className="text-center mb-6">
              <ShieldCheck className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Güvenlik Doğrulaması</h2>
              <p className="text-gray-600 text-sm">
                Hesabınızın güvenliği için, {maskedPhone} ile biten telefon numaranızın tamamını giriniz.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefon Numarası
              </label>
              <Input
                type="tel"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                placeholder="0555..."
                value={fullPhone}
                onChange={(e) => {
                  setFullPhone(e.target.value);
                  if (error) setError(null);
                }}
                disabled={isLoading}
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('identifier')}
                className="flex-1 py-3 rounded-xl"
              >
                Geri
              </Button>
              <Button
                type="submit"
                loading={isLoading}
                disabled={!fullPhone.trim()}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg"
              >
                Kod Gönder
              </Button>
            </div>
          </form>
        );

      case 'otp':
        return (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div className="text-center mb-6">
              <Phone className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Doğrulama Kodu</h2>
              <p className="text-gray-600 text-sm">
                {workingPhone} numarasına gönderilen 6 haneli kodu girin
              </p>
            </div>

            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-2">
                Doğrulama Kodu
              </label>
              <Input
                id="otp"
                type="text"
                required
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm text-center text-2xl tracking-widest"
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                disabled={isLoading}
              />
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('identifier')}
                className="flex-1 py-3 rounded-xl"
              >
                Baştan Başla
              </Button>
              <Button
                type="submit"
                loading={isLoading}
                disabled={otp.length !== 6}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg"
              >
                Kodu Doğrula
              </Button>
            </div>
          </form>
        );

      case 'newPassword':
        return (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="text-center mb-6">
              <Lock className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Yeni Şifre</h2>
              <p className="text-gray-600 text-sm">
                Hesabınız için yeni bir şifre belirleyin
              </p>
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Yeni Şifre
              </label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                  placeholder="En az 6 karakter"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Şifre Tekrarı
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                  placeholder="Şifrenizi tekrar girin"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              loading={isLoading}
              disabled={!newPassword.trim() || !confirmPassword.trim()}
              fullWidth
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
            >
              Şifreyi Güncelle
            </Button>
          </form>
        );

      case 'success':
        return (
          <div className="text-center space-y-6">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900">Şifre Başarıyla Güncellendi!</h2>
            <p className="text-gray-600">
              Şifreniz başarıyla güncellendi. Artık yeni şifrenizle giriş yapabilirsiniz.
            </p>
            <a
              href="/"
              className="inline-block w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg text-center"
            >
              Giriş Sayfasına Dön
            </a>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Modern gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"></div>
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 via-transparent to-purple-600/10"></div>

      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
      <div className="absolute top-0 right-0 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-4000"></div>

      {/* Background logo - watermark style */}
      <div className="absolute bottom-10 right-10 opacity-5 pointer-events-none">
        <img src="/logo/transparent.png" alt="" className="h-32 w-auto" />
      </div>

      <div className="relative z-10 max-w-md w-full mx-4">
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8 glass-effect">
          {/* Logo Section */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-6">
              <img
                src="/logo/transparent.png"
                alt="X-EAR Logo"
                className="h-16 w-auto mx-auto drop-shadow-lg"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 mb-6 animate-shake">
              <p className="text-sm text-red-700 text-center font-medium">{error}</p>
            </div>
          )}

          {renderStep()}

          {step !== 'success' && (
            <div className="mt-6 text-center">
              <a
                href="/"
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-800 transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = '/';
                }}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Giriş sayfasına dön
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}