import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useUpdateTenant } from '@/lib/api-client';

interface ExtendedTenant {
    id?: string;
    name?: string;
    owner_email?: string;
    status?: string;
    max_users?: number;
    [key: string]: any;
}

interface GeneralTabProps {
    tenant: ExtendedTenant;
    onUpdate: () => void;
}

export const GeneralTab = ({ tenant, onUpdate }: GeneralTabProps) => {
    const { mutateAsync: updateTenant, isPending } = useUpdateTenant();
    const [formData, setFormData] = useState({
        name: tenant.name || '',
        owner_email: tenant.owner_email || '',
        status: tenant.status || 'active',
        max_users: tenant.max_users || 5
    });

    useEffect(() => {
        setFormData({
            name: tenant.name || '',
            owner_email: tenant.owner_email || '',
            status: tenant.status || 'active',
            max_users: tenant.max_users || 5
        });
    }, [tenant]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await updateTenant({
                tenantId: tenant.id!,
                data: formData as any
            });
            toast.success('Abone bilgileri güncellendi');
            onUpdate();
        } catch (error: any) {
            toast.error(error.response?.data?.error?.message || 'Güncelleme başarısız');
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
