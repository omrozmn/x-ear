import React, { useState } from 'react';
import { useGetApiKeys, useCreateApiKey, useRevokeApiKey } from '@/lib/api-client';
import {
    KeyIcon,
    PlusIcon,
    TrashIcon,
    ClipboardIcon,
    CheckIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const AdminApiKeysPage: React.FC = () => {
    const [page, setPage] = useState(1);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newKey, setNewKey] = useState<string | null>(null);

    // Create form state
    const [keyName, setKeyName] = useState('');
    const [tenantId, setTenantId] = useState('');
    const [scopes, setScopes] = useState<string[]>([]);

    const { data: keysData, isLoading, refetch } = useGetApiKeys({ page, limit: 10 });
    const createApiKeyMutation = useCreateApiKey();
    const revokeApiKeyMutation = useRevokeApiKey();

    const keys = (keysData as any)?.data?.keys || [];
    const pagination = (keysData as any)?.data?.pagination;

    const handleCreate = async () => {
        if (!keyName || !tenantId) {
            toast.error('İsim ve Tenant ID zorunludur');
            return;
        }

        try {
            const result = await createApiKeyMutation.mutateAsync({
                data: {
                    name: keyName,
                    tenantId,
                    scopes,
                    rateLimit: 1000
                }
            });

            if ((result as any).data?.apiKey) {
                setNewKey((result as any).data.apiKey);
                toast.success('API Anahtarı oluşturuldu');
                refetch();
            }
        } catch (error) {
            toast.error('API Anahtarı oluşturulamadı');
            console.error(error);
        }
    };

    const handleRevoke = async (keyId: string) => {
        if (!confirm('Bu anahtarı silmek istediğinize emin misiniz?')) return;

        try {
            await revokeApiKeyMutation.mutateAsync({ id: keyId });
            toast.success('API Anahtarı silindi');
            refetch();
        } catch (error) {
            toast.error('Silme işlemi başarısız');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Kopyalandı');
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">API Anahtarları</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Developer Portal ve Entegrasyonlar için API anahtarı yönetimi
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Yeni Anahtar
                </button>
            </div>

            {/* List */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                {isLoading ? (
                    <div className="p-6 text-center">Yükleniyor...</div>
                ) : keys.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <KeyIcon className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2">Henüz API anahtarı oluşturulmamış</p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İsim / Prefix</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kapsam (Scopes)</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Oluşturulma</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {keys.map((key: any) => (
                                <tr key={key.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{key.name}</div>
                                        <div className="text-xs text-gray-500 font-mono">{key.prefix}...</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {key.tenantId}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {key.scopes.join(', ') || 'Full Access'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${key.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                            {key.isActive ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(key.createdAt).toLocaleDateString('tr-TR')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleRevoke(key.id)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Yeni API Anahtarı</h3>

                        {!newKey ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Anahtar İsmi</label>
                                    <input
                                        type="text"
                                        value={keyName}
                                        onChange={(e) => setKeyName(e.target.value)}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                        placeholder="Örn: Mobil Uygulama"
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
                                    <label className="block text-sm font-medium text-gray-700">Yetkiler (Opsiyonel)</label>
                                    <div className="mt-2 space-y-2">
                                        {['read:patients', 'write:patients', 'read:appointments', 'write:appointments'].map(scope => (
                                            <label key={scope} className="inline-flex items-center mr-4">
                                                <input
                                                    type="checkbox"
                                                    checked={scopes.includes(scope)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setScopes([...scopes, scope]);
                                                        else setScopes(scopes.filter(s => s !== scope));
                                                    }}
                                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                                />
                                                <span className="ml-2 text-sm text-gray-600">{scope}</span>
                                            </label>
                                        ))}
                                    </div>
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
                                        disabled={createApiKeyMutation.isPending}
                                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                                    >
                                        {createApiKeyMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center">
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                                    <CheckIcon className="h-6 w-6 text-green-600" />
                                </div>
                                <h3 className="mt-2 text-lg font-medium text-gray-900">Anahtar Oluşturuldu</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    Bu anahtarı güvenli bir yere kaydedin. Bir daha göremeyeceksiniz.
                                </p>
                                <div className="mt-4 flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200">
                                    <code className="text-sm font-mono text-gray-800 break-all">{newKey}</code>
                                    <button
                                        onClick={() => copyToClipboard(newKey)}
                                        className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                                    >
                                        <ClipboardIcon className="h-5 w-5" />
                                    </button>
                                </div>
                                <div className="mt-6">
                                    <button
                                        onClick={() => {
                                            setIsCreateModalOpen(false);
                                            setNewKey(null);
                                            setKeyName('');
                                            setTenantId('');
                                            setScopes([]);
                                        }}
                                        className="w-full inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
                                    >
                                        Tamam
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminApiKeysPage;
