import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useCreateAdminTenant } from '@/lib/api-client';
import toast from 'react-hot-toast';
import { PRODUCT_REGISTRY } from '@/config/productRegistry';

interface TenantCreateModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TenantCreateModal = ({ isOpen, onClose }: TenantCreateModalProps) => {
    const queryClient = useQueryClient();
    const { mutateAsync: createTenant, isPending } = useCreateAdminTenant();

    const [formData, setFormData] = useState({
        name: '',
        owner_email: '',
        status: 'trial',
        product_code: 'xear_hearing'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await createTenant({
                data: {
                    name: formData.name,
                    ownerEmail: formData.owner_email,
                    status: formData.status as any,
                    // @ts-ignore - product_code is added in backend
                    product_code: formData.product_code
                }
            });
            toast.success('Abone başarıyla oluşturuldu');
            queryClient.invalidateQueries({ queryKey: ['/admin/tenants'] });
            onClose();
            // Reset form
            setFormData({
                name: '',
                owner_email: '',
                status: 'trial',
                product_code: 'xear_hearing'
            });
        } catch (error: any) {
            toast.error(error.response?.data?.error?.message || 'Oluşturma başarısız');
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-40" />
                <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[90vh] w-[90vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white shadow-2xl focus:outline-none data-[state=open]:animate-contentShow z-50 flex flex-col">
                    <div className="flex justify-between items-center p-6 border-b">
                        <Dialog.Title className="text-xl font-bold text-gray-900">
                            Yeni Abone Ekle
                        </Dialog.Title>
                        <Dialog.Close asChild>
                            <button className="text-gray-400 hover:text-gray-500">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </Dialog.Close>
                    </div>

                    <div className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Organizasyon Adı</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Yönetici Email</label>
                                <input
                                    type="email"
                                    value={formData.owner_email}
                                    onChange={e => setFormData({ ...formData, owner_email: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Ürün</label>
                                <select
                                    value={formData.product_code}
                                    onChange={e => setFormData({ ...formData, product_code: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                >
                                    {Object.entries(PRODUCT_REGISTRY)
                                        .filter(([_, config]) => config.enabled && config.creatable)
                                        .map(([key, config]) => (
                                            <option key={key} value={key}>{config.name}</option>
                                        ))
                                    }
                                </select>
                                <p className="mt-1 text-xs text-gray-500">Varsayılan: İşitme Merkezi</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Başlangıç Durumu</label>
                                <select
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                >
                                    <option value="trial">Deneme (Trial)</option>
                                    <option value="active">Aktif</option>
                                </select>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="mr-3 inline-flex justify-center rounded-md border border-gray-300 bg-white py-2 px-4 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPending}
                                    className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                                >
                                    {isPending ? 'Oluşturuluyor...' : 'Oluştur'}
                                </button>
                            </div>
                        </form>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
