import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Edit, UserPlus, Eye, EyeOff, X, RefreshCw, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import * as Dialog from '@radix-ui/react-dialog';
import { apiClient } from '@/lib/api';
import {
    useListAdminTenantUsers,
    getListAdminTenantUsersQueryKey
} from '@/api/generated/admin-tenants/admin-tenants';
import { UserRead } from '@/api/generated/schemas';
import Pagination from '@/components/ui/Pagination';

interface UsersTabProps {
    tenantId: string;
}

export const UsersTab = ({ tenantId }: UsersTabProps) => {
    const queryClient = useQueryClient();

    // List users - Keep using generated hook for GET as it works
    const { data: usersResponse, isLoading } = useListAdminTenantUsers(tenantId);

    // Access users from envelope
    const users = usersResponse?.data?.users || [];

    // Client-side pagination
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const totalItems = users.length;
    const totalPages = Math.ceil(totalItems / limit);
    const paginatedUsers = users.slice((page - 1) * limit, page * limit);

    // States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [userToToggle, setUserToToggle] = useState<UserRead | null>(null);
    const [editingUser, setEditingUser] = useState<UserRead | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        first_name: '',
        last_name: '',
        role: 'tenant_user',
        username: ''
    });

    const resetForm = () => {
        setFormData({
            email: '',
            password: '',
            first_name: '',
            last_name: '',
            role: 'tenant_user',
            username: ''
        });
        setShowPassword(false);
    };

    const generateUsername = () => {
        if (formData.first_name && formData.last_name) {
            // Normalize Turkish characters
            const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c");

            const base = `${normalize(formData.first_name.toLowerCase())}${normalize(formData.last_name.toLowerCase())}`.replace(/[^a-z0-9]/g, '');
            const random = Math.floor(Math.random() * 1000);
            setFormData(prev => ({ ...prev, username: `${base}${random}` }));
        } else {
            toast.error('Önce isim ve soyisim giriniz');
        }
    };

    // Handlers using apiClient directly
    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await apiClient.post(`/api/admin/tenants/${tenantId}/users`, {
                email: formData.email,
                password: formData.password,
                first_name: formData.first_name,
                last_name: formData.last_name,
                role: formData.role,
                username: formData.username || undefined,
                is_active: true
            });

            toast.success('Kullanıcı eklendi');
            setIsAddModalOpen(false);
            resetForm();
            await queryClient.invalidateQueries({ queryKey: getListAdminTenantUsersQueryKey(tenantId) });
        } catch (error: any) {
            console.error('Add user error:', error);
            const msg = error.response?.data?.error?.message || error.response?.data?.message || 'Kullanıcı eklenemedi';
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setIsSubmitting(true);
        try {
            const payload: any = {
                email: formData.email,
                first_name: formData.first_name,
                last_name: formData.last_name,
                role: formData.role,
                username: formData.username
            };
            if (formData.password) {
                payload.password = formData.password;
            }

            await apiClient.put(`/api/admin/tenants/${tenantId}/users/${editingUser.id}`, payload);

            toast.success('Kullanıcı güncellendi');
            setIsEditModalOpen(false);
            setEditingUser(null);
            resetForm();
            await queryClient.invalidateQueries({ queryKey: getListAdminTenantUsersQueryKey(tenantId) });
        } catch (error: any) {
            console.error('Update user error:', error);
            toast.error(error.response?.data?.error?.message || 'Güncelleme başarısız');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async () => {
        if (!userToToggle) return;
        setIsSubmitting(true);
        try {
            await apiClient.put(`/api/admin/tenants/${tenantId}/users/${userToToggle.id}`, {
                is_active: !userToToggle.isActive
            });

            toast.success(`Kullanıcı ${!userToToggle.isActive ? 'aktifleştirildi' : 'pasife alındı'}`);
            setUserToToggle(null);
            await queryClient.invalidateQueries({ queryKey: getListAdminTenantUsersQueryKey(tenantId) });
        } catch (error: any) {
            toast.error('Durum değiştirilemedi');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openEditModal = (user: UserRead) => {
        setEditingUser(user);
        setFormData({
            email: user.email || '',
            password: '',
            first_name: user.firstName || '',
            last_name: user.lastName || '',
            role: user.role || 'tenant_user',
            username: (user as any).username || ''
        });
        setIsEditModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Kullanıcı Listesi ({totalItems})</h3>
                <button
                    onClick={() => { resetForm(); setIsAddModalOpen(true); }}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
                    type="button"
                >
                    <UserPlus className="mr-1.5 h-4 w-4" />Kullanıcı Ekle
                </button>
            </div>

            {isLoading ? <div>Yükleniyor...</div> : (
                <div className="space-y-4">
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-300">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Kullanıcı</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Rol</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Durum</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Son Giriş</th>
                                    <th className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {paginatedUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-4 text-center text-sm text-gray-500">Kullanıcı bulunamadı</td>
                                    </tr>
                                ) : (
                                    paginatedUsers.map((user: UserRead) => (
                                        <tr key={user.id}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                                                <div className="font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                                                <div className="text-gray-500">{user.email}</div>
                                                <div className="text-xs text-gray-400">{(user as any).username || ''}</div>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                {user.role === 'tenant_admin' ? 'Yönetici' : 'Kullanıcı'}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{user.isActive ? 'Aktif' : 'Pasif'}</span>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{user.createdAt ? new Date(user.createdAt as string).toLocaleDateString('tr-TR') : '-'}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-right">
                                                <div className="flex justify-end space-x-2">
                                                    <button
                                                        onClick={() => setUserToToggle(user)}
                                                        className={`text-xs font-medium px-2 py-1 rounded ${user.isActive ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-green-600 bg-green-50 hover:bg-green-100'}`}
                                                        type="button"
                                                    >
                                                        {user.isActive ? 'Pasife Al' : 'Aktifleştir'}
                                                    </button>
                                                    <button
                                                        onClick={() => openEditModal(user)}
                                                        className="text-blue-600 hover:text-blue-900 p-1"
                                                        title="Düzenle"
                                                        type="button"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    {totalItems > 0 && (
                        <Pagination
                            currentPage={page}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            itemsPerPage={limit}
                            onPageChange={setPage}
                            onItemsPerPageChange={setLimit}
                        />
                    )}
                </div>
            )}

            {/* Add/Edit Modal */}
            <Dialog.Root open={isAddModalOpen || isEditModalOpen} onOpenChange={(open) => { if (!open) { setIsAddModalOpen(false); setIsEditModalOpen(false); } }}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
                    <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-6 shadow-xl z-50 overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <Dialog.Title className="text-lg font-bold">{isEditModalOpen ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}</Dialog.Title>
                            <Dialog.Close className="text-gray-400 hover:text-gray-600"><X className="h-6 w-6" /></Dialog.Close>
                        </div>

                        <form onSubmit={isEditModalOpen ? handleUpdateUser : handleAddUser} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">İsim</label>
                                    <input type="text" required value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Soyisim</label>
                                    <input type="text" required value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Kullanıcı Adı</label>
                                <div className="mt-1 flex rounded-md shadow-sm">
                                    <input type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 border" placeholder="Otomatik oluşturabilir veya elle girebilirsiniz" />
                                    <button type="button" onClick={generateUsername} className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 text-sm hover:bg-gray-100">
                                        <RefreshCw className="h-4 w-4 mr-1" /> Oluştur
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">E-posta</label>
                                <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">
                                    {isEditModalOpen ? 'Şifre (Değiştirmek istemiyorsanız boş bırakın)' : 'Şifre'}
                                </label>
                                <div className="mt-1 relative rounded-md shadow-sm">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required={!isEditModalOpen}
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        className="focus:ring-blue-500 focus:border-blue-500 block w-full pr-10 sm:text-sm border-gray-300 rounded-md p-2 border"
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Rol</label>
                                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border">
                                    <option value="tenant_user">Kullanıcı</option>
                                    <option value="tenant_admin">Yönetici</option>
                                </select>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
                                <button type="button" onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">İptal</button>
                                <button type="submit" disabled={isSubmitting} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                                    {isSubmitting ? (isEditModalOpen ? 'Güncelleniyor...' : 'Ekleniyor...') : (isEditModalOpen ? 'Güncelle' : 'Ekle')}
                                </button>
                            </div>
                        </form>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Toggle Status Confirmation Modal */}
            <Dialog.Root open={!!userToToggle} onOpenChange={(open) => !open && setUserToToggle(null)}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
                    <Dialog.Content className="fixed left-[50%] top-[50%] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-6 shadow-xl z-50">
                        <div className="flex items-center mb-4 text-amber-500">
                            <AlertTriangle className="h-6 w-6 mr-2" />
                            <Dialog.Title className="text-xl font-bold text-gray-900">Durum Değişikliği</Dialog.Title>
                        </div>
                        <div className="mb-6 text-gray-600">
                            Kullanıcıyı {userToToggle?.isActive ? 'pasife almak' : 'aktifleştirmek'} istediğinize emin misiniz?
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button onClick={() => setUserToToggle(null)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">İptal</button>
                            <button onClick={handleToggleStatus} disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                                {isSubmitting ? 'İşleniyor...' : 'Onayla'}
                            </button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

        </div>
    );
};
