import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Search, CheckCircle, Users, Trash2, AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '@/components/ui/Pagination';
import { TenantEditModal, TenantCreateModal } from './tenants';
import { PRODUCT_REGISTRY, getProductConfig } from '@/config/productRegistry';
import {
    useListAdminTenants,
    useUpdateAdminTenantStatus
} from '@/lib/api-client';
import * as Dialog from '@radix-ui/react-dialog';

type TenantStatus = 'active' | 'trial' | 'suspended' | 'cancelled';

export default function TenantsPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [productFilter, setProductFilter] = useState<string>('all');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [selectedTenantForStatus, setSelectedTenantForStatus] = useState<{ id: string, status: string } | null>(null);
    const queryClient = useQueryClient();

    const { data: tenantsData, isLoading } = useListAdminTenants({
        page,
        limit,
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? (statusFilter as TenantStatus) : undefined,
        // @ts-ignore - API client not regenerated yet
        product_code: productFilter !== 'all' ? productFilter : undefined
    } as any);

    const tenants = (tenantsData as any)?.data?.tenants || (tenantsData as any)?.tenants || [];
    const pagination = (tenantsData as any)?.data?.pagination || (tenantsData as any)?.pagination;

    const { mutateAsync: updateStatus } = useUpdateAdminTenantStatus();

    const handleStatusChange = (tenantId: string, newStatus: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedTenantForStatus({ id: tenantId, status: newStatus });
        setStatusModalOpen(true);
    };

    const confirmStatusChange = async () => {
        if (!selectedTenantForStatus) return;

        const { id, status } = selectedTenantForStatus;

        await toast.promise(
            (async () => {
                await updateStatus({
                    tenantId: id,
                    data: { status: status as any }
                });
                // Invalidate both potential key formats to be safe
                await queryClient.invalidateQueries({ queryKey: ['/admin/tenants'] });
                await queryClient.invalidateQueries({ queryKey: ['/api/admin/tenants'] });
            })(),
            {
                loading: 'Durum güncelleniyor...',
                success: 'Abone durumu güncellendi',
                error: 'Durum güncellenemedi'
            }
        );
        setStatusModalOpen(false);
        setSelectedTenantForStatus(null);
    };

    const handleDelete = async (tenantId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Bu aboneyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) {
            toast.error('Silme işlemi henüz aktif değil');
        }
    };

    return (
        <div className="p-6">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-semibold text-gray-900">Aboneler</h1>
                    <p className="mt-2 text-sm text-gray-700">
                        Sistemdeki tüm abonelerin listesi ve yönetimi.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Yeni Abone Ekle
                    </button>
                </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:w-96">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        className="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        placeholder="Abone ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-full sm:w-48">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    >
                        <option value="all">Tüm Durumlar</option>
                        <option value="active">Aktif</option>
                        <option value="trial">Deneme</option>
                        <option value="suspended">Askıya Alınmış</option>
                        <option value="cancelled">İptal Edilmiş</option>
                    </select>
                </div>
                <div className="w-full sm:w-48">
                    <select
                        value={productFilter}
                        onChange={(e) => setProductFilter(e.target.value)}
                        className="block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    >
                        <option value="all">Tüm Ürünler</option>
                        {Object.entries(PRODUCT_REGISTRY).map(([key, config]) => (
                            <option key={key} value={key}>{config.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="mt-8 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                                            Organizasyon
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Durum
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Ürün
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Plan
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Kullanıcılar
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Oluşturulma
                                        </th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                            <span className="sr-only">İşlemler</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-4">Yükleniyor...</td>
                                        </tr>
                                    ) : tenants.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="text-center py-4 text-gray-500">Kayıt bulunamadı</td>
                                        </tr>
                                    ) : (
                                        tenants.map((tenant: any) => {
                                            const productCode = tenant.productCode || tenant.product_code;
                                            const productConfig = getProductConfig(productCode);
                                            return (
                                                <tr
                                                    key={tenant.id}
                                                    className="hover:bg-gray-50 cursor-pointer"
                                                    onClick={() => setSelectedTenantId(tenant.id!)}
                                                >
                                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                                                        <div className="flex items-center">
                                                            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                                {tenant.name?.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="ml-4">
                                                                <div className="font-medium text-gray-900">{tenant.name}</div>
                                                                <div className="text-gray-500">{tenant.ownerEmail || tenant.owner_email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 
                                                        ${tenant.status === 'active' ? 'bg-green-100 text-green-800' :
                                                                tenant.status === 'trial' ? 'bg-blue-100 text-blue-800' :
                                                                    tenant.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                                                                        'bg-red-100 text-red-800'}`}>
                                                            {tenant.status === 'active' ? 'Aktif' :
                                                                tenant.status === 'trial' ? 'Deneme' :
                                                                    tenant.status === 'suspended' ? 'Askıda' : 'İptal'}
                                                        </span>
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${productConfig.badge === 'purple' ? 'bg-purple-50 text-purple-700 ring-purple-600/20' :
                                                            productConfig.badge === 'green' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                                                                productConfig.badge === 'red' ? 'bg-red-50 text-red-700 ring-red-600/20' :
                                                                    productConfig.badge === 'orange' ? 'bg-orange-50 text-orange-700 ring-orange-600/20' :
                                                                        'bg-blue-50 text-blue-700 ring-blue-600/20'
                                                            }`}>
                                                            {productConfig.name}
                                                        </span>
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                        {tenant.currentPlan || tenant.current_plan || 'Plan Yok'}
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                        <div className="flex items-center">
                                                            <Users className="mr-1.5 h-4 w-4 text-gray-400" />
                                                            Max: {tenant.maxUsers || tenant.max_users}
                                                        </div>
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                        {(tenant.createdAt || tenant.created_at) ? new Date(tenant.createdAt || tenant.created_at).toLocaleDateString('tr-TR') : '-'}
                                                    </td>
                                                    <td className="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                        <div className="flex justify-end space-x-2">
                                                            {tenant.status !== 'active' && (
                                                                <button
                                                                    onClick={(e) => handleStatusChange(tenant.id!, 'active', e)}
                                                                    className="text-green-600 hover:text-green-900"
                                                                    title="Aktifleştir"
                                                                >
                                                                    <CheckCircle className="h-5 w-5" />
                                                                </button>
                                                            )}
                                                            {tenant.status === 'active' && (
                                                                <button
                                                                    onClick={(e) => handleStatusChange(tenant.id!, 'suspended', e)}
                                                                    className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                                                                >
                                                                    Askıya Al
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={(e) => handleDelete(tenant.id!, e)}
                                                                className="text-red-600 hover:text-red-900"
                                                                title="Sil"
                                                            >
                                                                <Trash2 className="h-5 w-5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <Pagination
                currentPage={page}
                totalPages={pagination?.totalPages || 1}
                totalItems={pagination?.total || 0}
                itemsPerPage={limit}
                onPageChange={setPage}
                onItemsPerPageChange={setLimit}
            />

            <TenantEditModal
                tenantId={selectedTenantId}
                isOpen={!!selectedTenantId}
                onClose={() => setSelectedTenantId(null)}
            />

            <TenantCreateModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />

            <Dialog.Root open={statusModalOpen} onOpenChange={setStatusModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
                    <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none z-50">
                        <div className="flex items-center mb-4 text-amber-500">
                            <AlertTriangle className="h-6 w-6 mr-2" />
                            <Dialog.Title className="text-xl font-medium text-gray-900">
                                Durum Değişikliği Onayı
                            </Dialog.Title>
                        </div>
                        <div className="mb-6 text-sm text-gray-500">
                            Abone durumunu <strong>{selectedTenantForStatus?.status === 'active' ? 'Aktif' : 'Askıya Alınmış'}</strong> olarak değiştirmek istediğinize emin misiniz?
                        </div>
                        <div className="flex justify-end space-x-3">
                            <Dialog.Close asChild>
                                <button
                                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                >
                                    İptal
                                </button>
                            </Dialog.Close>
                            <button
                                onClick={confirmStatusChange}
                                className={`inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${selectedTenantForStatus?.status === 'suspended' ? 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500' : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'}`}
                            >
                                Onayla
                            </button>
                        </div>
                        <Dialog.Close asChild>
                            <button
                                className="absolute top-[10px] right-[10px] inline-flex h-[25px] w-[25px] appearance-none items-center justify-center rounded-full focus:shadow-[0_0_0_2px] focus:outline-none"
                                aria-label="Close"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </Dialog.Close>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
    );
}
