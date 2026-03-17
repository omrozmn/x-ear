import { useState, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Search, CheckCircle, Trash2, AlertTriangle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Pagination from '@/components/ui/Pagination';
import { TenantEditModal, TenantCreateModal } from './tenants';
import { PRODUCT_REGISTRY, getProductConfig, getSectorForProduct } from '@/config/productRegistry';
import { getCountryConfig } from '@/config/countryRegistry';
import {
    useListAdminTenants,
    useUpdateAdminTenantStatus,
    ProductCode,
    type ListAdminTenantsParams,
    type TenantRead,
    type TenantStatus,
    type UpdateStatusRequest,
} from '@/lib/api-client';
import { apiClient } from '@/lib/api';
import * as Dialog from '@radix-ui/react-dialog';
import { useAdminResponsive } from '@/hooks';
import { ResponsiveTable } from '@/components/responsive';

type TenantFilterStatus = Extract<TenantStatus, 'active' | 'trial' | 'suspended' | 'cancelled'>;

interface TenantListPagination {
    total: number;
    totalPages: number;
}

interface TenantRow extends TenantRead {
    owner_email?: string;
    product_code?: string;
    current_plan?: string;
    billing_email?: string;
    created_at?: string;
    countryCode?: string;
    country_code?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function getString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
}

function isProductCode(value: unknown): value is ListAdminTenantsParams['product_code'] {
    return typeof value === 'string' && Object.values(ProductCode).includes(value as (typeof ProductCode)[keyof typeof ProductCode]);
}

function toTenantRow(value: Record<string, unknown>): TenantRow | null {
    const id = getString(value.id);
    const name = getString(value.name);
    const slug = getString(value.slug);
    const status = getString(value.status) as TenantStatus | undefined;

    if (!id || !name || !slug || !status) {
        return null;
    }

    return {
        id,
        name,
        slug,
        status,
        email: getString(value.email),
        phone: getString(value.phone),
        ownerEmail: getString(value.ownerEmail),
        billingEmail: getString(value.billingEmail),
        productCode: isProductCode(value.productCode) ? value.productCode : undefined,
        currentPlan: getString(value.currentPlan),
        createdAt: getString(value.createdAt),
        owner_email: getString(value.owner_email),
        product_code: getString(value.product_code),
        current_plan: getString(value.current_plan),
        billing_email: getString(value.billing_email),
        created_at: getString(value.created_at),
        countryCode: getString(value.countryCode),
        country_code: getString(value.country_code),
    };
}

function getTenants(data: unknown): TenantRow[] {
    if (!isRecord(data)) {
        return [];
    }

    // Direct: { tenants: [...] } (Orval unwrapped)
    const directTenants = data.tenants;
    if (Array.isArray(directTenants)) {
        return directTenants.filter(isRecord).map(toTenantRow).filter((tenant): tenant is TenantRow => tenant !== null);
    }

    // Direct: { items: [...] } (alternative format)
    const directItems = data.items;
    if (Array.isArray(directItems)) {
        return directItems.filter(isRecord).map(toTenantRow).filter((tenant): tenant is TenantRow => tenant !== null);
    }

    // Wrapped: { data: { tenants: [...] } }
    const envelope = data.data;
    if (isRecord(envelope)) {
        if (Array.isArray(envelope.tenants)) {
            return envelope.tenants.filter(isRecord).map(toTenantRow).filter((tenant): tenant is TenantRow => tenant !== null);
        }
        if (Array.isArray(envelope.items)) {
            return envelope.items.filter(isRecord).map(toTenantRow).filter((tenant): tenant is TenantRow => tenant !== null);
        }
    }

    return [];
}

function getPagination(data: unknown): TenantListPagination {
    if (!isRecord(data)) {
        return { total: 0, totalPages: 1 };
    }

    const directPagination = data.pagination;
    if (isRecord(directPagination)) {
        return {
            total: typeof directPagination.total === 'number' ? directPagination.total : 0,
            totalPages: typeof directPagination.totalPages === 'number' ? directPagination.totalPages : 1,
        };
    }

    const envelope = data.data;
    if (isRecord(envelope) && isRecord(envelope.pagination)) {
        return {
            total: typeof envelope.pagination.total === 'number' ? envelope.pagination.total : 0,
            totalPages: typeof envelope.pagination.totalPages === 'number' ? envelope.pagination.totalPages : 1,
        };
    }

    return { total: 0, totalPages: 1 };
}

export default function TenantsPage() {
    const { isMobile } = useAdminResponsive();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [productFilter, setProductFilter] = useState<string>('all');
    const [page, setPage] = useState(1);

    // Debounced search handler
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
    const handleSearchChange = useCallback((value: string) => {
        setSearchInput(value);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
            setSearchTerm(value);
            setPage(1);
        }, 300);
    }, []);
    const [limit, setLimit] = useState(10);
    const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [deletingTenantId, setDeletingTenantId] = useState<string | null>(null);
    const [selectedTenantForStatus, setSelectedTenantForStatus] = useState<{ id: string, status: TenantFilterStatus } | null>(null);
    const queryClient = useQueryClient();
    const productCodeFilter = productFilter !== 'all' && isProductCode(productFilter) ? productFilter : undefined;

    const { data: tenantsData, isLoading } = useListAdminTenants({
        page,
        limit,
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? (statusFilter as TenantFilterStatus) : undefined,
        product_code: productCodeFilter
    });

    const tenants = getTenants(tenantsData);
    const pagination = getPagination(tenantsData);

    const { mutateAsync: updateStatus } = useUpdateAdminTenantStatus();

    const handleStatusChange = (tenantId: string, newStatus: TenantFilterStatus, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedTenantForStatus({ id: tenantId, status: newStatus });
        setStatusModalOpen(true);
    };

    const confirmStatusChange = async () => {
        if (!selectedTenantForStatus) return;

        const { id, status } = selectedTenantForStatus;

        await toast.promise(
            (async () => {
                const payload: UpdateStatusRequest = { status };
                await updateStatus({
                    tenantId: id,
                    data: payload
                });
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

    const handleDelete = (tenantId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeletingTenantId(tenantId);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!deletingTenantId) return;

        await toast.promise(
            (async () => {
                await apiClient.delete(`/api/admin/tenants/${deletingTenantId}`);
                await queryClient.invalidateQueries({ queryKey: ['/admin/tenants'] });
                await queryClient.invalidateQueries({ queryKey: ['/api/admin/tenants'] });
            })(),
            {
                loading: 'Abone siliniyor...',
                success: 'Abone başarıyla silindi',
                error: 'Abone silinemedi'
            }
        );
        setDeleteModalOpen(false);
        setDeletingTenantId(null);
    };

    const columns = [
        {
            key: 'organization',
            header: 'Organizasyon',
            sortable: true,
            sortKey: 'name',
            render: (tenant: TenantRow) => (
                <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                        {tenant.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-4 min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate">{tenant.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{tenant.ownerEmail || tenant.owner_email}</div>
                    </div>
                </div>
            )
        },
        {
            key: 'status',
            header: 'Durum',
            sortable: true,
            render: (tenant: TenantRow) => (
                <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                    tenant.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                    tenant.status === 'trial' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                    tenant.status === 'suspended' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                    'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                    {tenant.status === 'active' ? 'Aktif' :
                        tenant.status === 'trial' ? 'Deneme' :
                        tenant.status === 'suspended' ? 'Askıda' : 'İptal'}
                </span>
            )
        },
        {
            key: 'product',
            header: 'Ürün',
            sortable: true,
            sortKey: 'productCode',
            render: (tenant: TenantRow) => {
                const productCode = tenant.productCode || tenant.product_code;
                const productConfig = getProductConfig(productCode ?? ProductCode.xear_hearing);
                return (
                    <span className={`inline-flex items-center rounded-xl px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                        productConfig.badge === 'purple' ? 'bg-purple-50 text-purple-700 ring-purple-600/20 dark:bg-purple-900/30 dark:text-purple-400' :
                        productConfig.badge === 'green' ? 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-900/30 dark:text-green-400' :
                        productConfig.badge === 'red' ? 'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-400' :
                        productConfig.badge === 'orange' ? 'bg-orange-50 text-orange-700 ring-orange-600/20 dark:bg-orange-900/30 dark:text-orange-400' :
                        productConfig.badge === 'teal' ? 'bg-teal-50 text-teal-700 ring-teal-600/20 dark:bg-teal-900/30 dark:text-teal-400' :
                        productConfig.badge === 'violet' ? 'bg-violet-50 text-violet-700 ring-violet-600/20 dark:bg-violet-900/30 dark:text-violet-400' :
                        productConfig.badge === 'pink' ? 'bg-pink-50 text-pink-700 ring-pink-600/20 dark:bg-pink-900/30 dark:text-pink-400' :
                        productConfig.badge === 'gray' ? 'bg-gray-50 text-gray-700 ring-gray-600/20 dark:bg-gray-900/30 dark:text-gray-400' :
                        'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                        {productConfig.name}
                    </span>
                );
            }
        },
        {
            key: 'sector',
            header: 'Sektör',
            sortable: true,
            sortKey: 'sector',
            render: (tenant: TenantRow) => {
                const productCode = tenant.productCode || tenant.product_code || '';
                const sectorName = getSectorForProduct(productCode);
                const sectorLabels: Record<string, string> = {
                    hearing: 'İşitme',
                    pharmacy: 'Eczane',
                    medical: 'Medikal',
                    optic: 'Optik',
                    beauty: 'Güzellik',
                    hospital: 'Hastane',
                    hotel: 'Otel',
                    general: 'Genel',
                };
                const sectorColors: Record<string, string> = {
                    hearing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                    pharmacy: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                    medical: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
                    optic: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
                    beauty: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
                    hospital: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                    hotel: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                    general: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
                };
                return (
                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${sectorColors[sectorName] || sectorColors.general}`}>
                        {sectorLabels[sectorName] || sectorName}
                    </span>
                );
            }
        },
        {
            key: 'country',
            header: 'Ülke',
            sortable: true,
            sortKey: 'countryCode',
            render: (tenant: TenantRow) => {
                const code = tenant.countryCode || tenant.country_code || 'TR';
                const config = getCountryConfig(code);
                return (
                    <span className="inline-flex items-center gap-1 text-sm">
                        <span>{config.flag}</span>
                        <span className="text-gray-600 dark:text-gray-400">{code}</span>
                    </span>
                );
            }
        },
        {
            key: 'plan',
            header: 'Plan',
            mobileHidden: true,
            sortable: true,
            sortKey: 'currentPlan',
            render: (tenant: TenantRow) => (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {tenant.currentPlan || tenant.current_plan || 'Plan Yok'}
                </span>
            )
        },
        {
            key: 'phone',
            header: 'Telefon',
            mobileHidden: true,
            sortable: true,
            sortKey: 'phone',
            render: (tenant: TenantRow) => {
                // Try to extract phone from billing_email if phone is null
                let phoneDisplay = tenant.phone;
                if (!phoneDisplay && (tenant.billingEmail || tenant.billing_email)) {
                    const email = tenant.billingEmail || tenant.billing_email;
                    // Extract phone from format like "555544443@mobile-signup.x-ear.com"
                    const match = email?.match(/^(\d+)@/);
                    if (match) {
                        phoneDisplay = match[1];
                    }
                }
                return (
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {phoneDisplay || '-'}
                    </span>
                );
            }
        },
        {
            key: 'created',
            header: 'Oluşturulma',
            mobileHidden: true,
            sortable: true,
            sortKey: 'createdAt',
            render: (tenant: TenantRow) => (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    {(tenant.createdAt || tenant.created_at) ? new Date(tenant.createdAt || tenant.created_at || Date.now()).toLocaleDateString('tr-TR') : '-'}
                </span>
            )
        },
        {
            key: 'actions',
            header: 'İşlemler',
            render: (tenant: TenantRow) => (
                <div className="flex justify-end space-x-2">
                    {tenant.status !== 'active' && (
                        <button
                            onClick={(e) => handleStatusChange(tenant.id, 'active', e)}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 p-1 touch-feedback"
                            title="Aktifleştir"
                        >
                            <CheckCircle className="h-5 w-5" />
                        </button>
                    )}
                    {tenant.status === 'active' && (
                        <button
                            onClick={(e) => handleStatusChange(tenant.id, 'suspended', e)}
                            className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-yellow-700 bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:hover:bg-yellow-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 touch-feedback"
                        >
                            Askıya Al
                        </button>
                    )}
                    <button
                        onClick={(e) => handleDelete(tenant.id, e)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 touch-feedback"
                        title="Sil"
                    >
                        <Trash2 className="h-5 w-5" />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className={isMobile ? 'p-4 pb-safe' : 'p-6'}>
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className={`${isMobile ? 'text-xl' : 'text-2xl'} font-semibold text-gray-900 dark:text-white`}>Aboneler</h1>
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-400">
                        Sistemdeki tüm abonelerin listesi ve yönetimi.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center justify-center rounded-xl border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto touch-feedback"
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
                        className="block w-full rounded-xl border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        placeholder="Abone ara..."
                        value={searchInput}
                        onChange={(e) => handleSearchChange(e.target.value)}
                    />
                </div>
                <div className="w-full sm:w-48">
                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                        className="block w-full rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
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
                        onChange={(e) => { setProductFilter(e.target.value); setPage(1); }}
                        className="block w-full rounded-xl border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    >
                        <option value="all">Tüm Ürünler</option>
                        {Object.entries(PRODUCT_REGISTRY).map(([key, config]) => (
                            <option key={key} value={key}>{config.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="mt-8 bg-white dark:bg-gray-800 shadow rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                {isLoading ? (
                    <div className={`${isMobile ? 'p-8' : 'p-12'} text-center`}>
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
                        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Aboneler yükleniyor...</p>
                    </div>
                ) : tenants.length === 0 ? (
                    <div className={`${isMobile ? 'p-8' : 'p-16'} text-center text-gray-500 dark:text-gray-400`}>
                        <p>Kayıt bulunamadı</p>
                    </div>
                ) : (
                    <ResponsiveTable
                        data={tenants}
                        columns={columns}
                        keyExtractor={(tenant) => tenant.id}
                        onRowClick={(tenant) => setSelectedTenantId(tenant.id)}
                        emptyMessage="Kayıt bulunamadı"
                    />
                )}
            </div>

            <Pagination
                currentPage={page}
                totalPages={pagination.totalPages}
                totalItems={pagination.total}
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

            <Dialog.Root open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
                    <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none z-50">
                        <div className="flex items-center mb-4 text-red-500">
                            <AlertTriangle className="h-6 w-6 mr-2" />
                            <Dialog.Title className="text-xl font-medium text-gray-900">
                                Abone Silme Onayı
                            </Dialog.Title>
                        </div>
                        <div className="mb-6 text-sm text-gray-500">
                            Bu aboneyi silmek istediğinize emin misiniz? <strong>Bu işlem geri alınamaz!</strong>
                        </div>
                        <div className="flex justify-end space-x-3">
                            <Dialog.Close asChild>
                                <button
                                    className="inline-flex justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                >
                                    İptal
                                </button>
                            </Dialog.Close>
                            <button
                                onClick={confirmDelete}
                                className="inline-flex justify-center rounded-xl border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                            >
                                Sil
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
                                    className="inline-flex justify-center rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                >
                                    İptal
                                </button>
                            </Dialog.Close>
                            <button
                                onClick={confirmStatusChange}
                                className={`inline-flex justify-center rounded-xl border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${selectedTenantForStatus?.status === 'suspended' ? 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500' : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'}`}
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
