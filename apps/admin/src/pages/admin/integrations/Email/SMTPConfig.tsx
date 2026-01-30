import React, { useState, useEffect } from 'react';
import { useGetSMTPConfig, useCreateOrUpdateSMTPConfig, useSendTestEmail } from '@/api/generated/smtp-configuration/smtp-configuration';
import { Input, Button, Card, CardHeader, CardTitle, CardContent, Alert, AlertDescription, Spinner } from '@x-ear/ui-web';
import { EnvelopeIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { z } from 'zod';
import type { SmtpConfigCreate } from '@/api/generated/schemas';
import { EmailIntegrationNav } from '@/components/integrations/EmailIntegrationNav';

// Zod validation schema
const smtpConfigSchema = z.object({
  host: z.string().min(1, 'SMTP sunucusu gerekli').max(255, 'Maksimum 255 karakter'),
  port: z.number().min(1, 'Port 1-65535 arasında olmalı').max(65535, 'Port 1-65535 arasında olmalı'),
  username: z.string().min(1, 'Kullanıcı adı gerekli').max(255, 'Maksimum 255 karakter'),
  password: z.string().min(1, 'Şifre gerekli'),
  fromEmail: z.string().email('Geçerli bir e-posta adresi girin'),
  fromName: z.string().min(1, 'Gönderen adı gerekli').max(255, 'Maksimum 255 karakter'),
  useTls: z.boolean().optional(),
  useSsl: z.boolean().optional(),
  timeout: z.number().min(5, 'Timeout 5-120 saniye arasında olmalı').max(120, 'Timeout 5-120 saniye arasında olmalı').optional(),
});

const SMTPConfig: React.FC = () => {
  const { data: configData, isLoading, refetch } = useGetSMTPConfig();
  const createOrUpdateMutation = useCreateOrUpdateSMTPConfig();
  const sendTestMutation = useSendTestEmail();

  // Form state
  const [formData, setFormData] = useState<SmtpConfigCreate>({
    host: '',
    port: 587,
    username: '',
    password: '',
    fromEmail: '',
    fromName: '',
    useTls: false,
    useSsl: true,
    timeout: 30,
  });

  const [testEmail, setTestEmail] = useState('');
  const [showTestConfirm, setShowTestConfirm] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Load existing config
  useEffect(() => {
    if (configData?.data) {
      const config = configData.data;
      setFormData({
        host: (config.host as string) || '',
        port: (config.port as number) || 587,
        username: (config.username as string) || '',
        password: '', // Never populate password from response
        fromEmail: (config.fromEmail as string) || '',
        fromName: (config.fromName as string) || '',
        useTls: (config.useTls as boolean) ?? false,
        useSsl: (config.useSsl as boolean) ?? true,
        timeout: (config.timeout as number) || 30,
      });
    }
  }, [configData]);

  const handleInputChange = (field: keyof SmtpConfigCreate, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    try {
      smtpConfigSchema.parse(formData);
      setValidationErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) {
            errors[err.path[0] as string] = err.message;
          }
        });
        setValidationErrors(errors);
      }
      return false;
    }
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Lütfen form hatalarını düzeltin');
      return;
    }

    try {
      await createOrUpdateMutation.mutateAsync({ data: formData });
      toast.success('SMTP ayarları başarıyla kaydedildi');
      refetch();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error?.message || 'SMTP ayarları kaydedilemedi';
      toast.error(errorMessage);
      console.error('SMTP config save error:', error);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error('Lütfen test e-posta adresi girin');
      return;
    }

    if (!z.string().email().safeParse(testEmail).success) {
      toast.error('Geçerli bir e-posta adresi girin');
      return;
    }

    try {
      await sendTestMutation.mutateAsync({ data: { recipient: testEmail } });
      toast.success('Test e-postası gönderildi');
      setShowTestConfirm(false);
      setTestEmail('');
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error?.message || 'Test e-postası gönderilemedi';
      toast.error(errorMessage);
      console.error('Test email error:', error);
    }
  };

  const handleReset = () => {
    if (configData?.data) {
      const config = configData.data;
      setFormData({
        host: (config.host as string) || '',
        port: (config.port as number) || 587,
        username: (config.username as string) || '',
        password: '',
        fromEmail: (config.fromEmail as string) || '',
        fromName: (config.fromName as string) || '',
        useTls: (config.useTls as boolean) ?? false,
        useSsl: (config.useSsl as boolean) ?? true,
        timeout: (config.timeout as number) || 30,
      });
    } else {
      setFormData({
        host: '',
        port: 587,
        username: '',
        password: '',
        fromEmail: '',
        fromName: '',
        useTls: false,
        useSsl: true,
        timeout: 30,
      });
    }
    setValidationErrors({});
  };

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div data-testid="spinner">
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <EnvelopeIcon className="h-7 w-7 mr-2 text-primary-600" />
          E-posta Entegrasyonu
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          E-posta gönderimi için SMTP sunucu yapılandırması
        </p>
      </div>

      <EmailIntegrationNav />
      {/* Configuration Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>SMTP Sunucu Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Host */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SMTP Sunucusu <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.host}
                onChange={(e) => handleInputChange('host', e.target.value)}
                placeholder="mail.example.com"
                className={validationErrors.host ? 'border-red-500' : ''}
              />
              {validationErrors.host && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.host}</p>
              )}
            </div>

            {/* Port and Timeout */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Port <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  value={formData.port}
                  onChange={(e) => handleInputChange('port', parseInt(e.target.value) || 0)}
                  placeholder="587"
                  className={validationErrors.port ? 'border-red-500' : ''}
                />
                {validationErrors.port && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.port}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timeout (saniye)
                </label>
                <Input
                  type="number"
                  value={formData.timeout || 30}
                  onChange={(e) => handleInputChange('timeout', parseInt(e.target.value) || 30)}
                  placeholder="30"
                  className={validationErrors.timeout ? 'border-red-500' : ''}
                />
                {validationErrors.timeout && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.timeout}</p>
                )}
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kullanıcı Adı <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                placeholder="user@example.com"
                className={validationErrors.username ? 'border-red-500' : ''}
              />
              {validationErrors.username && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.username}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Şifre <span className="text-red-500">*</span>
              </label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="••••••••"
                className={validationErrors.password ? 'border-red-500' : ''}
              />
              {validationErrors.password && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Şifre güvenli bir şekilde şifrelenerek saklanır
              </p>
            </div>

            {/* From Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gönderen E-posta <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                value={formData.fromEmail}
                onChange={(e) => handleInputChange('fromEmail', e.target.value)}
                placeholder="noreply@example.com"
                className={validationErrors.fromEmail ? 'border-red-500' : ''}
              />
              {validationErrors.fromEmail && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.fromEmail}</p>
              )}
            </div>

            {/* From Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gönderen Adı <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.fromName}
                onChange={(e) => handleInputChange('fromName', e.target.value)}
                placeholder="X-Ear CRM"
                className={validationErrors.fromName ? 'border-red-500' : ''}
              />
              {validationErrors.fromName && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.fromName}</p>
              )}
            </div>

            {/* SSL/TLS Options */}
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="useSsl"
                  checked={formData.useSsl}
                  onChange={(e) => handleInputChange('useSsl', e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="useSsl" className="ml-2 block text-sm text-gray-700">
                  SSL/TLS Kullan (Port 465 için önerilir)
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="useTls"
                  checked={formData.useTls}
                  onChange={(e) => handleInputChange('useTls', e.target.checked)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="useTls" className="ml-2 block text-sm text-gray-700">
                  STARTTLS Kullan (Port 587 için önerilir)
                </label>
              </div>
            </div>

            {/* Port Warning */}
            {((formData.useSsl && formData.port !== 465) || (formData.useTls && formData.port !== 587)) && (
              <Alert>
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                <AlertDescription>
                  Port ve SSL/TLS ayarları uyumsuz olabilir. SSL için 465, STARTTLS için 587 portu önerilir.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Test Email Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test E-postası Gönder</CardTitle>
        </CardHeader>
        <CardContent>
          {!showTestConfirm ? (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                SMTP ayarlarınızı test etmek için bir e-posta adresi girin
              </p>
              <div className="flex gap-3">
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="flex-1"
                />
                <Button
                  onClick={() => setShowTestConfirm(true)}
                  disabled={!testEmail || sendTestMutation.isPending}
                  variant="outline"
                >
                  Test Mail Gönder
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <Alert className="mb-4">
                <AlertDescription>
                  <strong>{testEmail}</strong> adresine test e-postası gönderilecek. Onaylıyor musunuz?
                </AlertDescription>
              </Alert>
              <div className="flex gap-3">
                <Button
                  onClick={handleTestEmail}
                  disabled={sendTestMutation.isPending}
                  variant="primary"
                >
                  {sendTestMutation.isPending ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Gönderiliyor...
                    </>
                  ) : (
                    'Evet, Gönder'
                  )}
                </Button>
                <Button
                  onClick={() => setShowTestConfirm(false)}
                  variant="outline"
                  disabled={sendTestMutation.isPending}
                >
                  İptal
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button
          onClick={handleReset}
          variant="outline"
          disabled={createOrUpdateMutation.isPending}
        >
          Sıfırla
        </Button>
        <Button
          onClick={handleSave}
          disabled={createOrUpdateMutation.isPending}
          variant="primary"
        >
          {createOrUpdateMutation.isPending ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Kaydediliyor...
            </>
          ) : (
            <>
              <CheckCircleIcon className="h-4 w-4 mr-2" />
              Kaydet
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default SMTPConfig;
