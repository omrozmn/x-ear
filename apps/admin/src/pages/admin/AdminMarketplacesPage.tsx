import React, { useState } from 'react';
import {
    useGetMarketplaceIntegrations,
    useCreateMarketplaceIntegration,
    useSyncMarketplaceIntegration
} from '@/lib/api-client';
import {
    ShoppingBag,
    PlusIcon,
    RefreshCw,
    CheckCircle,
    AlertCircle,
    Settings
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminMarketplacesPage: React.FC = () => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Form state
    const [platform, setPlatform] = useState('trendyol');
    const [name, setName] = useState('');
    const [tenantId, setTenantId] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [apiSecret, setApiSecret] = useState('');
    const [sellerId, setSellerId] = useState('');

    const { data: integrationsData, isLoading, refetch } = useGetMarketplaceIntegrations({});
    const createMutation = useCreateMarketplaceIntegration();
    const syncMutation = useSyncMarketplaceIntegration();

    const integrations = (integrationsData as any)?.data || [];

    const handleCreate = async () => {
        if (!name || !tenantId || !apiKey || !sellerId) {
            toast.error('Lütfen zorunlu alanları doldurun');
            return;
        }

        try {
            await createMutation.mutateAsync({
                data: {
                    platform,
                    name,
                    tenantId,
                    apiKey,
                    apiSecret,
                    sellerId,
                    syncStock: true,
                    syncPrices: true,
                    syncOrders: true
                }
            });
            toast.success('Entegrasyon oluşturuldu');
            setIsCreateModalOpen(false);
            refetch();
        } catch (error) {
            toast.error('Entegrasyon oluşturulamadı');
        }
    };

    const handleSync = async (id: string) => {
        try {
            await syncMutation.mutateAsync({ integrationId: id });
            toast.success('Senkronizasyon başlatıldı');
            refetch();
        } catch (error) {
            toast.error('Senkronizasyon hatası');
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Pazaryeri Entegrasyonları</h1>
                    <p className="text-gray-500">Trendyol, Hepsiburada, N11 ve Amazon mağaza yönetimi</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Yeni Mağaza Ekle
                </button>
            </div>

            {/* Integrations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <div className="col-span-3 text-center py-12">Yükleniyor...</div>
                ) : integrations.length === 0 ? (
                    <div className="col-span-3 text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                        <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-gray-500">Henüz entegrasyon eklenmemiş</p>
                    </div>
                ) : (
                    integrations.map((integration: any) => (
                        <div key={integration.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className={`p-2 rounded-lg ${integration.platform === 'trendyol' ? 'bg-orange-100 text-orange-600' :
                                        integration.platform === 'hepsiburada' ? 'bg-orange-100 text-orange-800' :
                                            integration.platform === 'n11' ? 'bg-red-100 text-red-600' :
                                                'bg-gray-100 text-gray-600'
                                        }`}>
                                        <ShoppingBag className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{integration.name}</h3>
                                        <p className="text-xs text-gray-500 capitalize">{integration.platform}</p>
                                    </div>
                                </div>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${integration.status === 'connected' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                    }`}>
                                    {integration.status === 'connected' ? 'Bağlı' : 'Hata'}
                                </span>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Tenant ID</span>
                                    <span className="font-mono text-xs">{integration.tenantId.substring(0, 8)}...</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Son Senkronizasyon</span>
                                    <span>{integration.lastSyncAt ? new Date(integration.lastSyncAt).toLocaleString('tr-TR') : '-'}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Stok Eşitleme</span>
                                    <span>{integration.syncStock ? 'Aktif' : 'Pasif'}</span>
                                </div>
                            </div>

                            <div className="flex space-x-3">
                                <button
                                    onClick={() => handleSync(integration.id)}
                                    disabled={syncMutation.isPending}
                                    className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                                    Senkronize Et
                                </button>
                                <button className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-500">
                                    <Settings className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Yeni Mağaza Ekle</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Platform</label>
                                <select
                                    value={platform}
                                    onChange={(e) => setPlatform(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                >
                                    <option value="trendyol">Trendyol</option>
                                    <option value="hepsiburada">Hepsiburada</option>
                                    <option value="n11">N11</option>
                                    <option value="amazon">Amazon</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Mağaza Adı</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                    placeholder="Örn: X-Ear Trendyol"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Tenant ID</label>
                                <input
                                    type="text"
                                    value={tenantId}
                                    onChange={(e) => setTenantId(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                    placeholder="tnt_..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Satıcı ID (Seller ID)</label>
                                <input
                                    type="text"
                                    value={sellerId}
                                    onChange={(e) => setSellerId(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">API Key</label>
                                <input
                                    type="text"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">API Secret</label>
                                <input
                                    type="password"
                                    value={apiSecret}
                                    onChange={(e) => setApiSecret(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                />
                            </div>

                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={createMutation.isPending}
                                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                                >
                                    {createMutation.isPending ? 'Ekleniyor...' : 'Ekle'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminMarketplacesPage;
