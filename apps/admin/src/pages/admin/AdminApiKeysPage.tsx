import React, { useState } from 'react';
import { useListAdminApiKeys, useCreateAdminApiKey, useDeleteAdminApiKey } from '@/lib/api-client';
import type { ApiKeyCreate, ApiKeyDetailResponse, ApiKeyListResponse } from '@/api/generated/schemas';
import {
    KeyIcon,
    PlusIcon,
    TrashIcon,
    ClipboardIcon,
    CheckIcon,
    MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useAdminResponsive } from '@/hooks/useAdminResponsive';
import { ResponsiveTable } from '@/components/responsive';
import Pagination from '@/components/ui/Pagination';

interface AdminApiKey {
    id: string;
    name?: string;
    prefix?: string;
    tenantId?: string;
    scopes: string[];
    isActive?: boolean;
    createdAt?: string;
}

interface ApiKeyListShape {
    keys?: AdminApiKey[];
    data?: {
        keys?: AdminApiKey[];
        pagination?: {
            total?: number;
            totalPages?: number;
        };
    } | AdminApiKey[];
    pagination?: {
        total?: number;
        totalPages?: number;
    };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function extractApiKeys(value: ApiKeyListResponse | undefined): { keys: AdminApiKey[]; totalPages: number; totalItems: number } {
    if (!isRecord(value)) {
        return { keys: [], totalPages: 1, totalItems: 0 };
    }

    const response = value as unknown as ApiKeyListShape;
    const nestedData = response.data;

    if (Array.isArray(nestedData)) {
        return {
            keys: nestedData,
            totalPages: response.pagination?.totalPages || 1,
            totalItems: response.pagination?.total || nestedData.length,
        };
    }

    const keys = response.keys ?? nestedData?.keys ?? [];
    return {
        keys,
        totalPages: response.pagination?.totalPages ?? nestedData?.pagination?.totalPages ?? 1,
        totalItems: response.pagination?.total ?? nestedData?.pagination?.total ?? keys.length,
    };
}

function extractCreatedApiKey(value: ApiKeyDetailResponse): string | null {
    if (!isRecord(value.data)) {
        return null;
    }

    const data = value.data as Record<string, unknown>;
    return typeof data.apiKey === 'string' ? data.apiKey : null;
}

const AdminApiKeysPage: React.FC = () => {
    const { isMobile } = useAdminResponsive();
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState('');
    const [selectedKeyIds, setSelectedKeyIds] = useState<string[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newKey, setNewKey] = useState<string | null>(null);

    const [keyName, setKeyName] = useState('');
    const [tenantId, setTenantId] = useState('');
    const [scopes, setScopes] = useState<string[]>([]);

    const { data: keysData, isLoading, refetch } = useListAdminApiKeys({ page, limit });
    const createApiKeyMutation = useCreateAdminApiKey();
    const revokeApiKeyMutation = useDeleteAdminApiKey();

    const { keys, totalPages, totalItems } = extractApiKeys(keysData);
    const filteredKeys = keys.filter((key) => {
        const query = search.trim().toLowerCase();
        if (!query) {
            return true;
        }

        return [key.name, key.prefix, key.tenantId, key.scopes.join(', ')]
            .some((value) => (value || '').toLowerCase().includes(query));
    });

    const handleCreate = async () => {
        if (!keyName || !tenantId) {
            toast.error('İsim ve Tenant ID zorunludur');
            return;
        }

        try {
            const payload: ApiKeyCreate & { tenantId: string } = {
                name: keyName,
                tenantId,
                scopes,
                rateLimit: 1000,
            };

            const result = await createApiKeyMutation.mutateAsync({ data: payload });
            const createdApiKey = extractCreatedApiKey(result);

            if (createdApiKey) {
                setNewKey(createdApiKey);
                toast.success('API Anahtarı oluşturuldu');
                refetch();
            }
        } catch (error) {
            toast.error('API Anahtarı oluşturulamadı');
            console.error(error);
        }
    };

    const handleRevoke = async (keyId: string) => {
        if (!confirm('Bu anahtarı silmek istediğinize emin misiniz?')) {
            return;
        }

        try {
            await revokeApiKeyMutation.mutateAsync({ keyId });
            toast.success('API Anahtarı silindi');
            setSelectedKeyIds((prev) => prev.filter((id) => id !== keyId));
            refetch();
        } catch (error) {
            toast.error('Silme işlemi başarısız');
        }
    };

    const handleBulkRevoke = async () => {
        if (selectedKeyIds.length === 0) {
            toast.error('Secili API anahtari yok');
            return;
        }

        if (!confirm(`${selectedKeyIds.length} API anahtari silinsin mi?`)) {
            return;
        }

        try {
            await Promise.all(selectedKeyIds.map((keyId) => revokeApiKeyMutation.mutateAsync({ keyId })));
            toast.success(`${selectedKeyIds.length} API anahtari silindi`);
            setSelectedKeyIds([]);
            refetch();
        } catch (error) {
            toast.error('Toplu silme işlemi başarısız');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Kopyalandı');
    };

    const columns = [
        {
            key: 'name',
            header: 'İsim / Prefix',
            render: (key: AdminApiKey) => (
                <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{key.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{key.prefix}...</div>
                </div>
            )
        },
        {
            key: 'tenantId',
            header: 'Tenant',
            mobileHidden: true,
            render: (key: AdminApiKey) => (
                <span className="text-sm text-gray-500 dark:text-gray-400">{key.tenantId}</span>
            )
        },
        {
            key: 'scopes',
            header: 'Kapsam',
            mobileHidden: true,
            render: (key: AdminApiKey) => (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {key.scopes.join(', ') || 'Full Access'}
                </span>
            )
        },
        {
            key: 'isActive',
            header: 'Durum',
            render: (key: AdminApiKey) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    key.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                }`}>
                    {key.isActive ? 'Aktif' : 'Pasif'}
                </span>
            )
        },
        {
            key: 'createdAt',
            header: 'Oluşturulma',
            mobileHidden: true,
            render: (key: AdminApiKey) => (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {key.createdAt ? new Date(key.createdAt).toLocaleDateString('tr-TR') : '-'}
                </span>
            )
        },
        {
            key: 'actions',
            header: 'İşlem',
            render: (key: AdminApiKey) => (
                <button
                    onClick={() => handleRevoke(key.id)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 touch-feedback"
                >
                    <TrashIcon className="h-5 w-5" />
                </button>
            )
        }
    ];

    return (
        <div className={isMobile ? 'p-4 pb-safe' : 'p-6'}>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                        API Anahtarları
                    </h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Developer Portal ve Entegrasyonlar için API anahtarı yönetimi
                    </p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600 touch-feedback"
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    {!isMobile && 'Yeni Anahtar'}
                </button>
            </div>

	            <div className="bg-white dark:bg-gray-800 shadow rounded-2xl overflow-hidden">
                <div className="border-b border-gray-200 dark:border-gray-700 p-4">
                    <div className="relative max-w-md">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                            placeholder="İsim, prefix, tenant veya scope ara..."
                            className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white pl-10 pr-3 py-2 text-sm focus:border-primary-500 focus:ring-primary-500"
                        />
                    </div>
                </div>
                {isLoading ? (
                    <div className="p-6 text-center text-gray-500 dark:text-gray-400">Yükleniyor...</div>
                ) : keys.length === 0 ? (
                    <div className="p-12 text-center text-gray-500 dark:text-gray-400">
                        <KeyIcon className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                        <p className="mt-2">Henüz API anahtarı oluşturulmamış</p>
                    </div>
                ) : (
                    <>
                        <ResponsiveTable
                            data={filteredKeys}
                            columns={columns}
                            keyExtractor={(key) => key.id}
                            emptyMessage="API anahtarı bulunamadı"
                            selectable
                            selectedKeys={selectedKeyIds}
                            onSelectionChange={setSelectedKeyIds}
                            selectionLabel="anahtar secildi"
                            bulkActions={(
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedKeyIds(filteredKeys.map((key) => key.id))}
                                        className="rounded-xl border border-primary-200 bg-white px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-100"
                                    >
                                        Tumunu sec
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedKeyIds([])}
                                        className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                                    >
                                        Secimi temizle
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleBulkRevoke}
                                        className="rounded-xl bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                                    >
                                        Secilenleri sil
                                    </button>
                                </>
                            )}
                        />
                        <div className="bg-gray-50 dark:bg-gray-700/50 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                            <Pagination
                                currentPage={page}
                                totalPages={totalPages}
                                totalItems={search ? filteredKeys.length : totalItems}
                                itemsPerPage={limit}
                                onPageChange={setPage}
                                onItemsPerPageChange={(nextLimit) => {
                                    setLimit(nextLimit);
                                    setPage(1);
                                }}
                            />
                        </div>
                    </>
                )}
            </div>

            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full p-6">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Yeni API Anahtarı</h3>

                        {!newKey ? (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Anahtar İsmi</label>
                                    <input
                                        type="text"
                                        value={keyName}
                                        onChange={(e) => setKeyName(e.target.value)}
                                        className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                        placeholder="Orn: Mobil Uygulama"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Tenant ID</label>
                                    <input
                                        type="text"
                                        value={tenantId}
                                        onChange={(e) => setTenantId(e.target.value)}
                                        className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                        placeholder="tnt_..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Yetkiler (Opsiyonel)</label>
                                    <div className="mt-2 space-y-2">
                                        {['read:patients', 'write:patients', 'read:appointments', 'write:appointments'].map((scope) => (
                                            <label key={scope} className="inline-flex items-center mr-4">
                                                <input
                                                    type="checkbox"
                                                    checked={scopes.includes(scope)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setScopes([...scopes, scope]);
                                                        } else {
                                                            setScopes(scopes.filter((item) => item !== scope));
                                                        }
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
                                        className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                                    >
                                        Iptal
                                    </button>
                                    <button
                                        onClick={handleCreate}
                                        disabled={createApiKeyMutation.isPending}
                                        className="px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                                    >
                                        {createApiKeyMutation.isPending ? 'Olusturuluyor...' : 'Olustur'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center">
                                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                                    <CheckIcon className="h-6 w-6 text-green-600" />
                                </div>
                                <h3 className="mt-2 text-lg font-medium text-gray-900">Anahtar Olusturuldu</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    Bu anahtari guvenli bir yere kaydedin. Bir daha goremeyeceksiniz.
                                </p>
                                <div className="mt-4 flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                                    <code className="text-sm font-mono text-gray-800 break-all">{newKey}</code>
                                    <button
                                        onClick={() => copyToClipboard(newKey)}
                                        className="ml-2 p-1 text-gray-400 hover:text-gray-600"
                                    >
                                        <ClipboardIcon className="h-5 w-5" />
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
