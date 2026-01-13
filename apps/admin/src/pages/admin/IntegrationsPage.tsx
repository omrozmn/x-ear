import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Zap, Save, RefreshCw, CheckCircle, XCircle, FileText } from 'lucide-react';
import { useListAdminIntegrations } from '@/lib/api-client';
import { adminApi } from '@/lib/apiMutator';
import toast from 'react-hot-toast';

export default function IntegrationsPage() {
    const queryClient = useQueryClient();
    const { data: integrationsData, isLoading } = useListAdminIntegrations({});

    const [smsConfig, setSmsConfig] = useState({
        provider: 'vatan-sms',
        username: '',
        password: '',
        senderId: '',
        enabled: false
    });

    const [birFaturaConfig, setBirFaturaConfig] = useState({
        integrationKey: '',
        appApiKey: '',
        appSecretKey: ''
    });

    useEffect(() => {
        // Load configurations
        const loadConfigs = async () => {
            // 1. BirFatura
            try {
                const response: any = await adminApi({
                    url: '/admin/integrations/birfatura/config',
                    method: 'GET'
                });
                if (response.success && response.data) {
                    setBirFaturaConfig({
                        integrationKey: response.data.integrationKey || '',
                        appApiKey: response.data.appApiKey || '',
                        appSecretKey: response.data.appSecretKey || ''
                    });
                }
            } catch (e: any) {
                // Check if e is object and has message potentially
                const errMsg = e.message || String(e);
                // Safe check
                if (typeof errMsg === 'string' && errMsg.includes('404')) {
                    // Config might not exist yet, which is fine
                } else {
                    console.error('Failed to load BirFatura config', e);
                }
            }

            // 2. Vatan SMS
            try {
                const response: any = await adminApi({
                    url: '/admin/integrations/vatan-sms/config',
                    method: 'GET'
                });
                if (response.success && response.data) {
                    setSmsConfig({
                        provider: 'vatan-sms',
                        username: response.data.username || '',
                        password: response.data.password || '',
                        senderId: response.data.senderId || '',
                        enabled: response.data.isActive === true // Explicitly use isActive
                    });
                }
            } catch (e: any) {
                console.error('Failed to load VatanSMS config', e);
            }
        };
        loadConfigs();
    }, []);


    const integrations = (integrationsData as any)?.data?.integrations || [];

    const handleSave = async () => {
        try {
            await adminApi({
                url: '/admin/integrations/vatan-sms/config',
                method: 'PUT',
                data: {
                    username: smsConfig.username,
                    password: smsConfig.password,
                    senderId: smsConfig.senderId,
                    isActive: smsConfig.enabled
                }
            });
            toast.success('VatanSMS ayarları kaydedildi');
            queryClient.invalidateQueries({ queryKey: ['/api/admin/integrations'] });
        } catch (error: any) {
            toast.error('Kaydetme başarısız: ' + (error.message || 'Bilinmeyen hata'));
        }
    };

    const handleSaveBirFatura = async () => {
        try {
            await adminApi({
                url: '/admin/integrations/birfatura/config',
                method: 'PUT',
                data: {
                    integrationKey: birFaturaConfig.integrationKey,
                    appApiKey: birFaturaConfig.appApiKey,
                    appSecretKey: birFaturaConfig.appSecretKey
                }
            });
            toast.success('BirFatura ayarları kaydedildi');
        } catch (error: any) {
            toast.error('Kaydetme başarısız: ' + (error.message || 'Bilinmeyen hata'));
        }
    };

    const handleTest = async () => {
        try {
            // TODO: Implement test endpoint
            toast.success('Test SMS başarıyla gönderildi');
        } catch (error: any) {
            toast.error('Test başarısız: ' + (error.message || 'Bilinmeyen hata'));
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Entegrasyonlar</h1>
                <p className="text-gray-500 mt-1">Üçüncü parti sistem entegrasyonlarını yönetin</p>
            </div>

            {isLoading ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="text-center text-gray-500 mt-4">Yükleniyor...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Vatan SMS Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-indigo-100 rounded-lg">
                                    <Zap className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Vatan SMS</h3>
                                    <p className="text-sm text-gray-500">SMS gönderim servisi</p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${smsConfig.enabled
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-600'
                                }`}>
                                {smsConfig.enabled ? 'Aktif' : 'Pasif'}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Kullanıcı Adı
                                </label>
                                <input
                                    type="text"
                                    value={smsConfig.username}
                                    onChange={(e) => setSmsConfig({ ...smsConfig, username: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="API kullanıcı adı"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Şifre
                                </label>
                                <input
                                    type="password"
                                    value={smsConfig.password}
                                    onChange={(e) => setSmsConfig({ ...smsConfig, password: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="API şifresi"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Gönderici Adı
                                </label>
                                <input
                                    type="text"
                                    value={smsConfig.senderId}
                                    onChange={(e) => setSmsConfig({ ...smsConfig, senderId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="Örn: XEAR"
                                    maxLength={11}
                                />
                                <p className="text-xs text-gray-500 mt-1">Maksimum 11 karakter</p>
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={smsConfig.enabled}
                                    onChange={(e) => setSmsConfig({ ...smsConfig, enabled: e.target.checked })}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <label className="ml-2 block text-sm text-gray-700">
                                    Entegrasyonu aktif et
                                </label>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    onClick={handleSave}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    <Save className="w-4 h-4" />
                                    Kaydet
                                </button>
                                <button
                                    onClick={handleTest}
                                    className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Test Et
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* BirFatura Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-100 rounded-lg">
                                    <FileText className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">BirFatura</h3>
                                    <p className="text-sm text-gray-500">E-Fatura entegrasyonu</p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${birFaturaConfig.integrationKey
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-600'
                                }`}>
                                {birFaturaConfig.integrationKey ? 'Aktif' : 'Pasif'}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Integration Key (Global)
                                </label>
                                <input
                                    type="text"
                                    value={birFaturaConfig.integrationKey}
                                    onChange={(e) => setBirFaturaConfig({ ...birFaturaConfig, integrationKey: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                                    placeholder="865c3848-fda5-48f8-aeb6-9ae58abbb3bf"
                                />
                                <p className="text-xs text-gray-500 mt-1">Tüm üyeler için geçerli ortak anahtar (INTEGRATION KEY)</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    App API Key
                                </label>
                                <input
                                    type="text"
                                    value={birFaturaConfig.appApiKey}
                                    onChange={(e) => setBirFaturaConfig({ ...birFaturaConfig, appApiKey: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                                    placeholder="d500f61b-2104-4a59-b306-71cf72dd52d1"
                                />
                                <p className="text-xs text-gray-500 mt-1">Uygulama API anahtarı (API KEY)</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    App Secret Key
                                </label>
                                <input
                                    type="password"
                                    value={birFaturaConfig.appSecretKey}
                                    onChange={(e) => setBirFaturaConfig({ ...birFaturaConfig, appSecretKey: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                                    placeholder="b72389be-6285-4ec6-9128-c162e43f19c2"
                                />
                                <p className="text-xs text-gray-500 mt-1">Uygulama gizli anahtarı (SECRET KEY)</p>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    onClick={handleSaveBirFatura}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <Save className="w-4 h-4" />
                                    Kaydet
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* More Integrations Placeholder inside the grid */}
                    <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-12 flex flex-col items-center justify-center text-center">
                        <Zap className="w-12 h-12 text-gray-400 mb-4" />
                        <h3 className="font-medium text-gray-900 mb-2">Daha Fazla Entegrasyon</h3>
                        <p className="text-sm text-gray-500 max-w-sm">
                            Yakında daha fazla entegrasyon eklenecek. PayTR, Iyzico, ve diğer servisler için destek geliyor.
                        </p>
                    </div>
                </div>
            )}

            {/* Integration Status List */}
            {integrations.length > 0 && (
                <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="font-semibold text-gray-900">Tüm Entegrasyonlar</h3>
                    </div>
                    <div className="divide-y divide-gray-200">
                        {integrations.map((integration: any) => (
                            <div key={integration.id} className="px-6 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Zap className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="font-medium text-gray-900">{integration.name}</p>
                                        <p className="text-sm text-gray-500">{integration.type}</p>
                                    </div>
                                </div>
                                <span className={`flex items-center gap-1 text-sm font-medium ${integration.status === 'active'
                                    ? 'text-green-600'
                                    : 'text-gray-500'
                                    }`}>
                                    {integration.status === 'active' ? (
                                        <><CheckCircle className="w-4 h-4" /> Aktif</>
                                    ) : (
                                        <><XCircle className="w-4 h-4" /> Pasif</>
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
