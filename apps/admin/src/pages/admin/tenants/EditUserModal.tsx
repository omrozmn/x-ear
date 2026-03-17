import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import * as Dialog from '@radix-ui/react-dialog';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useUpdateAdminTenantUser } from '@/api/generated/admin-tenants/admin-tenants';
import { UserRead } from '@/api/generated/schemas';

interface EditUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: UserRead;
    tenantId: string;
    onSuccess: () => void;
}

interface ExtendedUserRead extends UserRead {
    username?: string;
}

interface TenantUserUpdatePayload {
    first_name: string;
    last_name: string;
    email: string;
    username: string;
    role: string;
    password?: string;
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

export const EditUserModal = ({ isOpen, onClose, user, tenantId, onSuccess }: EditUserModalProps) => {
    const currentUser = user as ExtendedUserRead;
    const [formData, setFormData] = useState({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        username: currentUser.username || user.email || '',
        role: user.role || 'tenant_user',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const { mutateAsync: updateTenantUser } = useUpdateAdminTenantUser();

    useEffect(() => {
        setFormData({
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            email: user.email || '',
            username: currentUser.username || user.email || '',
            role: user.role || 'tenant_user',
            password: ''
        });
    }, [currentUser.username, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload: TenantUserUpdatePayload = {
                first_name: formData.firstName,
                last_name: formData.lastName,
                email: formData.email,
                username: formData.username,
                role: formData.role,
                ...(formData.password ? { password: formData.password } : {})
            };
            await updateTenantUser({
                tenantId: tenantId,
                userId: user.id,
                data: payload
            });
            toast.success('Kullanıcı güncellendi');
            onSuccess();
            onClose();
        } catch (error: unknown) {
            const apiError = error as ApiErrorLike;
            toast.error(apiError.response?.data?.error?.message || 'Güncelleme başarısız');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
                <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white shadow-2xl focus:outline-none z-[60] p-6">
                    <Dialog.Title className="text-xl font-bold text-gray-900 mb-4">Kullanıcı Düzenle</Dialog.Title>
                    <Dialog.Description className="sr-only">Kullanıcı bilgilerini düzenleyin.</Dialog.Description>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-sm font-medium text-gray-700">Ad</label><input type="text" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" /></div>
                            <div><label className="block text-sm font-medium text-gray-700">Soyad</label><input type="text" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" /></div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Kullanıcı Adı</label>
                            <input type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" required />
                            <div className="text-xs text-gray-400">{currentUser.username || user.email}</div>
                        </div>
                        <div><label className="block text-sm font-medium text-gray-700">Email</label><input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" required /></div>
                        <div><label className="block text-sm font-medium text-gray-700">Rol</label><select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"><option value="tenant_user">Kullanıcı</option><option value="tenant_admin">Yönetici</option></select></div>
                        <div><label className="block text-sm font-medium text-gray-700">Yeni Şifre (Opsiyonel)</label><input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" placeholder="Değiştirmek için girin" minLength={6} /></div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">İptal</button>
                            <button type="submit" disabled={loading} className="px-4 py-2 border border-transparent rounded-xl text-sm font-medium text-white premium-gradient tactile-press disabled:opacity-50">{loading ? 'Güncelleniyor...' : 'Güncelle'}</button>
                        </div>
                    </form>
                    <Dialog.Close asChild><button className="absolute top-4 right-4 text-gray-400 hover:text-gray-500"><XMarkIcon className="h-6 w-6" /></button></Dialog.Close>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
