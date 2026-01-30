import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api'; // Use main apiClient for reliable interceptors/headers
import { PRODUCT_REGISTRY } from '@/config/productRegistry';

interface ExtendedTenant {
    id?: string;
    name?: string;
    owner_email?: string;
    ownerEmail?: string; // Handle camelCase variant
    status?: string;
    max_users?: number;
    maxUsers?: number;
    product_code?: string;
    productCode?: string;
    [key: string]: any;
}

interface GeneralTabProps {
    tenant: ExtendedTenant;
    onUpdate: () => void;
}

export const GeneralTab = ({ tenant, onUpdate }: GeneralTabProps) => {
    const queryClient = useQueryClient();
    const [isPending, setIsPending] = useState(false);

    // Helper to get initial value with fallback for snake_case/camelCase
    const getInitialValue = (keySnake: string, keyCamel: string, defaultValue: any) => {
        return tenant[keySnake] ?? tenant[keyCamel] ?? defaultValue;
    };

    const [formData, setFormData] = useState({
        name: getInitialValue('name', 'name', ''),
        owner_email: getInitialValue('owner_email', 'ownerEmail', ''),
        status: getInitialValue('status', 'status', 'active'),
        max_users: getInitialValue('max_users', 'maxUsers', 5),
        product_code: getInitialValue('product_code', 'productCode', 'xear_hearing')
    });

    useEffect(() => {
        setFormData({
            name: getInitialValue('name', 'name', ''),
            owner_email: getInitialValue('owner_email', 'ownerEmail', ''),
            status: getInitialValue('status', 'status', 'active'),
            max_users: getInitialValue('max_users', 'maxUsers', 5),
            product_code: getInitialValue('product_code', 'productCode', 'xear_hearing')
        });
    }, [tenant]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsPending(true);
        try {
            // Explicitly construct payload to ensure snake_case
            const payload = {
                name: formData.name,
                owner_email: formData.owner_email,
                status: formData.status,
                max_users: Number(formData.max_users),
                product_code: formData.product_code
            };

            await apiClient.put(`/api/admin/tenants/${tenant.id}`, payload);

            toast.success('Abone bilgileri güncellendi');
            // Invalidate queries to refresh data
            await queryClient.invalidateQueries({ queryKey: ['/api/admin/tenants'] });
            onUpdate();
        } catch (error: any) {
            console.error('Update tenant error:', error);
            const message = error.response?.data?.error?.message
                || error.response?.data?.message
                || 'Güncelleme başarısız';
            toast.error(message);
        } finally {
            setIsPending(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Organizasyon Adı</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        required
                    />
                </div>

                <div className="col-span-2">
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
                    <label className="block text-sm font-medium text-gray-700">Durum</label>
                    <select
                        value={formData.status}
                        onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    >
                        <option value="active">Aktif</option>
                        <option value="trial">Deneme</option>
                        <option value="suspended">Askıya Alınmış</option>
                        <option value="cancelled">İptal Edilmiş</option>
                    </select>
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
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Maksimum Kullanıcı</label>
                    <input
                        type="number"
                        value={formData.max_users}
                        onChange={e => setFormData({ ...formData, max_users: parseInt(e.target.value) })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        min={1}
                    />
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                    {isPending ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
            </div>
        </form>
    );
};
