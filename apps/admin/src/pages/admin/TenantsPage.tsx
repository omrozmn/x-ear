import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Eye, Edit, Ban, CheckCircle, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import * as Dialog from '@radix-ui/react-dialog';
import { XMarkIcon } from '@heroicons/react/24/outline';
import {
    useGetAdminTenants,
    usePutAdminTenantsIdStatus,
    useGetAdminTenantsIdUsers,
    Tenant,
    TenantStatus,
    User
} from '@/lib/api-client';

// Map our local TenantStatus enum to the API's expected string values if needed, 
// or just use the strings directly if the API types match.
// Based on OpenAPI, status is enum: [active, trial, suspended, cancelled]

const TenantUsersModal = ({ tenantId, isOpen, onClose }: { tenantId: string | null, isOpen: boolean, onClose: () => void }) => {
    const { data: usersData, isLoading, error } = useGetAdminTenantsIdUsers(tenantId!, {
        query: { enabled: !!tenantId && isOpen }
    });

    const users = usersData?.data?.users || [];

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow" />
                <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[800px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none data-[state=open]:animate-contentShow overflow-y-auto">
                    <div className="flex justify-between items-center mb-4">
                        <Dialog.Title className="text-xl font-medium text-gray-900">
                            Kiracı Kullanıcıları
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button
                                className="inline-flex h-[25px] w-[25px] appearance-none items-center justify-center rounded-full focus:shadow-[0_0_0_2px] focus:outline-none hover:bg-gray-100"
                                aria-label="Close"
                            >
                                <XMarkIcon className="h-5 w-5 text-gray-500" />
                            </button>
                        </Dialog.Close>
                    </div>

                    {isLoading ? (
                        <div className="p-6 text-center">Yükleniyor...</div>
                    ) : error ? (
                        <div className="p-6 text-center text-red-600">Kullanıcılar yüklenirken hata oluştu</div>
                    ) : users.length === 0 ? (
                        <div className="p-6 text-center text-gray-500">Bu kiracıya ait kullanıcı bulunamadı.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanıcı Adı</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Son Giriş</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {users.map((user: User) => (
                                        <tr key={user.id}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                {user.username}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {user.email}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {user.role}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {user.is_active ? 'Aktif' : 'Pasif'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {user.last_login ? new Date(user.last_login).toLocaleString('tr-TR') : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default function TenantsPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [page, setPage] = useState(1);
    const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    // Fetch tenants
    const { data: tenantsData, isLoading, error } = useGetAdminTenants({
        page,
        limit: 10,
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? (statusFilter as TenantStatus) : undefined
    });

    const tenants = tenantsData?.data?.tenants || [];
    const pagination = tenantsData?.data?.pagination;

    // Status update mutation
    const { mutateAsync: updateStatus } = usePutAdminTenantsIdStatus();

    const handleStatusChange = async (tenantId: string, newStatus: string) => {
        if (window.confirm(`Kiracı durumunu ${newStatus} olarak değiştirmek istediğinize emin misiniz?`)) {
            try {
                await updateStatus({
                    id: tenantId,
                    data: { status: newStatus as any }
                });
                queryClient.invalidateQueries({ queryKey: ['getAdminTenants'] });
                toast.success('Kiracı durumu güncellendi');
            } catch (error: any) {
                toast.error(error.response?.data?.error?.message || 'Durum güncellenemedi');
            }
        }
    };

    const getStatusBadge = (status: string | undefined) => {
        if (!status) return null;

        const statusClasses: Record<string, string> = {
            [TenantStatus.active]: 'bg-green-100 text-green-800',
            [TenantStatus.suspended]: 'bg-yellow-100 text-yellow-800',
            [TenantStatus.cancelled]: 'bg-red-100 text-red-800',
            [TenantStatus.trial]: 'bg-blue-100 text-blue-800'
        };

        const statusLabels: Record<string, string> = {
            [TenantStatus.active]: 'Aktif',
            [TenantStatus.suspended]: 'Askıda',
            [TenantStatus.cancelled]: 'İptal',
            [TenantStatus.trial]: 'Deneme'
        };

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
                {statusLabels[status] || status}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Kiracılar</h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Kiracı organizasyonlarını ve ayarlarını yönetin
                    </p>
                </div>
                <button
                    type="button"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    <Plus className="-ml-1 mr-2 h-5 w-5" />
                    Kiracı Ekle
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white shadow rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Kiracı ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">Tüm Durumlar</option>
                        <option value="active">Aktif</option>
                        <option value="trial">Deneme</option>
                        <option value="suspended">Askıya Alınmış</option>
                        <option value="cancelled">İptal Edilmiş</option>
                    </select>

                    {/* Results count */}
                    <div className="flex items-center text-sm text-gray-500">
                        {pagination && (
                            <span>
                                {pagination.total} sonuçtan {((page - 1) * 10) + 1}-{Math.min(page * 10, pagination.total || 0)} arası gösteriliyor
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Tenants Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2 text-sm text-gray-500">Kiracılar yükleniyor...</p>
                    </div>
                ) : error ? (
                    <div className="p-12 text-center">
                        <p className="text-red-600">Kiracılar yüklenirken hata oluştu</p>
                        <button
                            onClick={() => queryClient.invalidateQueries({ queryKey: ['getAdminTenants'] })}
                            className="mt-2 text-sm text-blue-600 hover:text-blue-500 underline"
                        >
                            Tekrar Dene
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Organizasyon
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Durum
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Plan
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Kullanıcılar
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Oluşturulma
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            İşlemler
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {tenants.map((tenant) => (
                                        <tr key={tenant.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {tenant.name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {tenant.slug}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(tenant.status)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {tenant.current_plan || 'Plan Yok'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {tenant.current_users || 0} / {tenant.max_users || '∞'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {tenant.created_at ? new Date(tenant.created_at).toLocaleDateString('tr-TR') : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end space-x-2">
                                                    <button
                                                        onClick={() => setSelectedTenantId(tenant.id!)}
                                                        className="text-purple-600 hover:text-purple-900"
                                                        title="Kullanıcılar"
                                                    >
                                                        <Users className="h-5 w-5" />
                                                    </button>
                                                    <button className="text-blue-600 hover:text-blue-900" title="Görüntüle">
                                                        <Eye className="h-5 w-5" />
                                                    </button>
                                                    <button className="text-gray-600 hover:text-gray-900" title="Düzenle">
                                                        <Edit className="h-5 w-5" />
                                                    </button>
                                                    {tenant.status === TenantStatus.active && (
                                                        <button
                                                            onClick={() => handleStatusChange(tenant.id!, TenantStatus.suspended)}
                                                            className="text-yellow-600 hover:text-yellow-900"
                                                            title="Askıya Al"
                                                        >
                                                            <Ban className="h-5 w-5" />
                                                        </button>
                                                    )}
                                                    {tenant.status === TenantStatus.suspended && (
                                                        <button
                                                            onClick={() => handleStatusChange(tenant.id!, TenantStatus.active)}
                                                            className="text-green-600 hover:text-green-900"
                                                            title="Aktifleştir"
                                                        >
                                                            <CheckCircle className="h-5 w-5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination && (pagination.totalPages || 0) > 1 && (
                            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                                <div className="flex-1 flex justify-between sm:hidden">
                                    <button
                                        onClick={() => setPage(page - 1)}
                                        disabled={page === 1}
                                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Önceki
                                    </button>
                                    <button
                                        onClick={() => setPage(page + 1)}
                                        disabled={page === pagination.totalPages}
                                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Sonraki
                                    </button>
                                </div>
                                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            <span className="font-medium">{page}</span> / <span className="font-medium">{pagination.totalPages}</span> sayfa gösteriliyor
                                        </p>
                                    </div>
                                    <div>
                                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                            <button
                                                onClick={() => setPage(page - 1)}
                                                disabled={page === 1}
                                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Önceki
                                            </button>
                                            <button
                                                onClick={() => setPage(page + 1)}
                                                disabled={page === pagination.totalPages}
                                                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Sonraki
                                            </button>
                                        </nav>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <TenantUsersModal
                tenantId={selectedTenantId}
                isOpen={!!selectedTenantId}
                onClose={() => setSelectedTenantId(null)}
            />
        </div>
    );
}
