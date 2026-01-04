import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Edit, UserPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useGetTenantUsers, useCreateTenantUser, useUpdateTenantUser } from '@/lib/api-client';
import { EditUserModal } from './EditUserModal';
import { ConfirmationModal } from './ConfirmationModal';

interface UsersTabProps {
    tenantId: string;
}

export const UsersTab = ({ tenantId }: UsersTabProps) => {
    const queryClient = useQueryClient();
    const { data: usersData, isLoading } = useGetTenantUsers(tenantId);
    const users = usersData?.data?.users || [];
    const [isAdding, setIsAdding] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newUser, setNewUser] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'tenant_user', username: '' });
    const { mutateAsync: createTenantUser } = useCreateTenantUser();
    const { mutateAsync: updateTenantUser } = useUpdateTenantUser();
    const [editingUser, setEditingUser] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [userToToggle, setUserToToggle] = useState<any>(null);

    const confirmToggle = async () => {
        if (!userToToggle) return;
        try {
            await updateTenantUser({
                id: tenantId,
                userId: userToToggle.id,
                data: { is_active: !userToToggle.is_active } as any
            });
            toast.success(`Kullanıcı ${!userToToggle.is_active ? 'aktifleştirildi' : 'pasife alındı'}`);
            await queryClient.invalidateQueries({ queryKey: [`/api/admin/tenants/${tenantId}/users`] });
        } catch (error: any) {
            toast.error(error.response?.data?.error?.message || 'Durum güncellenemedi');
        } finally {
            setUserToToggle(null);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await createTenantUser({
                id: tenantId,
                data: {
                    email: newUser.email,
                    password: newUser.password,
                    first_name: newUser.firstName,
                    last_name: newUser.lastName,
                    role: newUser.role,
                    username: newUser.username,
                    is_active: true
                } as any
            });
            toast.success('Kullanıcı eklendi');
            setIsAdding(false);
            setNewUser({ email: '', password: '', firstName: '', lastName: '', role: 'tenant_user', username: '' });
            await queryClient.invalidateQueries({ queryKey: [`/api/admin/tenants/${tenantId}/users`] });
        } catch (error: any) {
            toast.error(error.response?.data?.error?.message || 'Kullanıcı eklenemedi');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Kullanıcı Listesi</h3>
                <button onClick={() => setIsAdding(!isAdding)} className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200">
                    <UserPlus className="mr-1.5 h-4 w-4" />Kullanıcı Ekle
                </button>
            </div>

            {isAdding && (
                <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Yeni Kullanıcı</h4>
                    <form onSubmit={handleAddUser} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <input type="text" placeholder="Kullanıcı Adı (Opsiyonel)" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" />
                        <input type="email" placeholder="Email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" required />
                        <input type="password" placeholder="Şifre" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" required />
                        <input type="text" placeholder="Ad" value={newUser.firstName} onChange={e => setNewUser({ ...newUser, firstName: e.target.value })} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" />
                        <input type="text" placeholder="Soyad" value={newUser.lastName} onChange={e => setNewUser({ ...newUser, lastName: e.target.value })} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border" />
                        <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border">
                            <option value="tenant_user">Kullanıcı</option>
                            <option value="tenant_admin">Yönetici</option>
                        </select>
                        <div className="col-span-2 flex justify-end space-x-2">
                            <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50">İptal</button>
                            <button type="submit" disabled={isSubmitting} className="px-3 py-1.5 border border-transparent rounded text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">{isSubmitting ? 'Ekleniyor...' : 'Ekle'}</button>
                        </div>
                    </form>
                </div>
            )}

            {isLoading ? <div>Yükleniyor...</div> : (
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
                            {users.map((user: any) => (
                                <tr key={user.id}>
                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                                        <div className="font-medium text-gray-900">{user.first_name} {user.last_name}</div>
                                        <div className="text-gray-500">{user.email}</div>
                                        <div className="text-xs text-gray-400">{user.username}</div>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{user.role === 'tenant_admin' ? 'Yönetici' : 'Kullanıcı'}</td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{user.is_active ? 'Aktif' : 'Pasif'}</span>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{user.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR') : '-'}</td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-right">
                                        <div className="flex justify-end space-x-2">
                                            <button onClick={() => setUserToToggle(user)} className={`text-xs font-medium px-2 py-1 rounded ${user.is_active ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-green-600 bg-green-50 hover:bg-green-100'}`}>{user.is_active ? 'Pasife Al' : 'Aktifleştir'}</button>
                                            <button onClick={() => { setEditingUser(user); setIsEditModalOpen(true); }} className="text-blue-600 hover:text-blue-900 p-1" title="Düzenle"><Edit className="h-4 w-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isEditModalOpen && editingUser && (
                <EditUserModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} user={editingUser} tenantId={tenantId} onSuccess={async () => await queryClient.invalidateQueries({ queryKey: [`/api/admin/tenants/${tenantId}/users`] })} />
            )}

            <ConfirmationModal isOpen={!!userToToggle} onClose={() => setUserToToggle(null)} onConfirm={confirmToggle} title="Durum Değişikliği" message={`Kullanıcıyı ${userToToggle?.is_active ? 'pasife almak' : 'aktifleştirmek'} istediğinize emin misiniz?`} />
        </div>
    );
};
