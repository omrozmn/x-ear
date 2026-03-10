import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Globe,
  Mail,
  Shield,
  Database,
  Puzzle, // Icon for Integrations
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';
import {
  useListAdminSettings,
  useUpdateAdminSettings,
  type ResponseEnvelopeListSystemSettingRead,
  type SettingItem,
  type SystemSettingRead,
} from '@/lib/api-client';
import { useAdminResponsive } from '@/hooks/useAdminResponsive';
import { unwrapArray } from '@/lib/orval-response';

// Define SystemSettings type locally - flexible for form usage
type SystemSettings = Record<string, unknown>;

type SettingsTab = 'general' | 'email' | 'security' | 'backup' | 'integrations';

function getSettingsMap(data: ResponseEnvelopeListSystemSettingRead | undefined): SystemSettings {
  const settings = unwrapArray<SystemSettingRead>(data);

  return settings.reduce<SystemSettings>((acc, setting) => {
    acc[setting.key] = normalizeSettingValue(setting);
    return acc;
  }, {});
}

function normalizeSettingValue(setting: SystemSettingRead): string | boolean {
  const value = setting.value ?? '';
  const normalizedKey = setting.key.toLowerCase();

  if (value === 'true' || value === 'false') {
    return value === 'true';
  }

  if (
    normalizedKey.includes('enabled') ||
    normalizedKey.includes('mode') ||
    normalizedKey.includes('secure') ||
    normalizedKey.includes('auth') ||
    normalizedKey.includes('logging') ||
    normalizedKey.includes('whitelist') ||
    normalizedKey.includes('compression')
  ) {
    return value === 'true';
  }

  return value;
}

function toSettingItems(data: SystemSettings): SettingItem[] {
  return Object.entries(data).map(([key, value]) => ({
    key,
    value: String(value),
  }));
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Ayarlar kaydedilemedi';
}

