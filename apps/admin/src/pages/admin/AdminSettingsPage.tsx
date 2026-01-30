import React, { useState, useEffect } from 'react';
import {
    useListAdminSettings,
    useUpdateAdminSettings,
    useCreateAdminSettingCacheClear,
    useCreateAdminSettingBackup
} from '@/lib/api-client';
import {
    Save,
    Database,
    Trash2,
    RefreshCw,
    Server,
    Mail,
    Globe,
    Shield
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminSettingsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState('general');
    const [settings, setSettings] = useState<any[]>([]);

    const { data: settingsData, isLoading, refetch } = useListAdminSettings({});
    const updateMutation = useUpdateAdminSettings();
    const clearCacheMutation = useCreateAdminSettingCacheClear();
    const backupMutation = useCreateAdminSettingBackup();

    useEffect(() => {
        const actualSettings = (settingsData as any)?.settings || (settingsData as any)?.data;
        if (actualSettings) {
            setSettings(actualSettings);
        }
    }, [settingsData]);

    const handleSave = async () => {
        try {
            await updateMutation.mutateAsync({ data: settings as any });
            toast.success('Ayarlar kaydedildi');
            refetch();
        } catch (error) {
            toast.error('Ayarlar kaydedilemedi');
        }
    };

    const handleClearCache = async () => {
        if (!confirm('Önbelleği temizlemek istediğinize emin misiniz?')) return;
        try {
            await clearCacheMutation.mutateAsync();
            toast.success('Önbellek temizlendi');
        } catch (error) {
            toast.error('İşlem başarısız');
        }
    };

    const handleBackup = async () => {
        try {
            await backupMutation.mutateAsync();
            toast.success('Yedekleme başlatıldı');
        } catch (error) {
            toast.error('Yedekleme başlatılamadı');
        }
    };

    const updateSetting = (key: string, value: string) => {
        setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
    };

    const getSettingsByCategory = (category: string) => {
        return settings.filter(s => s.category === category);
    };

    if (isLoading) return <div className="p-12 text-center">Yükleniyor...</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Sistem Ayarları</h1>
                    <p className="text-gray-500">Genel yapılandırma ve bakım işlemleri</p>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={handleClearCache}
                        disabled={clearCacheMutation.isPending}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Önbelleği Temizle
                    </button>
                    <button
                        onClick={handleBackup}
                        disabled={backupMutation.isPending}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                        <Database className="h-4 w-4 mr-2" />
                        Yedekle
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
                    >
                        <Save className="h-4 w-4 mr-2" />
                        Kaydet
                    </button>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden flex">
                {/* Sidebar */}
                <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
                    <nav className="space-y-1">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'general' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-900'
                                }`}
                        >
                            <Globe className="mr-3 h-5 w-5" />
                            Genel
                        </button>
                        <button
                            onClick={() => setActiveTab('mail')}
                            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'mail' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-900'
                                }`}
                        >
                            <Mail className="mr-3 h-5 w-5" />
                            E-Posta (SMTP)
                        </button>
                        <button
                            onClick={() => setActiveTab('maintenance')}
                            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md ${activeTab === 'maintenance' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-900'
                                }`}
                        >
                            <Server className="mr-3 h-5 w-5" />
                            Bakım Modu
                        </button>
                    </nav>
                </div>

                {/* Content */}
                <div className="flex-1 p-8">
                    {activeTab === 'general' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-medium text-gray-900">Genel Ayarlar</h3>
                            {getSettingsByCategory('general').map(setting => (
                                <div key={setting.key}>
                                    <label className="block text-sm font-medium text-gray-700">
                                        {setting.key === 'site_name' ? 'Site İsmi' : setting.key}
                                    </label>
                                    <input
                                        type="text"
                                        value={setting.value}
                                        onChange={(e) => updateSetting(setting.key, e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                    />
                                    {setting.description && (
                                        <p className="mt-1 text-xs text-gray-500">{setting.description}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'mail' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-medium text-gray-900">E-Posta Ayarları</h3>
                            {getSettingsByCategory('mail').map(setting => (
                                <div key={setting.key}>
                                    <label className="block text-sm font-medium text-gray-700">
                                        {setting.key}
                                    </label>
                                    <input
                                        type={setting.key.includes('pass') ? 'password' : 'text'}
                                        value={setting.value}
                                        onChange={(e) => updateSetting(setting.key, e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'maintenance' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-medium text-gray-900">Bakım Modu</h3>
                            {getSettingsByCategory('maintenance').map(setting => (
                                <div key={setting.key} className="flex items-center justify-between">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">
                                            Bakım Modu
                                        </label>
                                        <p className="text-sm text-gray-500">
                                            Aktif edildiğinde sadece adminler giriş yapabilir.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => updateSetting(setting.key, setting.value === 'true' ? 'false' : 'true')}
                                        className={`${setting.value === 'true' ? 'bg-primary-600' : 'bg-gray-200'
                                            } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2`}
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
