import { useState, useEffect } from 'react';
import { CreditCard, FileText, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api';
import { useUpdateTenant, Tenant } from '@/lib/api-client';

interface ExtendedTenant extends Tenant {
    current_plan_id?: string;
    subscription_start_date?: string;
    subscription_end_date?: string;
    feature_usage?: Record<string, any>;
}

export const IntegrationsTab = ({ tenant, onUpdate }: { tenant: ExtendedTenant, onUpdate: () => void }) => {
    const { mutateAsync: updateTenant, isPending } = useUpdateTenant();
    const [smsConfigData, setSmsConfigData] = useState<any>(null);
    const [loadingSmsConfig, setLoadingSmsConfig] = useState(true);

    const posSettings = (tenant.settings?.pos_integration || {}) as any;
    const invoiceSettings = (tenant.settings?.invoice_integration || {}) as any;
    const smsSettings = (tenant.settings?.sms_integration || {}) as any;

    const [config, setConfig] = useState({
        provider: 'paytr',
        enabled: posSettings.enabled || false,
        merchant_id: posSettings.merchant_id || '',
        merchant_key: posSettings.merchant_key || '',
        merchant_salt: posSettings.merchant_salt || '',
        test_mode: posSettings.test_mode || false
    });

    const [invoiceConfig, setInvoiceConfig] = useState({
        provider: 'birfatura',
        enabled: invoiceSettings.enabled || false,
        api_key: invoiceSettings.api_key || '',
        secret_key: invoiceSettings.secret_key || ''
    });

    const [smsConfig, setSmsConfig] = useState({
        enabled: smsSettings.enabled || false
    });

    useEffect(() => {
        const fetchSmsConfig = async () => {
            try {
                const response = await apiClient.get(`/api/admin/tenants/${tenant.id}/sms-config`);
                setSmsConfigData(response.data?.data || null);
            } catch (error) {
                console.error('Failed to fetch SMS config:', error);
            } finally {
                setLoadingSmsConfig(false);
            }
        };
        fetchSmsConfig();
    }, [tenant.id]);

    const handleChange = (field: string, value: any) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };


    const handleInvoiceChange = (field: string, value: any) => {
        setInvoiceConfig(prev => ({ ...prev, [field]: value }));
    };

    const handleSmsChange = (field: string, value: any) => {
        setSmsConfig(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const currentSettings = tenant.settings || {};
            const newSettings = {
                ...currentSettings,
                pos_integration: {
                    ...config,
                    updated_at: new Date().toISOString()
                },
                invoice_integration: {
                    ...invoiceConfig,
                    updated_at: new Date().toISOString()
                },
                sms_integration: {
                    ...smsConfig,
                    updated_at: new Date().toISOString()
                }
            };

            await updateTenant({
                id: tenant.id!,
                data: { settings: newSettings } as any
            });
            toast.success('Entegrasyon ayarları güncellendi');
            onUpdate();
        } catch (error: any) {
            toast.error(error.response?.data?.error?.message || 'Güncelleme başarısız');
        }
    };

    const canEnableSms = smsConfigData?.apiUsername && smsConfigData?.documentsEmail;

    return (
        <form onSubmit={handleSave} className="space-y-6 max-w-3xl p-6">
            {/* POS Integration */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-gray-500" />
                    Sanal POS Entegrasyonu
                </h3>

                <div className="grid grid-cols-1 gap-6">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                            <span className="font-medium text-gray-900">Aktif</span>
                            <p className="text-sm text-gray-500">POS entegrasyonunu etkinleştir</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.enabled}
                                onChange={e => handleChange('enabled', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {config.enabled && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Sağlayıcı</label>
                                <select
                                    value={config.provider}
                                    onChange={e => handleChange('provider', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                >
                                    <option value="paytr">PayTR</option>
                                    <option value="iyzico">Iyzico (Yakında)</option>
                                    <option value="stripe">Stripe (Yakında)</option>
                                </select>
                            </div>

                            <div className="space-y-4 border-t pt-4">
                                <h4 className="text-sm font-medium text-gray-900">PayTR Ayarları</h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700">Mağaza No (Merchant ID)</label>
                                        <input
                                            type="text"
                                            value={config.merchant_id}
                                            onChange={e => handleChange('merchant_id', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                            placeholder="örn. 123456"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Mağaza Parola (Merchant Key)</label>
                                        <input
                                            type="text"
                                            value={config.merchant_key}
                                            onChange={e => handleChange('merchant_key', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                            placeholder="Gizli anahtar"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Mağaza Gizli Anahtar (Merchant Salt)</label>
                                        <input
                                            type="text"
                                            value={config.merchant_salt}
                                            onChange={e => handleChange('merchant_salt', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                            placeholder="Gizli tuz (salt)"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={config.test_mode}
                                        onChange={e => handleChange('test_mode', e.target.checked)}
                                        id="test_mode"
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="test_mode" className="text-sm text-gray-700 select-none">
                                        Test Modu (Gerçek para çekilmez)
                                    </label>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Invoice Integration */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-500" />
                    Fatura Entegrasyonu
                </h3>

                <div className="grid grid-cols-1 gap-6">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                            <span className="font-medium text-gray-900">Aktif</span>
                            <p className="text-sm text-gray-500">Fatura entegrasyonunu etkinleştir</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={invoiceConfig.enabled}
                                onChange={e => handleInvoiceChange('enabled', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {invoiceConfig.enabled && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Sağlayıcı</label>
                                <select
                                    value={invoiceConfig.provider}
                                    onChange={e => handleInvoiceChange('provider', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                >
                                    <option value="birfatura">BirFatura</option>
                                    <option value="others">Diğer (Yakında)</option>
                                </select>
                            </div>

                            <div className="space-y-4 border-t pt-4">
                                <h4 className="text-sm font-medium text-gray-900">BirFatura Ayarları</h4>
                                <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-700 mb-4">
                                    Integration Key (Entegrasyon Anahtarı) sistem ayarlarından otomatik olarak alınacaktır.
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">API Key</label>
                                        <input
                                            type="text"
                                            value={invoiceConfig.api_key}
                                            onChange={e => handleInvoiceChange('api_key', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border font-mono"
                                            placeholder="Abone'ye özel API Key"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Secret Key</label>
                                        <input
                                            type="text"
                                            value={invoiceConfig.secret_key}
                                            onChange={e => handleInvoiceChange('secret_key', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border font-mono"
                                            placeholder="Abone'ye özel Secret Key"
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* SMS Integration */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-gray-500" />
                    SMS Entegrasyonu
                </h3>

                <div className="grid grid-cols-1 gap-6">
                    {loadingSmsConfig ? (
                        <div className="p-4 text-center text-gray-500">Yükleniyor...</div>
                    ) : !canEnableSms ? (
                        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                            <p className="text-sm text-yellow-800">
                                SMS entegrasyonunu aktifleştirmek için önce tenant'ın SMS API bilgilerini (API Username ve Documents Email) doldurması gerekiyor.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <span className="font-medium text-gray-900">Aktif</span>
                                    <p className="text-sm text-gray-500">SMS entegrasyonunu etkinleştir</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={smsConfig.enabled}
                                        onChange={e => handleSmsChange('enabled', e.target.checked)}
                                        disabled={!canEnableSms}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"></div>
                                </label>
                            </div>

                            {smsConfig.enabled && (
                                <div className="space-y-4 border-t pt-4">
                                    <div className="bg-green-50 p-4 rounded-md text-sm text-green-700">
                                        <p className="font-medium mb-1">SMS Entegrasyonu Aktif</p>
                                        <p>Tenant artık SMS belge yükleme alanını görebilir ve SMS başvurusu yapabilir.</p>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">API Username:</span>
                                            <span className="font-medium">{smsConfigData?.apiUsername || '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Documents Email:</span>
                                            <span className="font-medium">{smsConfigData?.documentsEmail || '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Belgeler Gönderildi:</span>
                                            <span className={`font-medium ${smsConfigData?.documentsSubmitted ? 'text-green-600' : 'text-gray-400'}`}>
                                                {smsConfigData?.documentsSubmitted ? 'Evet' : 'Hayır'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Tüm Belgeler Onaylı:</span>
                                            <span className={`font-medium ${smsConfigData?.allDocumentsApproved ? 'text-green-600' : 'text-gray-400'}`}>
                                                {smsConfigData?.allDocumentsApproved ? 'Evet' : 'Hayır'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="mt-6 flex justify-end">
                <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                    {isPending ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
                </button>
            </div>
        </form>
    );
};
