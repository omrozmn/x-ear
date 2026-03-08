import React, { useState, useEffect } from 'react';
import {
    useListAdminSettings,
    useUpdateAdminSettings,
    useCreateAdminSettingCacheClear,
    useCreateAdminSettingBackup,
    type ResponseEnvelopeListSystemSettingRead,
    type SettingItem,
    type SystemSettingRead,
} from '@/lib/api-client';
import {
    Save,
    Database,
    Trash2,
    Server,
    Mail,
    Globe,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminResponsive } from '@/hooks/useAdminResponsive';

type SettingsTab = 'general' | 'mail' | 'maintenance';

function getSettings(data: ResponseEnvelopeListSystemSettingRead | undefined): SystemSettingRead[] {
    return Array.isArray(data?.data) ? data.data : [];
}

function toSettingItems(settings: SystemSettingRead[]): SettingItem[] {
    return settings.map((setting) => ({
        key: setting.key,
        value: setting.value ?? '',
        category: setting.category ?? undefined,
        isPublic: setting.isPublic ?? undefined,
    }));
}

const AdminSettingsPage: React.FC = () => {
    const { isMobile } = useAdminResponsive();
    const [activeTab, setActiveTab] = useState<SettingsTab>('general');
    const [settings, setSettings] = useState<SystemSettingRead[]>([]);

    const { data: settingsData, isLoading, refetch } = useListAdminSettings({});
    const updateMutation = useUpdateAdminSettings();
    const clearCacheMutation = useCreateAdminSettingCacheClear();
    const backupMutation = useCreateAdminSettingBackup();

    useEffect(() => {
        setSettings(getSettings(settingsData));
    }, [settingsData]);

    const handleSave = async () => {
        try {
            await updateMutation.mutateAsync({ data: toSettingItems(settings) });
            toast.success('Ayarlar kaydedildi');
            refetch();
        } catch {
            toast.error('Ayarlar kaydedilemedi');
        }
    };

    const handleClearCache = async () => {
        if (!confirm('Önbelleği temizlemek istediğinize emin misiniz?')) return;
        try {
            await clearCacheMutation.mutateAsync();
            toast.success('Önbellek temizlendi');
        } catch {
            toast.error('İşlem başarısız');
        }
    };

    const handleBackup = async () => {
        try {
            await backupMutation.mutateAsync();
            toast.success('Yedekleme başlatıldı');
        } catch {
            toast.error('Yedekleme başlatılamadı');
        }
    };

    const updateSetting = (key: string, value: string) => {
        setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
    };

    const getSettingsByCategory = (category: string) => {
        return settings.filter(s => s.category === category);
    };

    if (isLoading) return <div className="p-12 text-center text-gray-500 dark:text-gray-400">Yükleniyor...</div>;

    return (
        <div className={isMobile ? 'p-4 pb-safe' : 'p-6 max-w-4xl mx-auto'}>
            <div className={`flex ${isMobile ? 'flex-col gap-4' : 'justify-between items-center'} mb-8`}>
                <div>
                    <h1 className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>Sistem Ayarları</h1>
                    <p className="text-gray-500 dark:text-gray-400">Genel yapılandırma ve bakım işlemleri</p>
                </div>
                <div className={`flex ${isMobile ? 'flex-col w-full' : 'space-x-3'} gap-3`}>
                    <button
                        onClick={handleClearCache}
                        disabled={clearCacheMutation.isPending}
                        className={`inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 touch-feedback ${isMobile ? 'w-full' : ''}`}
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Önbelleği Temizle
                    </button>
                    <button
                        onClick={handleBackup}
                        disabled={backupMutation.isPending}
                        className={`inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 touch-feedback ${isMobile ? 'w-full' : ''}`}
                    >
                        <Database className="h-4 w-4 mr-2" />
                        Yedekle
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        className={`inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 touch-feedback ${isMobile ? 'w-full' : ''}`}
                    >
                        <Save className="h-4 w-4 mr-2" />
                        Kaydet
                    </button>
                </div>
            </div>

            <div className={`bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden ${isMobile ? '' : 'flex'}`}>
                {/* Sidebar */}
                <div className={`bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 ${isMobile ? 'border-b overflow-x-auto' : 'w-64 border-r'}`}>
                    <nav className={`${isMobile ? 'flex p-2 space-x-2' : 'p-4 space-y-1'}`}>
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md touch-feedback ${isMobile ? 'whitespace-nowrap flex-shrink-0' : 'w-full'} ${activeTab === 'general' ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                        >
                            <Globe className={`h-5 w-5 ${isMobile ? '' : 'mr-3'}`} />
                            {!isMobile && 'Genel'}
                        </button>
                        <button
                            onClick={() => setActiveTab('mail')}
                            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md touch-feedback ${isMobile ? 'whitespace-nowrap flex-shrink-0' : 'w-full'} ${activeTab === 'mail' ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                        >
                            <Mail className={`h-5 w-5 ${isMobile ? '' : 'mr-3'}`} />
                            {!isMobile && 'E-Posta (SMTP)'}
                        </button>
                        <button
                            onClick={() => setActiveTab('maintenance')}
                            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md touch-feedback ${isMobile ? 'whitespace-nowrap flex-shrink-0' : 'w-full'} ${activeTab === 'maintenance' ? 'bg-white dark:bg-gray-800 text-primary-600 dark:text-primary-400 shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
                                }`}
                        >
                            <Server className={`h-5 w-5 ${isMobile ? '' : 'mr-3'}`} />
                            {!isMobile && 'Bakım Modu'}
                        </button>
                    </nav>
                </div>

                {/* Content */}
                <div className={isMobile ? 'p-4 pb-safe' : 'flex-1 p-8'}>
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            <h3 className={`font-medium text-gray-900 dark:text-white ${isMobile ? 'text-base' : 'text-lg'}`}>Genel Ayarlar</h3>
                            {getSettingsByCategory('general').map(setting => (
                                <div key={setting.key}>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {setting.key === 'site_name' ? 'Site İsmi' : setting.key}
                                    </label>
                                    <input
                                        type="text"
                                        value={setting.value ?? ''}
                                        onChange={(e) => updateSetting(setting.key, e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                    />
                                    {setting.description && (
                                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{setting.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'mail' && (
                        <div className="space-y-6">
                            <h3 className={`font-medium text-gray-900 dark:text-white ${isMobile ? 'text-base' : 'text-lg'}`}>E-Posta Ayarları</h3>
                            {getSettingsByCategory('mail').map(setting => (
                                <div key={setting.key}>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {setting.key}
                                    </label>
                                    <input
                                        type={setting.key.includes('pass') ? 'password' : 'text'}
                                        value={setting.value ?? ''}
                                        onChange={(e) => updateSetting(setting.key, e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'maintenance' && (
                        <div className="space-y-6">
                            <h3 className={`font-medium text-gray-900 dark:text-white ${isMobile ? 'text-base' : 'text-lg'}`}>Bakım Modu</h3>
                            {getSettingsByCategory('maintenance').map(setting => (
                                <div key={setting.key} className="flex items-center justify-between">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Bakım Modu
                                        </label>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Aktif edildiğinde sadece adminler giriş yapabilir.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => updateSetting(setting.key, setting.value === 'true' ? 'false' : 'true')}
                                        className={`${setting.value === 'true' ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                                            } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 touch-feedback`}
                                    >
                                        <span
                                            className={`${setting.value === 'true' ? 'translate-x-5' : 'translate-x-0'
                                                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                                        />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminSettingsPage;
