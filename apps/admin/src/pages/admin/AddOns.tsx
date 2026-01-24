
import React from 'react';

import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
    useListAdminAddons,
    useCreateAdminAddon,
    useUpdateAdminAddon,
    useDeleteAdminAddon,
} from '@/lib/api-client';

// Local type definition (not exported from generated client)
interface AddOn {
    id?: string;
    name?: string;
    slug?: string;
    price?: number;
    addon_type?: string;
    is_active?: boolean;
    description?: string;
    limit_amount?: number;
    unit_name?: string;
    currency?: string;
}
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import * as Dialog from '@radix-ui/react-dialog';
import Pagination from '@/components/ui/Pagination';

const AddOns: React.FC = () => {
    const queryClient = useQueryClient();
    const [page, setPage] = React.useState(1);
    const [limit, setLimit] = React.useState(10);
    const { data: addonsData, isLoading, error } = useListAdminAddons({ page, limit } as any);
    const addons = (addonsData as any)?.data?.addons || (addonsData as any)?.addons || [];
    const pagination = (addonsData as any)?.data?.pagination || (addonsData as any)?.pagination;

    const { mutateAsync: createAddon } = useCreateAdminAddon();
    const { mutateAsync: updateAddon } = useUpdateAdminAddon();
    const { mutateAsync: deleteAddon } = useDeleteAdminAddon();

    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
    const [editingAddon, setEditingAddon] = React.useState<AddOn | null>(null);
    const [deletingAddonId, setDeletingAddonId] = React.useState<string | null>(null);
    const [formData, setFormData] = React.useState<Partial<AddOn>>({
        name: '',
        price: 0,
        description: '',
        limit_amount: 0,
        unit_name: '',
        is_active: true,
    });
    const [isStatusModalOpen, setIsStatusModalOpen] = React.useState(false);
    const [statusAddon, setStatusAddon] = React.useState<AddOn | null>(null);

    const handleOpenModal = (addon?: AddOn) => {
        if (addon) {
            setEditingAddon(addon);
            setFormData({
                name: addon.name || '',
                price: addon.price || 0,
                addon_type: (addon.addon_type as any) || 'FLAT_FEE',
                is_active: addon.is_active ?? true,
                currency: addon.currency || 'TRY'
            });
        } else {
            setEditingAddon(null);
            setFormData({
                name: '',
                price: 0,
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
            if (editingAddon) {
                await updateAddon({
                    addonId: editingAddon.id!,
                    data: formData as any
                });
                toast.success('Eklenti güncellendi');
            } else {
                await createAddon({
                    data: formData as any
                });
                toast.success('Eklenti oluşturuldu');
            }
            await queryClient.invalidateQueries({ queryKey: ['/admin/addons'] });
            setIsModalOpen(false);
        } catch (e: any) {
            toast.error(e.response?.data?.error?.message || 'İşlem başarısız');
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
        } catch (e: any) {
            toast.error(e.response?.data?.error?.message || 'Silme başarısız');
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
        setIsSubmitting(true);
        try {
            await updateAddon({
                addonId: statusAddon.id,
                data: {
                    name: statusAddon.name!,
                    price: statusAddon.price!,
                    isActive: !statusAddon.is_active
                }
            });
            await queryClient.invalidateQueries({ queryKey: ['/admin/addons'] });
            toast.success('Eklenti durumu güncellendi');
            setIsStatusModalOpen(false);
        } catch (e: any) {
            toast.error(e.response?.data?.error?.message || 'Güncelleme başarısız');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Eklentiler (Add-ons)</h1>
                        <p className="mt-1 text-sm text-gray-500">Ek paketleri ve özellikleri yönetin</p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                        Eklenti Ekle
                    </button>
                </div>

                {isLoading ? (
                    <div className="p-6 text-center">Yükleniyor...</div>
                ) : error ? (
                    <div className="p-6 text-center text-red-600">Eklentiler yüklenirken hata oluştu</div>
                ) : (
                    <div className="bg-white shadow rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İsim</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tip</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fiyat (TRY)</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {addons.map((addon: any) => (
                                    <tr key={addon.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            <div className="font-medium">{addon.name}</div>
                                            <div className="text-xs text-gray-500">{addon.slug}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{addon.addon_type}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{addon.price?.toLocaleString('tr-TR') ?? '-'} TL</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${addon.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                {addon.is_active ? 'Aktif' : 'Pasif'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end space-x-2">
                                                <button
                                                    onClick={() => handleStatusChangeClick(addon)}
                                                    className={`inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 ${addon.is_active
                                                        ? 'text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:ring-yellow-500'
                                                        : 'text-green-700 bg-green-100 hover:bg-green-200 focus:ring-green-500'
                                                        }`}
                                                    title={addon.is_active ? 'Pasif Yap' : 'Aktif Yap'}
                                                >
                                                    {addon.is_active ? 'Pasife Al' : 'Aktifleştir'}
                                                </button>
                                                <button
                                                    onClick={() => handleOpenModal(addon)}
                                                    className="text-blue-600 hover:text-blue-900"
                                                    title="Düzenle"
                                                >
                                                    <PencilIcon className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(addon.id!)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="Sil"
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
                                    onChange={(e) => setFormData({ ...formData, addon_type: e.target.value as any })}
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
