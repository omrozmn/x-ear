import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import * as Dialog from '@radix-ui/react-dialog';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useUpdateTenantUser } from '@/lib/api-client';

interface EditUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
    tenantId: string;
    onSuccess: () => void;
}

export const EditUserModal = ({ isOpen, onClose, user, tenantId, onSuccess }: EditUserModalProps) => {
    const [formData, setFormData] = useState({
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email || '',
        username: user.username || '',
        role: user.role || 'tenant_user',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const { mutateAsync: updateTenantUser } = useUpdateTenantUser();

    useEffect(() => {
        setFormData({
            firstName: user.first_name || '',
            lastName: user.last_name || '',
            email: user.email || '',
            username: user.username || '',
            role: user.role || 'tenant_user',
            password: ''
        });
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateTenantUser({
                id: tenantId,
                userId: user.id,
                data: {
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                    email: formData.email,
                    username: formData.username,
                    role: formData.role,
                    ...(formData.password ? { password: formData.password } : {})
                } as any
            });
            toast.success('Kullanıcı güncellendi');
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error.response?.data?.error?.message || 'Güncelleme başarısız');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white shadow-2xl focus:outline-none z-[60] p-6">
                    <Dialog.Title className="text-xl font-bold text-gray-900 mb-4">Kullanıcı Düzenle</Dialog.Title>
                    <Dialog.Description className="sr-only">Kullanıcı bilgilerini düzenleyin.</Dialog.Description>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-gray-700">Ad</label><input type="text" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" /></div>
                            <div><label className="block text-sm font-medium text-gray-700">Soyad</label><input type="text" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" /></div>
                        </div>
                        <div><label className="block text-sm font-medium text-gray-700">Kullanıcı Adı</label><input type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" required /></div>
                        <div><label className="block text-sm font-medium text-gray-700">Email</label><input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" required /></div>
                        <div><label className="block text-sm font-medium text-gray-700">Rol</label><select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"><option value="tenant_user">Kullanıcı</option><option value="tenant_admin">Yönetici</option></select></div>
                        <div><label className="block text-sm font-medium text-gray-700">Yeni Şifre (Opsiyonel)</label><input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" placeholder="Değiştirmek için girin" minLength={6} /></div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">İptal</button>
                            <button type="submit" disabled={loading} className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">{loading ? 'Güncelleniyor...' : 'Güncelle'}</button>
                        </div>
                    </form>
                    <Dialog.Close asChild><button className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"><XMarkIcon className="h-6 w-6" /></button></Dialog.Close>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
