import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Globe,
  Mail,
  Shield,
  Database,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';
import { useGetAdminSettings, usePostAdminSettings, SystemSettings } from '@/lib/api-client';

type SettingsTab = 'general' | 'email' | 'security' | 'backup';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // Fetch settings
  const { data: settingsData, isLoading: isLoadingSettings } = useGetAdminSettings();
  const settings = settingsData?.data?.settings;

  // Update settings mutation
  const { mutateAsync: updateSettings, isPending: isUpdating } = usePostAdminSettings();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SystemSettings>({
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
      backupEncryptionKey: ''
    }
  });

  // Reset form when settings are loaded
  useEffect(() => {
    if (settings) {
      reset(settings);
    }
  }, [settings, reset]);

  const onSubmit = async (data: SystemSettings) => {
    try {
      await updateSettings({ data });
      toast.success('Settings saved successfully');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to save settings');
    }
  };

  const tabs: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'backup', label: 'Backup', icon: Database },
  ];

  if (isLoadingSettings) {
    return <div className="p-6 text-center">Loading settings...</div>;
  }

  return (
    <>
      <Helmet>
        <title>Settings - Admin Panel</title>
      </Helmet>

      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure system-wide settings and preferences
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="w-full lg:w-64 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-900 hover:bg-gray-50'
                    }`}
                >
                  <tab.icon
                    className={`flex-shrink-0 -ml-1 mr-3 h-5 w-5 ${activeTab === tab.id ? 'text-primary-700' : 'text-gray-400'
                      }`}
                  />
                  <span className="truncate">{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 bg-white shadow rounded-lg p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">Site Name</label>
                      <input
                        type="text"
                        {...register('siteName', { required: true })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">Default Timezone</label>
                      <select
                        {...register('timezone')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="Europe/London">London</option>
                        <option value="Asia/Tokyo">Tokyo</option>
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">Default Language</label>
                      <select
                        {...register('language')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="tr">Turkish</option>
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">Currency</label>
                      <select
                        {...register('currency')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      >
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                        <option value="TRY">TRY - Turkish Lira</option>
                      </select>
                    </div>

                    <div className="sm:col-span-6">
                      <label className="block text-sm font-medium text-gray-700">Site Description</label>
                      <textarea
                        {...register('siteDescription')}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
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
                          <label className="font-medium text-gray-700">Maintenance Mode</label>
                          <p className="text-gray-500">Put the site in maintenance mode. Only admins can access.</p>
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
                          <label className="font-medium text-gray-700">User Registration</label>
                          <p className="text-gray-500">Allow new users to register.</p>
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
                      <label className="block text-sm font-medium text-gray-700">SMTP Host</label>
                      <input
                        type="text"
                        {...register('smtpHost')}
                        placeholder="smtp.gmail.com"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">SMTP Port</label>
                      <input
                        type="text"
                        {...register('smtpPort')}
                        placeholder="587"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">SMTP Username</label>
                      <input
                        type="text"
                        {...register('smtpUsername')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">SMTP Password</label>
                      <input
                        type="password"
                        {...register('smtpPassword')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">From Email</label>
                      <input
                        type="email"
                        {...register('fromEmail')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">From Name</label>
                      <input
                        type="text"
                        {...register('fromName')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
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
                      <label className="font-medium text-gray-700">Use SSL/TLS</label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">Session Timeout (minutes)</label>
                      <input
                        type="number"
                        {...register('sessionTimeout')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">Max Login Attempts</label>
                      <input
                        type="number"
                        {...register('maxLoginAttempts')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">Password Min Length</label>
                      <input
                        type="number"
                        {...register('passwordMinLength')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">JWT Expiry (hours)</label>
                      <input
                        type="number"
                        {...register('jwtExpiry')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
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
                          <label className="font-medium text-gray-700">Two-Factor Authentication</label>
                          <p className="text-gray-500">Enforce 2FA for all admin users.</p>
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
                          <label className="font-medium text-gray-700">IP Whitelist</label>
                          <p className="text-gray-500">Restrict admin access to whitelisted IPs.</p>
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
                      <label className="block text-sm font-medium text-gray-700">Backup Schedule</label>
                      <select
                        {...register('backupSchedule')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">Backup Retention (days)</label>
                      <input
                        type="number"
                        {...register('backupRetention')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">Backup Location</label>
                      <select
                        {...register('backupLocation')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      >
                        <option value="local">Local Storage</option>
                        <option value="s3">Amazon S3</option>
                        <option value="gcs">Google Cloud Storage</option>
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-sm font-medium text-gray-700">Encryption Key</label>
                      <input
                        type="password"
                        {...register('backupEncryptionKey')}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-5 border-t border-gray-200">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => reset()}
                    className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {isUpdating ? 'Saving...' : 'Save Settings'}
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