const Settings: React.FC = () => {
  const { isMobile } = useAdminResponsive();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // Fetch settings
  const { data: settingsData, isLoading: isLoadingSettings } = useListAdminSettings();
  const settings = getSettingsMap(settingsData);

  // Update settings mutation
  const { mutateAsync: updateSettings, isPending: isUpdating } = useUpdateAdminSettings();

  const { register, handleSubmit, reset } = useForm<SystemSettings>({
    defaultValues: {
      siteName: 'Admin Panel',
      siteDescription: 'Multi-tenant SaaS Admin Panel',
      timezone: 'UTC',
      language: 'en',
      currency: 'USD',
      maintenanceMode: false,
      registrationEnabled: true,
      emailNotifications: true,
      autoBackup: true,
      smtpHost: '',
      smtpPort: '587',
      smtpUsername: '',
      smtpPassword: '',
      fromEmail: '',
      fromName: 'Admin Panel',
      smtpSecure: true,
      sessionTimeout: '1440',
      maxLoginAttempts: '5',
      passwordMinLength: '8',
      jwtExpiry: '24',
      twoFactorAuth: false,
      forcePasswordChange: false,
      ipWhitelist: false,
      auditLogging: true,
      backupSchedule: 'daily',
      backupRetention: '30',
      backupLocation: 'local',
      backupCompression: true,
      backupEncryptionKey: '',
      // New fields
      birFaturaApiKey: '',
      birFaturaApiSecret: '',
      smsProvider: 'vatansms',
      smsUsername: '',
      smsPassword: '',
      smsHeader: '',
      paymentProvider: 'stripe',
      paymentApiKey: '',
      paymentSecretKey: ''
    }
  });

  // Reset form when settings are loaded
  useEffect(() => {
    if (Object.keys(settings).length > 0) {
      reset(settings);
    }
  }, [settings, reset]);

  const onSubmit = async (data: SystemSettings) => {
    try {
      // Convert flat object to array of settings
      await updateSettings({ data: toSettingItems(data) });
      toast.success('Ayarlar başarıyla kaydedildi');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(getErrorMessage(error));
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'general', label: 'Genel', icon: Globe },
    { id: 'email', label: 'E-posta', icon: Mail },
    { id: 'security', label: 'Güvenlik', icon: Shield },
    { id: 'backup', label: 'Yedekleme', icon: Database },
    { id: 'integrations', label: 'Entegrasyonlar', icon: Puzzle },
  ];

  if (isLoadingSettings) {
    return <div className={`text-center text-gray-500 dark:text-gray-400 ${isMobile ? 'p-4' : 'p-6'}`}>Ayarlar yükleniyor...</div>;
  }

  return (
    <>
      <Helmet>
        <title>Ayarlar - Admin Paneli</title>
      </Helmet>

      <div className={`max-w-7xl mx-auto ${isMobile ? 'p-4 pb-safe' : 'p-6'}`}>
        <div className="mb-8">
          <h1 className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>Sistem Ayarları</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Sistem genelindeki ayarları ve tercihleri yapılandırın
          </p>
        </div>

        <div className={`flex gap-6 ${isMobile ? 'flex-col' : 'flex-col lg:flex-row'}`}>
          {/* Sidebar Navigation */}
          <div className={`flex-shrink-0 ${isMobile ? 'w-full' : 'w-full lg:w-64'}`}>
            <nav className={isMobile ? 'flex overflow-x-auto space-x-2 pb-2' : 'space-y-1'}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-xl touch-feedback ${isMobile ? 'whitespace-nowrap flex-shrink-0' : 'w-full'} ${activeTab === tab.id
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400'
                    : 'text-gray-900 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                >
                  <tab.icon
                    className={`flex-shrink-0 h-5 w-5 ${isMobile ? '' : '-ml-1 mr-3'} ${activeTab === tab.id ? 'text-primary-700 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'
                      }`}
                  />
                  {!isMobile && <span className="truncate">{tab.label}</span>}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className={`flex-1 bg-white dark:bg-gray-800 shadow rounded-2xl ${isMobile ? 'p-4' : 'p-6'}`}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* ... existing tabs ... */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div className={`grid grid-cols-1 gap-y-6 gap-x-4 ${isMobile ? '' : 'sm:grid-cols-6'}`}>
                    <div className={isMobile ? '' : 'sm:col-span-3'}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Site Adı</label>
                      <input
                        type="text"
                        {...register('siteName', { required: true })}
                        className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">Varsayılan Saat Dilimi</label>
                      <select
                        {...register('timezone')}
                        className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      >
                        <option value="UTC">UTC</option>
                        <option value="Europe/Istanbul">İstanbul</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="Europe/London">London</option>
                        <option value="Asia/Tokyo">Tokyo</option>
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Varsayılan Dil</label>
                      <select
                        {...register('language')}
                        className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      >
                        <option value="tr">Türkçe</option>
                        <option value="en">İngilizce</option>
                        <option value="es">İspanyolca</option>
                        <option value="fr">Fransızca</option>
                        <option value="de">Almanca</option>
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Para Birimi</label>
                      <select
                        {...register('currency')}
                        className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      >
                        <option value="TRY">TRY - Türk Lirası</option>
                        <option value="USD">USD - Amerikan Doları</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - İngiliz Sterlini</option>
                      </select>
                    </div>

                    <div className="sm:col-span-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Site Açıklaması</label>
                      <textarea
                        {...register('siteDescription')}
                        rows={3}
                        className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <div className="flex h-5 items-center">
                          <input
                            type="checkbox"
                            {...register('maintenanceMode')}
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label className="font-medium text-gray-700 dark:text-gray-300">Bakım Modu</label>
                          <p className="text-gray-500 dark:text-gray-400">Siteyi bakım moduna alır. Sadece yöneticiler erişebilir.</p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <div className="flex h-5 items-center">
                          <input
                            type="checkbox"
                            {...register('registrationEnabled')}
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label className="font-medium text-gray-700 dark:text-gray-300">Kullanıcı Kaydı</label>
                          <p className="text-gray-500 dark:text-gray-400">Yeni kullanıcıların kayıt olmasına izin ver.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'email' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">SMTP Sunucusu</label>
                      <input
                        type="text"
                        {...register('smtpHost')}
                        placeholder="smtp.gmail.com"
                        className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">SMTP Portu</label>
                      <input
                        type="text"
                        {...register('smtpPort')}
                        placeholder="587"
                        className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">SMTP Kullanıcı Adı</label>
                      <input
                        type="text"
                        {...register('smtpUsername')}
                        className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">SMTP Şifresi</label>
                      <input
                        type="password"
                        {...register('smtpPassword')}
                        className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Gönderen E-posta</label>
                      <input
                        type="email"
                        {...register('fromEmail')}
                        className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Gönderen Adı</label>
                      <input
                        type="text"
                        {...register('fromName')}
                        className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      />
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="flex h-5 items-center">
                      <input
                        type="checkbox"
                        {...register('smtpSecure')}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label className="font-medium text-gray-700 dark:text-gray-300">SSL/TLS Kullan</label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Oturum Zaman Aşımı (dakika)</label>
                      <input
                        type="number"
                        {...register('sessionTimeout')}
                        className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Maksimum Giriş Denemesi</label>
                      <input
                        type="number"
                        {...register('maxLoginAttempts')}
                        className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Minimum Şifre Uzunluğu</label>
                      <input
                        type="number"
                        {...register('passwordMinLength')}
                        className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">JWT Süresi (saat)</label>
                      <input
                        type="number"
                        {...register('jwtExpiry')}
                        className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <div className="flex h-5 items-center">
                          <input
                            type="checkbox"
                            {...register('twoFactorAuth')}
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label className="font-medium text-gray-700 dark:text-gray-300">İki Faktörlü Kimlik Doğrulama (2FA)</label>
                          <p className="text-gray-500 dark:text-gray-400">Tüm yönetici kullanıcıları için 2FA zorunlu kıl.</p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <div className="flex h-5 items-center">
                          <input
                            type="checkbox"
                            {...register('ipWhitelist')}
                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                        </div>
                        <div className="ml-3 text-sm">
                          <label className="font-medium text-gray-700 dark:text-gray-300">IP Beyaz Listesi</label>
                          <p className="text-gray-500 dark:text-gray-400">Yönetici erişimini beyaz listedeki IP'lerle sınırla.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'backup' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Yedekleme Zamanlaması</label>
                      <select
                        {...register('backupSchedule')}
                        className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      >
                        <option value="daily">Günlük</option>
                        <option value="weekly">Haftalık</option>
                        <option value="monthly">Aylık</option>
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Yedek Saklama Süresi (gün)</label>
                      <input
                        type="number"
                        {...register('backupRetention')}
                        className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Yedekleme Konumu</label>
                      <select
                        {...register('backupLocation')}
                        className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      >
                        <option value="local">Yerel Depolama</option>
                        <option value="s3">Amazon S3</option>
                        <option value="gcs">Google Cloud Storage</option>
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Şifreleme Anahtarı</label>
                      <input
                        type="password"
                        {...register('backupEncryptionKey')}
                        className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'integrations' && (
                <div className="space-y-8">
                  {/* BirFatura Integration */}
                  <div className="border-b border-gray-200 pb-6">
                    <h3 className={`leading-6 text-gray-900 dark:text-white mb-4 ${isMobile ? 'text-base font-medium' : 'text-lg font-medium'}`}>BirFatura Entegrasyonu</h3>
                    <div className={`grid grid-cols-1 gap-y-6 gap-x-4 ${isMobile ? '' : 'sm:grid-cols-6'}`}>
                      <div className={isMobile ? '' : 'sm:col-span-3'}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">API Anahtarı (API Key)</label>
                        <input
                          type="text"
                          {...register('birFaturaApiKey')}
                          className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                        />
                      </div>
                      <div className={isMobile ? '' : 'sm:col-span-3'}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">API Gizli Anahtarı (Secret)</label>
                        <input
                          type="password"
                          {...register('birFaturaApiSecret')}
                          className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SMS Integration */}
                  <div className="border-b border-gray-200 pb-6">
                    <h3 className={`leading-6 text-gray-900 dark:text-white mb-4 ${isMobile ? 'text-base font-medium' : 'text-lg font-medium'}`}>SMS Entegrasyonu</h3>
                    <div className={`grid grid-cols-1 gap-y-6 gap-x-4 ${isMobile ? '' : 'sm:grid-cols-6'}`}>
                      <div className={isMobile ? '' : 'sm:col-span-3'}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">SMS Sağlayıcı</label>
                        <select
                          {...register('smsProvider')}
                          className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                        >
                          <option value="vatansms">VatanSMS</option>
                          <option value="netgsm">NetGSM</option>
                          <option value="iletimerkezi">İleti Merkezi</option>
                        </select>
                      </div>
                      <div className={isMobile ? '' : 'sm:col-span-3'}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">SMS Başlığı (Header)</label>
                        <input
                          type="text"
                          {...register('smsHeader')}
                          className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                        />
                      </div>
                      <div className={isMobile ? '' : 'sm:col-span-3'}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Kullanıcı Adı</label>
                        <input
                          type="text"
                          {...register('smsUsername')}
                          className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                        />
                      </div>
                      <div className={isMobile ? '' : 'sm:col-span-3'}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Şifre</label>
                        <input
                          type="password"
                          {...register('smsPassword')}
                          className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment Infrastructure */}
                  <div>
                    <h3 className={`leading-6 text-gray-900 dark:text-white mb-4 ${isMobile ? 'text-base font-medium' : 'text-lg font-medium'}`}>Ödeme Altyapısı</h3>
                    <div className={`grid grid-cols-1 gap-y-6 gap-x-4 ${isMobile ? '' : 'sm:grid-cols-6'}`}>
                      <div className={isMobile ? '' : 'sm:col-span-3'}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Ödeme Sağlayıcı</label>
                        <select
                          {...register('paymentProvider')}
                          className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                        >
                          <option value="stripe">Stripe</option>
                          <option value="iyzico">Iyzico</option>
                          <option value="paytr">PayTR</option>
                        </select>
                      </div>
                      <div className={isMobile ? '' : 'sm:col-span-3'}></div> {/* Spacer */}

                      <div className={isMobile ? '' : 'sm:col-span-3'}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">API Anahtarı (Public Key)</label>
                        <input
                          type="text"
                          {...register('paymentApiKey')}
                          className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                        />
                      </div>
                      <div className={isMobile ? '' : 'sm:col-span-3'}>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Gizli Anahtar (Secret Key)</label>
                        <input
                          type="password"
                          {...register('paymentSecretKey')}
                          className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className={`pt-5 border-t border-gray-200 dark:border-gray-700 ${isMobile ? '' : ''}`}>
                <div className={`flex ${isMobile ? 'flex-col gap-3' : 'justify-end'}`}>
                  <button
                    type="button"
                    onClick={() => reset()}
                    className={`bg-white dark:bg-gray-800 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 touch-feedback ${isMobile ? 'w-full' : ''}`}
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-xl text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 touch-feedback ${isMobile ? 'w-full' : 'ml-3'}`}
                  >
                    {isUpdating ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default Settings;
