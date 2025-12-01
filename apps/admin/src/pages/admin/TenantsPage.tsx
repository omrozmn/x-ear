import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Ban, CheckCircle, Users, CreditCard, Save, UserPlus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { adminApiInstance } from '@/lib/api';
import {
    useGetAdminTenants,
    usePutAdminTenantsIdStatus,
    useGetAdminTenantsIdUsers,
    usePutAdminTenantsId,
    useGetAdminPlans,
    useGetAdminAddons,
    Tenant,
    TenantStatus,
    User,
    Plan
} from '@/lib/api-client';

interface ExtendedTenant extends Tenant {
    current_plan_id?: string;
    subscription_start_date?: string;
    subscription_end_date?: string;
    feature_usage?: Record<string, any>;
}

const TenantEditModal = ({ tenantId, isOpen, onClose }: { tenantId: string | null, isOpen: boolean, onClose: () => void }) => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('general');

    // Fetch tenant details (we can use the list data or fetch individual)
    // For simplicity, let's fetch individual to get fresh data
    const [tenant, setTenant] = useState<ExtendedTenant | null>(null);
    const [loadingTenant, setLoadingTenant] = useState(false);

    useEffect(() => {
        if (tenantId && isOpen) {
            setLoadingTenant(true);
            adminApiInstance.get(`/admin/tenants/${tenantId}`)
                .then(res => setTenant(res.data.data.tenant as ExtendedTenant))
                .catch(err => toast.error('Kiracı detayları yüklenemedi'))
                .finally(() => setLoadingTenant(false));
        }
    }, [tenantId, isOpen]);

    if (!isOpen) return null;

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-40" />
                <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[90vh] w-[90vw] max-w-[900px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white shadow-2xl focus:outline-none data-[state=open]:animate-contentShow z-50 flex flex-col">
                    <div className="flex justify-between items-center p-6 border-b">
                        <Dialog.Title className="text-xl font-bold text-gray-900">
                            {loadingTenant ? 'Yükleniyor...' : `Abone Düzenle: ${tenant?.name}`}
                        </Dialog.Title>
                        <Dialog.Description className="sr-only">
                            Abone detaylarını ve ayarlarını düzenleyin.
                        </Dialog.Description>
                        <Dialog.Close asChild>
                            <button className="text-gray-400 hover:text-gray-500">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </Dialog.Close>
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-col">
                        {loadingTenant ? (
                            <div className="p-12 text-center">Yükleniyor...</div>
                        ) : tenant ? (
                            <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                                <div className="px-6 pt-4 border-b">
                                    <Tabs.List className="flex space-x-6">
                                        <Tabs.Trigger
                                            value="general"
                                            className="pb-3 text-sm font-medium text-gray-500 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 hover:text-gray-700"
                                        >
                                            Genel Bilgiler
                                        </Tabs.Trigger>
                                        <Tabs.Trigger
                                            value="users"
                                            className="pb-3 text-sm font-medium text-gray-500 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 hover:text-gray-700"
                                        >
                                            Kullanıcılar
                                        </Tabs.Trigger>
                                        <Tabs.Trigger
                                            value="subscription"
                                            className="pb-3 text-sm font-medium text-gray-500 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 hover:text-gray-700"
                                        >
                                            Abonelik & Plan
                                        </Tabs.Trigger>
                                    </Tabs.List>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                                    <Tabs.Content value="general" className="outline-none">
                                        <GeneralTab tenant={tenant} onUpdate={() => {
                                            queryClient.invalidateQueries({ queryKey: ['/admin/tenants'] });
                                            // Refresh local tenant data
                                            adminApiInstance.get(`/admin/tenants/${tenantId}`).then(res => setTenant(res.data.data.tenant as ExtendedTenant));
                                        }} />
                                    </Tabs.Content>
                                    <Tabs.Content value="users" className="outline-none">
                                        <UsersTab tenantId={tenant.id!} />
                                    </Tabs.Content>
                                    <Tabs.Content value="subscription" className="outline-none">
                                        <SubscriptionTab tenant={tenant} onUpdate={() => {
                                            queryClient.invalidateQueries({ queryKey: ['/admin/tenants'] });
                                            adminApiInstance.get(`/admin/tenants/${tenantId}`).then(res => setTenant(res.data.data.tenant as ExtendedTenant));
                                        }} />
                                    </Tabs.Content>
                                </div>
                            </Tabs.Root>
                        ) : (
                            <div className="p-6 text-red-500">Abone bulunamadı</div>
                        )}
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

const GeneralTab = ({ tenant, onUpdate }: { tenant: ExtendedTenant, onUpdate: () => void }) => {
    const { mutateAsync: updateTenant, isPending } = usePutAdminTenantsId();
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
                id: tenant.id!,
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

const UsersTab = ({ tenantId }: { tenantId: string }) => {
    const queryClient = useQueryClient();
    const { data: usersData, isLoading } = useGetAdminTenantsIdUsers(tenantId);
    const users = usersData?.data?.users || [];
    const [isAdding, setIsAdding] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newUser, setNewUser] = useState({ email: '', password: '', first_name: '', last_name: '', role: 'tenant_user', username: '' });

    // Edit User State
    const [editingUser, setEditingUser] = useState<any>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [userToToggle, setUserToToggle] = useState<any>(null);

    const confirmToggle = async () => {
        if (!userToToggle) return;
        try {
            await adminApiInstance.put(`/admin/tenants/${tenantId}/users/${userToToggle.id}`, {
                is_active: !userToToggle.is_active
            });
            toast.success(`Kullanıcı ${!userToToggle.is_active ? 'aktifleştirildi' : 'pasife alındı'}`);
            await queryClient.invalidateQueries({ queryKey: [`/admin/tenants/${tenantId}/users`] });
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
            await adminApiInstance.post(`/admin/tenants/${tenantId}/users`, newUser);
            toast.success('Kullanıcı eklendi');
            setIsAdding(false);
            setNewUser({ email: '', password: '', first_name: '', last_name: '', role: 'tenant_user', username: '' });
            await queryClient.invalidateQueries({ queryKey: [`/admin/tenants/${tenantId}/users`] });
        } catch (error: any) {
            toast.error(error.response?.data?.error?.message || 'Kullanıcı eklenemedi');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = (user: any) => {
        setUserToToggle(user);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Kullanıcı Listesi</h3>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
                >
                    <UserPlus className="mr-1.5 h-4 w-4" />
                    Kullanıcı Ekle
                </button>
            </div>

            {isAdding && (
                <div className="bg-white p-4 rounded-md border border-gray-200 shadow-sm">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Yeni Kullanıcı</h4>
                    <form onSubmit={handleAddUser} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <input
                            type="text"
                            placeholder="Kullanıcı Adı (Opsiyonel)"
                            value={newUser.username}
                            onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        />
                        <input
                            type="email"
                            placeholder="Email"
                            value={newUser.email}
                            onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                            required
                        />
                        <input
                            type="password"
                            placeholder="Şifre"
                            value={newUser.password}
                            onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                            required
                        />
                        <input
                            type="text"
                            placeholder="Ad"
                            value={newUser.first_name}
                            onChange={e => setNewUser({ ...newUser, first_name: e.target.value })}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        />
                        <input
                            type="text"
                            placeholder="Soyad"
                            value={newUser.last_name}
                            onChange={e => setNewUser({ ...newUser, last_name: e.target.value })}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        />
                        <select
                            value={newUser.role}
                            onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        >
                            <option value="tenant_user">Kullanıcı</option>
                            <option value="tenant_admin">Yönetici</option>
                        </select>
                        <div className="col-span-2 flex justify-end space-x-2">
                            <button
                                type="button"
                                onClick={() => setIsAdding(false)}
                                className="px-3 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
                            >
                                İptal
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-3 py-1.5 border border-transparent rounded text-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                            >
                                {isSubmitting ? 'Ekleniyor...' : 'Ekle'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {isLoading ? (
                <div>Yükleniyor...</div>
            ) : (
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
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                                        <div className="font-medium text-gray-900">{user.first_name} {user.last_name}</div>
                                        <div className="text-gray-500">{user.email}</div>
                                        <div className="text-xs text-gray-400">{user.username}</div>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                        {user.role === 'tenant_admin' ? 'Yönetici' : 'Kullanıcı'}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {user.is_active ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                        {user.last_login ? new Date(user.last_login).toLocaleDateString('tr-TR') : '-'}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-right">
                                        <div className="flex justify-end space-x-2">
                                            <button
                                                onClick={() => handleToggleStatus(user)}
                                                className={`text-xs font-medium px-2 py-1 rounded ${user.is_active ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-green-600 bg-green-50 hover:bg-green-100'}`}
                                            >
                                                {user.is_active ? 'Pasife Al' : 'Aktifleştir'}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditingUser(user);
                                                    setIsEditModalOpen(true);
                                                }}
                                                className="text-blue-600 hover:text-blue-900 p-1"
                                                title="Düzenle"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Edit User Modal */}
            {isEditModalOpen && editingUser && (
                <EditUserModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    user={editingUser}
                    tenantId={tenantId}
                    onSuccess={async () => await queryClient.invalidateQueries({ queryKey: [`/admin/tenants/${tenantId}/users`] })}
                />
            )}

            <ConfirmationModal
                isOpen={!!userToToggle}
                onClose={() => setUserToToggle(null)}
                onConfirm={confirmToggle}
                title="Durum Değişikliği"
                message={`Kullanıcıyı ${userToToggle?.is_active ? 'pasife almak' : 'aktifleştirmek'} istediğinize emin misiniz?`}
            />
        </div>
    );
};

const EditUserModal = ({ isOpen, onClose, user, tenantId, onSuccess }: { isOpen: boolean, onClose: () => void, user: any, tenantId: string, onSuccess: () => void }) => {
    const [formData, setFormData] = useState({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        username: user.username || '',
        role: user.role || 'tenant_user',
        password: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setFormData({
            first_name: user.first_name || '',
            last_name: user.last_name || '',
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
            await adminApiInstance.put(`/admin/tenants/${tenantId}/users/${user.id}`, formData);
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
                    <Dialog.Title className="text-xl font-bold text-gray-900 mb-4">
                        Kullanıcı Düzenle
                    </Dialog.Title>
                    <Dialog.Description className="sr-only">
                        Kullanıcı bilgilerini düzenleyin.
                    </Dialog.Description>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Ad</label>
                                <input
                                    type="text"
                                    value={formData.first_name}
                                    onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Soyad</label>
                                <input
                                    type="text"
                                    value={formData.last_name}
                                    onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Kullanıcı Adı</label>
                            <input
                                type="text"
                                value={formData.username}
                                onChange={e => setFormData({ ...formData, username: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                                type="email"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Rol</label>
                            <select
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                            >
                                <option value="tenant_user">Kullanıcı</option>
                                <option value="tenant_admin">Yönetici</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">Yeni Şifre (Opsiyonel)</label>
                            <input
                                type="password"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                placeholder="Değiştirmek için girin"
                                minLength={6}
                            />
                        </div>

                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                İptal
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loading ? 'Güncelleniyor...' : 'Güncelle'}
                            </button>
                        </div>
                    </form>

                    <Dialog.Close asChild>
                        <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-500">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </Dialog.Close>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

const SubscriptionTab = ({ tenant, onUpdate }: { tenant: ExtendedTenant, onUpdate: () => void }) => {
    const { data: plansData } = useGetAdminPlans({ limit: 100 });
    const plans = plansData?.data?.plans || [];

    // Fetch addons
    const { data: addonsData } = useGetAdminAddons({ limit: 100 });
    const addons = addonsData?.data?.addons || [];

    const [selectedPlanId, setSelectedPlanId] = useState(tenant.current_plan_id || '');
    const [billingInterval, setBillingInterval] = useState('YEARLY');
    const [selectedAddonId, setSelectedAddonId] = useState('');
    const [loading, setLoading] = useState(false);
    const [loadingAddon, setLoadingAddon] = useState(false);

    useEffect(() => {
        setSelectedPlanId(tenant.current_plan_id || '');
    }, [tenant]);

    const handleSubscribe = async () => {
        if (!selectedPlanId) return;
        setLoading(true);
        try {
            await adminApiInstance.post(`/admin/tenants/${tenant.id}/subscribe`, {
                plan_id: selectedPlanId,
                billing_interval: billingInterval
            });
            toast.success('Abonelik güncellendi');
            onUpdate();
        } catch (error: any) {
            toast.error(error.response?.data?.error?.message || 'Abonelik güncellenemedi');
        } finally {
            setLoading(false);
        }
    };

    const handleAddAddon = async () => {
        if (!selectedAddonId) return;
        setLoadingAddon(true);
        try {
            await adminApiInstance.post(`/admin/tenants/${tenant.id}/addons`, {
                addon_id: selectedAddonId
            });
            toast.success('Ek özellik eklendi');
            onUpdate();
        } catch (error: any) {
            toast.error(error.response?.data?.error?.message || 'Ek özellik eklenemedi');
        } finally {
            setLoadingAddon(false);
        }
    };

    return (
        <div className="space-y-8">
            <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                <h4 className="text-sm font-medium text-blue-900">Mevcut Abonelik</h4>
                <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-blue-500">Plan:</span> <span className="font-medium text-blue-900">{tenant.current_plan || 'Yok'}</span>
                    </div>
                    <div>
                        <span className="text-blue-500">Durum:</span> <span className="font-medium text-blue-900">{tenant.status}</span>
                    </div>
                    <div>
                        <span className="text-blue-500">Başlangıç:</span> <span className="font-medium text-blue-900">{tenant.subscription_start_date ? new Date(tenant.subscription_start_date).toLocaleDateString('tr-TR') : '-'}</span>
                    </div>
                    <div>
                        <span className="text-blue-500">Bitiş:</span> <span className="font-medium text-blue-900">{tenant.subscription_end_date ? new Date(tenant.subscription_end_date).toLocaleDateString('tr-TR') : '-'}</span>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900">Plan Değiştir / Ata</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Plan Seçin</label>
                        <select
                            value={selectedPlanId}
                            onChange={e => setSelectedPlanId(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        >
                            <option value="">Plan Seçin...</option>
                            {plans.map(plan => (
                                <option key={plan.id} value={plan.id}>{plan.name} ({plan.price} TL)</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Fatura Dönemi</label>
                        <select
                            value={billingInterval}
                            onChange={e => setBillingInterval(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        >
                            <option value="MONTHLY">Aylık</option>
                            <option value="YEARLY">Yıllık</option>
                        </select>
                    </div>
                </div>
                <div className="flex justify-end">
                    <button
                        onClick={handleSubscribe}
                        disabled={loading || !selectedPlanId}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        <CreditCard className="mr-2 h-4 w-4" />
                        {loading ? 'İşleniyor...' : 'Planı Ata / Güncelle'}
                    </button>
                </div>
            </div>

            <div className="space-y-4 border-t pt-6">
                <h4 className="text-lg font-medium text-gray-900">Ek Özellik Ekle (Add-ons)</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Ek Özellik Seçin</label>
                        <select
                            value={selectedAddonId}
                            onChange={e => setSelectedAddonId(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        >
                            <option value="">Seçiniz...</option>
                            {addons.map(addon => (
                                <option key={addon.id} value={addon.id}>
                                    {addon.name} ({addon.limit_amount} {addon.unit_name}) - {addon.price} TL
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className="flex justify-end">
                    <button
                        onClick={handleAddAddon}
                        disabled={loadingAddon || !selectedAddonId}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        {loadingAddon ? 'Ekleniyor...' : 'Ekle'}
                    </button>
                </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-md border border-gray-200 mt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Mevcut Limitler</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                    {tenant.feature_usage && Object.entries(tenant.feature_usage).map(([key, value]: [string, any]) => (
                        <div key={key} className="flex justify-between border-b pb-1">
                            <span className="text-gray-600 capitalize">{key}:</span>
                            <span className="font-medium text-gray-900">{value.limit === 0 ? 'Sınırsız' : value.limit}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default function TenantsPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [page, setPage] = useState(1);
    const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const queryClient = useQueryClient();

    // Fetch tenants
    const { data: tenantsData, isLoading, error } = useGetAdminTenants({
        page,
        limit: 10,
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? (statusFilter as TenantStatus) : undefined
    });

    const tenants = tenantsData?.data?.tenants || [];
    const pagination = tenantsData?.data?.pagination;

    // Status update mutation
    const { mutateAsync: updateStatus } = usePutAdminTenantsIdStatus();

    const handleStatusChange = async (tenantId: string, newStatus: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent row click
        if (window.confirm(`Abone durumunu ${newStatus} olarak değiştirmek istediğinize emin misiniz?`)) {
            await toast.promise(
                (async () => {
                    await updateStatus({
                        id: tenantId,
                        data: { status: newStatus as any }
                    });
                    await queryClient.invalidateQueries({ queryKey: ['/admin/tenants'] });
                })(),
                {
                    loading: 'Güncelleniyor...',
                    success: 'Abone durumu güncellendi',
                    error: (err) => err.response?.data?.error?.message || 'Durum güncellenemedi'
                }
            );
        }
    };

    const getStatusBadge = (status: string | undefined) => {
        if (!status) return null;

        const statusClasses: Record<string, string> = {
            [TenantStatus.active]: 'bg-green-100 text-green-800',
            [TenantStatus.suspended]: 'bg-yellow-100 text-yellow-800',
            [TenantStatus.cancelled]: 'bg-red-100 text-red-800',
            [TenantStatus.trial]: 'bg-blue-100 text-blue-800'
        };

        const statusLabels: Record<string, string> = {
            [TenantStatus.active]: 'Aktif',
            [TenantStatus.suspended]: 'Askıda',
            [TenantStatus.cancelled]: 'İptal',
            [TenantStatus.trial]: 'Deneme'
        };

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
                {statusLabels[status] || status}
            </span>
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Aboneler</h2>
                    <p className="mt-1 text-sm text-gray-500">
                        Abone organizasyonlarını ve ayarlarını yönetin
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    <Plus className="-ml-1 mr-2 h-5 w-5" />
                    Abone Ekle
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white shadow rounded-lg p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Abone ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="all">Tüm Durumlar</option>
                        <option value="active">Aktif</option>
                        <option value="trial">Deneme</option>
                        <option value="suspended">Askıya Alınmış</option>
                        <option value="cancelled">İptal Edilmiş</option>
                    </select>
                </div>
            </div>

            {/* Tenants Table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2 text-sm text-gray-500">Aboneler yükleniyor...</p>
                    </div>
                ) : error ? (
                    <div className="p-12 text-center">
                        <p className="text-red-600">Aboneler yüklenirken hata oluştu</p>
                        <button
                            onClick={() => queryClient.invalidateQueries({ queryKey: ['getAdminTenants'] })}
                            className="mt-2 text-sm text-blue-600 hover:text-blue-500 underline"
                        >
                            Tekrar Dene
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Organizasyon
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Durum
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Plan
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Kullanıcılar
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Oluşturulma
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            İşlemler
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {tenants.map((tenant) => (
                                        <tr
                                            key={tenant.id}
                                            className="hover:bg-gray-50 cursor-pointer transition-colors"
                                            onClick={() => setSelectedTenantId(tenant.id!)}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {tenant.name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {tenant.slug}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(tenant.status)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {tenant.current_plan || 'Plan Yok'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {tenant.current_users || 0} / {tenant.max_users || '∞'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {tenant.created_at ? new Date(tenant.created_at).toLocaleDateString('tr-TR') : '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <div className="flex justify-end space-x-2">
                                                    <button
                                                        className="text-blue-600 hover:text-blue-900 p-1"
                                                        title="Düzenle"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedTenantId(tenant.id!);
                                                        }}
                                                    >
                                                        <Edit className="h-5 w-5" />
                                                    </button>
                                                    {tenant.status === TenantStatus.active && (
                                                        <button
                                                            onClick={(e) => handleStatusChange(tenant.id!, TenantStatus.suspended, e)}
                                                            className="text-yellow-600 hover:text-yellow-900 p-1"
                                                            title="Askıya Al"
                                                        >
                                                            <Ban className="h-5 w-5" />
                                                        </button>
                                                    )}
                                                    {tenant.status === TenantStatus.suspended && (
                                                        <button
                                                            onClick={(e) => handleStatusChange(tenant.id!, TenantStatus.active, e)}
                                                            className="text-green-600 hover:text-green-900 p-1"
                                                            title="Aktifleştir"
                                                        >
                                                            <CheckCircle className="h-5 w-5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination && (pagination.totalPages || 0) > 1 && (
                            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                                <div className="flex-1 flex justify-between sm:hidden">
                                    <button
                                        onClick={() => setPage(page - 1)}
                                        disabled={page === 1}
                                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Önceki
                                    </button>
                                    <button
                                        onClick={() => setPage(page + 1)}
                                        disabled={page === pagination.totalPages}
                                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Sonraki
                                    </button>
                                </div>
                                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                    <div>
                                        <p className="text-sm text-gray-700">
                                            <span className="font-medium">{page}</span> / <span className="font-medium">{pagination.totalPages}</span> sayfa gösteriliyor
                                        </p>
                                    </div>
                                    <div>
                                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                                            <button
                                                onClick={() => setPage(page - 1)}
                                                disabled={page === 1}
                                                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Önceki
                                            </button>
                                            <button
                                                onClick={() => setPage(page + 1)}
                                                disabled={page === pagination.totalPages}
                                                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Sonraki
                                            </button>
                                        </nav>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <TenantEditModal
                tenantId={selectedTenantId}
                isOpen={!!selectedTenantId}
                onClose={() => setSelectedTenantId(null)}
            />

            <CreateTenantModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </div>
    );
}

const CreateTenantModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        name: '',
        owner_email: '',
        max_users: 5
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await adminApiInstance.post('/admin/tenants', formData);
            toast.success('Abone başarıyla oluşturuldu');
            queryClient.invalidateQueries({ queryKey: ['/admin/tenants'] });
            onClose();
            setFormData({ name: '', owner_email: '', max_users: 5 });
        } catch (error: any) {
            toast.error(error.response?.data?.error?.message || 'Abone oluşturulamadı');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-40" />
                <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white shadow-2xl focus:outline-none data-[state=open]:animate-contentShow z-50 p-6">
                    <Dialog.Title className="text-xl font-bold text-gray-900 mb-4">
                        Yeni Abone Ekle
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-gray-500 mb-4">
                        Yeni bir abone organizasyonu oluşturun.
                    </Dialog.Description>

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
                            <label className="block text-sm font-medium text-gray-700">Maksimum Kullanıcı</label>
                            <input
                                type="number"
                                value={formData.max_users}
                                onChange={e => setFormData({ ...formData, max_users: parseInt(e.target.value) })}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                min={1}
                            />
                        </div>

                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                İptal
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loading ? 'Oluşturuluyor...' : 'Oluştur'}
                            </button>
                        </div>
                    </form>

                    <Dialog.Close asChild>
                        <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-500">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </Dialog.Close>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }: { isOpen: boolean, onClose: () => void, onConfirm: () => Promise<void> | void, title: string, message: string }) => {
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;
    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[60]" />
                <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white shadow-2xl focus:outline-none z-[70] p-6">
                    <Dialog.Title className="text-lg font-bold text-gray-900 mb-2">
                        {title}
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-gray-500 mb-6">
                        {message}
                    </Dialog.Description>
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            İptal
                        </button>
                        <button
                            onClick={async () => {
                                setIsLoading(true);
                                await onConfirm();
                                setIsLoading(false);
                                onClose();
                            }}
                            disabled={isLoading}
                            className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
                        >
                            {isLoading ? 'İşleniyor...' : 'Onayla'}
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
