import React from 'react';

import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    useListAdminAddons,
    useCreateAdminAddon,
    useUpdateAdminAddon,
    useDeleteAdminAddon,
} from '@/lib/api-client';
import type { AddonCreate, AddonListResponse, AddonRead, AddonUpdate, ListAdminAddonsParams } from '@/api/generated/schemas';

interface AddOn {
    id: string;
    name: string;
    slug?: string;
    price: number;
    addon_type?: string;
    addonType?: string;
    is_active?: boolean;
    isActive?: boolean;
    description?: string;
    limit_amount?: number;
    limitAmount?: number;
    unit_name?: string;
    unitName?: string;
    currency?: string;
}
import { PlusIcon, PencilIcon, TrashIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import * as Dialog from '@radix-ui/react-dialog';
import Pagination from '@/components/ui/Pagination';
import { useAdminResponsive } from '@/hooks/useAdminResponsive';
import { ResponsiveTable } from '@/components/responsive/ResponsiveTable';

interface PaginationInfo {
    totalPages?: number;
    total?: number;
}

interface ApiErrorLike {
    response?: {
        data?: {
            error?: {
                message?: string;
            };
        };
    };
}

type AddonType = 'FLAT_FEE' | 'PER_USER' | 'USAGE_BASED';

interface AddOnFormData {
    name: string;
    price: number;
    description: string;
    addon_type: AddonType;
    is_active: boolean;
    currency: string;
}

function getApiErrorMessage(error: unknown, fallback: string): string {
    const apiError = error as ApiErrorLike;
    return apiError.response?.data?.error?.message || fallback;
}

function isAddonRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function normalizeAddon(value: AddonRead | Record<string, unknown>): AddOn | null {
    if (!isAddonRecord(value)) {
        return null;
    }

    const id = typeof value.id === 'string' ? value.id : null;
    const name = typeof value.name === 'string' ? value.name : null;
    const price = typeof value.price === 'number' ? value.price : null;

    if (!id || !name || price === null) {
        return null;
    }

    return {
        id,
        name,
        price,
        slug: typeof value.slug === 'string' ? value.slug : undefined,
        description: typeof value.description === 'string' ? value.description : undefined,
        currency: typeof value.currency === 'string' ? value.currency : undefined,
        addonType: typeof value.addonType === 'string' ? value.addonType : undefined,
        addon_type: typeof value.addon_type === 'string' ? value.addon_type : typeof value.addonType === 'string' ? value.addonType : undefined,
        isActive: typeof value.isActive === 'boolean' ? value.isActive : undefined,
        is_active: typeof value.is_active === 'boolean' ? value.is_active : typeof value.isActive === 'boolean' ? value.isActive : undefined,
        limitAmount: typeof value.limitAmount === 'number' ? value.limitAmount : undefined,
        limit_amount: typeof value.limit_amount === 'number' ? value.limit_amount : typeof value.limitAmount === 'number' ? value.limitAmount : undefined,
        unitName: typeof value.unitName === 'string' ? value.unitName : undefined,
        unit_name: typeof value.unit_name === 'string' ? value.unit_name : typeof value.unitName === 'string' ? value.unitName : undefined,
    };
}

function getAddons(data: AddonListResponse | undefined): AddOn[] {
    const responseData = data?.data;
    if (!responseData || typeof responseData !== 'object' || !('addons' in responseData) || !Array.isArray(responseData.addons)) {
        return [];
    }

    return responseData.addons
        .map((addon) => normalizeAddon(addon as AddonRead | Record<string, unknown>))
        .filter((addon): addon is AddOn => addon !== null);
}

function getPagination(data: AddonListResponse | undefined): PaginationInfo {
    const responseData = data?.data;
    if (!responseData || typeof responseData !== 'object' || !('pagination' in responseData) || !isAddonRecord(responseData.pagination)) {
        return {};
    }

    return {
        totalPages: typeof responseData.pagination.totalPages === 'number' ? responseData.pagination.totalPages : undefined,
        total: typeof responseData.pagination.total === 'number' ? responseData.pagination.total : undefined,
    };
}

const AddOns: React.FC = () => {
    const { isMobile } = useAdminResponsive();
    const queryClient = useQueryClient();
    const [page, setPage] = React.useState(1);
    const [limit, setLimit] = React.useState(10);
    const params: ListAdminAddonsParams = { page, limit };
    const { data: addonsData, isLoading, error } = useListAdminAddons(params);
    const addons = getAddons(addonsData);
    const pagination = getPagination(addonsData);

    const { mutateAsync: createAddon } = useCreateAdminAddon();
    const { mutateAsync: updateAddon } = useUpdateAdminAddon();
    const { mutateAsync: deleteAddon } = useDeleteAdminAddon();

    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
    const [editingAddon, setEditingAddon] = React.useState<AddOn | null>(null);
    const [deletingAddonId, setDeletingAddonId] = React.useState<string | null>(null);
    const [formData, setFormData] = React.useState<AddOnFormData>({
        name: '',
        price: 0,
        description: '',
        addon_type: 'FLAT_FEE',
        is_active: true,
        currency: 'TRY',
    });
    const [isStatusModalOpen, setIsStatusModalOpen] = React.useState(false);
    const [statusAddon, setStatusAddon] = React.useState<AddOn | null>(null);

    const handleOpenModal = (addon?: AddOn) => {
        if (addon) {
            setEditingAddon(addon);
            setFormData({
                name: addon.name || '',
                price: addon.price || 0,
                description: addon.description || '',
                addon_type: (addon.addon_type || addon.addonType || 'FLAT_FEE') as AddonType,
                is_active: addon.is_active ?? addon.isActive ?? true,
                currency: addon.currency || 'TRY'
            });
        } else {
            setEditingAddon(null);
            setFormData({
                name: '',
                price: 0,
                description: '',
                addon_type: 'FLAT_FEE',
                is_active: true,
                currency: 'TRY'
            });
        }
        setIsModalOpen(true);
    };

    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const payload: AddonCreate | AddonUpdate = {
                name: formData.name,
                price: formData.price,
                description: formData.description,
                addonType: formData.addon_type,
                isActive: formData.is_active,
                currency: formData.currency,
            };

            if (editingAddon) {
                await updateAddon({
                    addonId: editingAddon.id,
                    data: payload
                });
                toast.success('Eklenti güncellendi');
            } else {
                await createAddon({
                    data: payload as AddonCreate
                });
                toast.success('Eklenti oluşturuldu');
            }
            await queryClient.invalidateQueries({ queryKey: ['/admin/addons'] });
            setIsModalOpen(false);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'İşlem başarısız'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClick = (addonId: string) => {
        setDeletingAddonId(addonId);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (!deletingAddonId) return;
        setIsSubmitting(true);
        try {
            await deleteAddon({ addonId: deletingAddonId });
            await queryClient.invalidateQueries({ queryKey: ['/admin/addons'] });
            toast.success('Eklenti silindi');
            setIsDeleteModalOpen(false);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Silme başarısız'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStatusChangeClick = (addon: AddOn) => {
        setStatusAddon(addon);
        setIsStatusModalOpen(true);
    };

    const confirmStatusChange = async () => {
        if (!statusAddon?.id) return;
        if (!statusAddon.name) return;
        setIsSubmitting(true);
        try {
            await updateAddon({
                addonId: statusAddon.id,
                data: {
                    name: statusAddon.name,
                    price: statusAddon.price,
                    isActive: !(statusAddon.is_active ?? statusAddon.isActive ?? false)
                }
            });
            await queryClient.invalidateQueries({ queryKey: ['/admin/addons'] });
            toast.success('Eklenti durumu güncellendi');
            setIsStatusModalOpen(false);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, 'Güncelleme başarısız'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const columns = [
        {
            key: 'name',
            header: 'İsim',
            render: (addon: AddOn) => (
                <div>
                    <div className="font-medium text-gray-900 dark:text-white">{addon.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{addon.slug}</div>
                </div>
            )
        },
        {
            key: 'addon_type',
            header: 'Tip',
            mobileHidden: true,
            render: (addon: AddOn) => (
                <span className="text-gray-500 dark:text-gray-400">{addon.addon_type || addon.addonType}</span>
            )
        },
        {
            key: 'price',
            header: 'Fiyat (TRY)',
            render: (addon: AddOn) => (
                <span className="text-gray-900 dark:text-white">{addon.price?.toLocaleString('tr-TR') ?? '-'} TL</span>
            )
        },
        {
            key: 'is_active',
            header: 'Durum',
            render: (addon: AddOn) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(addon.is_active ?? addon.isActive) ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'}`}>
                    {(addon.is_active ?? addon.isActive) ? 'Aktif' : 'Pasif'}
                </span>
            )
        },
        {
            key: 'actions',
            header: 'İşlemler',
            render: (addon: AddOn) => (
                <div className="flex justify-end space-x-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleStatusChangeClick(addon); }}
                        className={`inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 touch-feedback ${(addon.is_active ?? addon.isActive)
                            ? 'text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:ring-yellow-500 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'text-green-700 bg-green-100 hover:bg-green-200 focus:ring-green-500 dark:bg-green-900 dark:text-green-200'
                            }`}
                        title={(addon.is_active ?? addon.isActive) ? 'Pasif Yap' : 'Aktif Yap'}
                    >
                        {(addon.is_active ?? addon.isActive) ? 'Pasife Al' : 'Aktifleştir'}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(addon); }}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 touch-feedback"
                        title="Düzenle"
                    >
                        <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(addon.id); }}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 touch-feedback"
                        title="Sil"
                    >
                        <TrashIcon className="h-4 w-4" />
                    </button>
                </div>
            )
        }
    ];

    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className={`font-semibold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>Eklentiler (Add-ons)</h1>
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Ek paketleri ve özellikleri yönetin</p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 touch-feedback"
                    >
                        <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                        {!isMobile && 'Eklenti Ekle'}
                    </button>
                </div>

                {isLoading ? (
                    <div className="p-6 text-center text-gray-500 dark:text-gray-400">Yükleniyor...</div>
                ) : error ? (
                    <div className="p-6 text-center text-red-600 dark:text-red-400">Eklentiler yüklenirken hata oluştu</div>
                ) : (
                    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
                        <ResponsiveTable
                            data={addons}
                            columns={columns}
                            keyExtractor={(addon: AddOn) => addon.id}
                            emptyMessage="Eklenti bulunamadı."
                        />
                        <Pagination
                            currentPage={page}
                            totalPages={pagination?.totalPages || 1}
                            totalItems={pagination?.total || 0}
                            itemsPerPage={limit}
                            onPageChange={setPage}
                            onItemsPerPageChange={setLimit}
                        />
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            <Dialog.Root open={isModalOpen} onOpenChange={setIsModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-40" />
                    <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none data-[state=open]:animate-contentShow z-50">
                        <Dialog.Title className="text-xl font-medium text-gray-900 mb-4">
                            {editingAddon ? 'Eklenti Düzenle' : 'Yeni Eklenti'}
                        </Dialog.Title>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="addon-name" className="block text-sm font-medium text-gray-700">İsim</label>
                                <input
                                    id="addon-name"
                                    type="text"
                                    required
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label htmlFor="addon-price" className="block text-sm font-medium text-gray-700">Fiyat (TRY)</label>
                                <input
                                    id="addon-price"
                                    type="number"
                                    required
                                    min="0"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                />
                            </div>
                            <div>
                                <label htmlFor="addon-type" className="block text-sm font-medium text-gray-700">Tip</label>
                                <select
                                    id="addon-type"
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                                    value={formData.addon_type}
                                    onChange={(e) => setFormData({ ...formData, addon_type: e.target.value as AddonType })}
                                >
                                    <option value="FLAT_FEE">Sabit Ücret</option>
                                    <option value="PER_USER">Kullanıcı Başına</option>
                                    <option value="USAGE_BASED">Kullanım Bazlı</option>
                                </select>
                            </div>
                            <div className="mt-6 flex justify-end space-x-3">
                                <Dialog.Close asChild>
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                                    >
                                        İptal
                                    </button>
                                </Dialog.Close>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'İşleniyor...' : (editingAddon ? 'Güncelle' : 'Oluştur')}
                                </button>
                            </div>
                        </form>
                        <Dialog.Close asChild>
                            <button
                                className="absolute top-[10px] right-[10px] inline-flex h-[25px] w-[25px] appearance-none items-center justify-center rounded-full focus:shadow-[0_0_0_2px] focus:outline-none"
                                aria-label="Close"
                            >
                                <XMarkIcon className="h-4 w-4" />
                            </button>
                        </Dialog.Close>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Delete Confirmation Modal */}
            <Dialog.Root open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-40" />
                    <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none data-[state=open]:animate-contentShow z-50">
                        <Dialog.Title className="text-xl font-medium text-gray-900 mb-4">
                            Eklentiyi Sil
                        </Dialog.Title>
                        <div className="mb-6 text-sm text-gray-500">
                            Bu eklentiyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
                        </div>
                        <div className="flex justify-end space-x-3">
                            <Dialog.Close asChild>
                                <button
                                    type="button"
                                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                                >
                                    İptal
                                </button>
                            </Dialog.Close>
                            <button
                                onClick={handleConfirmDelete}
                                disabled={isSubmitting}
                                className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Siliniyor...' : 'Sil'}
                            </button>
                        </div>
                        <Dialog.Close asChild>
                            <button
                                className="absolute top-[10px] right-[10px] inline-flex h-[25px] w-[25px] appearance-none items-center justify-center rounded-full focus:shadow-[0_0_0_2px] focus:outline-none"
                                aria-label="Close"
                            >
                                <XMarkIcon className="h-4 w-4" />
                            </button>
                        </Dialog.Close>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Status Confirmation Modal */}
            <Dialog.Root open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-40" />
                    <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none data-[state=open]:animate-contentShow z-50">
                        <div className="flex items-center mb-4 text-amber-500">
                            <ExclamationTriangleIcon className="h-6 w-6 mr-2" />
                            <Dialog.Title className="text-xl font-medium text-gray-900">
                                Durum Değişikliği
                            </Dialog.Title>
                        </div>
                        <div className="mb-6 text-sm text-gray-500">
                            Bu eklentinin durumunu <strong>{statusAddon?.is_active ? 'Pasif' : 'Aktif'}</strong> olarak değiştirmek istediğinize emin misiniz?
                        </div>
                        <div className="flex justify-end space-x-3">
                            <Dialog.Close asChild>
                                <button
                                    type="button"
                                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                                >
                                    İptal
                                </button>
                            </Dialog.Close>
                            <button
                                onClick={confirmStatusChange}
                                disabled={isSubmitting}
                                className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Güncelleniyor...' : 'Onayla'}
                            </button>
                        </div>
                        <Dialog.Close asChild>
                            <button
                                className="absolute top-[10px] right-[10px] inline-flex h-[25px] w-[25px] appearance-none items-center justify-center rounded-full focus:shadow-[0_0_0_2px] focus:outline-none"
                                aria-label="Close"
                            >
                                <XMarkIcon className="h-4 w-4" />
                            </button>
                        </Dialog.Close>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </>
    );
};

export default AddOns;
