import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit, Ban, CheckCircle, Users, CreditCard, Save, UserPlus, Trash2, Settings, MessageSquare, PlusCircle, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Pagination from '@/components/ui/Pagination';
import { SmsDocumentsTab, GeneralTab } from './tenants';
import {
    useGetAdminTenants,
    useUpdateTenantStatus,
    useGetTenantUsers,
    useUpdateTenant,
    useCreateTenant,
    useGetAdminPlans,
    useGetAdminAddons,
    useGetTenant,
    useCreateTenantUser,
    useUpdateTenantUser,
    useSubscribeTenant,
    useAddTenantAddon,
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

    // Fetch tenant details
    const { data: tenantData, isLoading: loadingTenant, refetch } = useGetTenant(tenantId!, {
        query: {
            enabled: !!tenantId && isOpen
        }
    });
    const tenant = tenantData?.data?.tenant as ExtendedTenant;

    useEffect(() => {
        if (tenantId && isOpen) {
            refetch();
        }
    }, [tenantId, isOpen, refetch]);

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
                                        <Tabs.Trigger
                                            value="integrations"
                                            className="pb-3 text-sm font-medium text-gray-500 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 hover:text-gray-700"
                                        >
                                            Entegrasyonlar
                                        </Tabs.Trigger>
                                        <Tabs.Trigger
                                            value="sms-documents"
                                            className="pb-3 text-sm font-medium text-gray-500 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 hover:text-gray-700"
                                        >
                                            SMS Belgeleri
                                        </Tabs.Trigger>
                                    </Tabs.List>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                                    <Tabs.Content value="general" className="outline-none">
                                        <GeneralTab tenant={tenant} onUpdate={() => {
                                            queryClient.invalidateQueries({ queryKey: ['/api/admin/tenants'] });
                                            refetch();
                                        }} />
                                    </Tabs.Content>
                                    <Tabs.Content value="users" className="outline-none">
                                        <UsersTab tenantId={tenant.id!} />
                                    </Tabs.Content>
                                    <Tabs.Content value="subscription" className="outline-none">
                                        <SubscriptionTab tenant={tenant} onUpdate={() => {
                                            queryClient.invalidateQueries({ queryKey: ['/api/admin/tenants'] });
                                            refetch();
                                        }} />
                                    </Tabs.Content>
                                    <Tabs.Content value="integrations" className="outline-none">
                                        <IntegrationsTab tenant={tenant} onUpdate={() => {
                                            queryClient.invalidateQueries({ queryKey: ['/api/admin/tenants'] });
                                            refetch();
                                        }} />
                                    </Tabs.Content>
                                    <Tabs.Content value="sms-documents" className="outline-none">
                                        <SmsDocumentsTab tenantId={tenant.id!} onUpdate={() => {
                                            queryClient.invalidateQueries({ queryKey: ['/api/admin/tenants'] });
                                            refetch();
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
    const { data: usersData, isLoading } = useGetTenantUsers(tenantId);
    const users = usersData?.data?.users || [];
    const [isAdding, setIsAdding] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newUser, setNewUser] = useState({ email: '', password: '', firstName: '', lastName: '', role: 'tenant_user', username: '' });

    // Hooks
    const { mutateAsync: createTenantUser } = useCreateTenantUser();
    const { mutateAsync: updateTenantUser } = useUpdateTenantUser();

    // Edit User State
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
                            value={newUser.firstName}
                            onChange={e => setNewUser({ ...newUser, firstName: e.target.value })}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        />
                        <input
                            type="text"
                            placeholder="Soyad"
                            value={newUser.lastName}
                            onChange={e => setNewUser({ ...newUser, lastName: e.target.value })}
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
                                        {user.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR') : '-'}
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
                    onSuccess={async () => await queryClient.invalidateQueries({ queryKey: [`/api/admin/tenants/${tenantId}/users`] })}
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
                                    value={formData.firstName}
                                    onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Soyad</label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={e => setFormData({ ...formData, lastName: e.target.value })}
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

    // Data States
    const [selectedSmsPackage, setSelectedSmsPackage] = useState<number | null>(null);
    const [manualSmsLimit, setManualSmsLimit] = useState<number | string>(0);

    // Loading States
    const [loadingSubscribe, setLoadingSubscribe] = useState(false);
    const [loadingAddon, setLoadingAddon] = useState(false);
    const [loadingRemoveAddon, setLoadingRemoveAddon] = useState(false);
    const [loadingSmsUpdate, setLoadingSmsUpdate] = useState(false);

    // Legacy loading state support for strict linting if needed
    const loading = loadingSubscribe;
    const loadingSms = loadingSmsUpdate;

    const { mutateAsync: subscribeTenant } = useSubscribeTenant();
    const { mutateAsync: addTenantAddon } = useAddTenantAddon();
    const { mutateAsync: updateTenant } = useUpdateTenant();

    useEffect(() => {
        setSelectedPlanId(tenant.current_plan_id || '');
        // Prefer lowercase 'sms'
        const smsLimit = tenant.feature_usage?.['sms']?.limit ?? tenant.feature_usage?.['SMS']?.limit ?? 0;
        setManualSmsLimit(smsLimit);
    }, [tenant]);

    const handleSubscribe = async () => {
        if (!selectedPlanId) return;
        setLoadingSubscribe(true);
        try {
            await subscribeTenant({
                id: tenant.id!,
                data: {
                    plan_id: selectedPlanId,
                    billing_interval: billingInterval
                }
            });
            toast.success('Abonelik güncellendi');
            onUpdate();
        } catch (error: any) {
            toast.error(error.response?.data?.error?.message || 'Abonelik güncellenemedi');
        } finally {
            setLoadingSubscribe(false);
        }
    };

    const handleAddAddon = async () => {
        if (!selectedAddonId) return;
        setLoadingAddon(true);
        try {
            await addTenantAddon({
                id: tenant.id!,
                data: {
                    addon_id: selectedAddonId
                }
            });
            toast.success('Ek özellik eklendi');
            setSelectedAddonId('');
            onUpdate();
        } catch (error: any) {
            console.error('Add addon error:', error);
            toast.error(error.response?.data?.error?.message || 'Ek özellik eklenemedi');
        } finally {
            setLoadingAddon(false);
        }
    };

    const handleRemoveAddon = async (addonId: string) => {
        if (!addonId) return;
        if (!confirm('Bu özelliği kaldırmak istediğinize emin misiniz?')) return;
        setLoadingRemoveAddon(true);
        try {
            await apiClient.delete(`/admin/tenants/${tenant.id}/addons`, {
                data: { addon_id: addonId }
            });
            toast.success('Ek özellik kaldırıldı');
            onUpdate();
        } catch (error: any) {
            console.error('Remove addon error:', error);
            toast.error(error.response?.data?.error?.message || 'Ek özellik kaldırılamadı');
        } finally {
            setLoadingRemoveAddon(false);
        }
    };

    const handleUpdateSmsLimit = async () => {
        const limitVal = typeof manualSmsLimit === 'string' ? parseInt(manualSmsLimit) || 0 : manualSmsLimit;
        if (limitVal < 0) {
            toast.error('Limit 0\'dan küçük olamaz');
            return;
        }
        setLoadingSmsUpdate(true);
        try {
            const currentUsage = { ...(tenant.feature_usage || {}) };
            // Normalize key to lowercase 'sms'
            const key = 'sms';

            // If 'SMS' exists, migrate it to 'sms'
            if (currentUsage['SMS']) {
                currentUsage['sms'] = currentUsage['SMS'];
                delete currentUsage['SMS'];
            }

            currentUsage[key] = {
                ...(currentUsage[key] || {}),
                limit: typeof manualSmsLimit === 'string' ? parseInt(manualSmsLimit) || 0 : manualSmsLimit,
                used: currentUsage[key]?.used || 0
            };

            await updateTenant({
                id: tenant.id!,
                data: {
                    feature_usage: currentUsage
                } as any
            });
            toast.success('SMS limiti güncellendi');
            onUpdate();
        } catch (error: any) {
            console.error('Update SMS limit error:', error);
            toast.error(error.response?.data?.error?.message || 'SMS limiti güncellenemedi');
        } finally {
            setLoadingSmsUpdate(false);
        }
    };

    const handleAddSmsPackage = async () => {
        if (!selectedSmsPackage) {
            toast.error('Lütfen bir SMS paketi seçin');
            return;
        }
        setLoadingSmsUpdate(true);
        try {
            const currentUsage = { ...(tenant.feature_usage || {}) };

            // Normalize key to lowercase 'sms'
            const key = 'sms';

            // If 'SMS' exists, migrate it to 'sms'
            if (currentUsage['SMS']) {
                currentUsage['sms'] = currentUsage['SMS'];
                delete currentUsage['SMS'];
            }

            // Calculate new limit based on normalized key
            const currentLimit = currentUsage[key]?.limit || 0;
            const newLimit = currentLimit + selectedSmsPackage;

            currentUsage[key] = {
                ...(currentUsage[key] || {}),
                limit: newLimit,
                used: currentUsage[key]?.used || 0
            };

            await updateTenant({
                id: tenant.id!,
                data: {
                    feature_usage: currentUsage
                } as any
            });
            toast.success(`${selectedSmsPackage} SMS paketi eklendi`);
            setSelectedSmsPackage(null);
            setManualSmsLimit(newLimit);
            onUpdate();
        } catch (error: any) {
            console.error('Add SMS package error:', error);
            toast.error(error.response?.data?.error?.message || 'SMS paketi eklenemedi');
        } finally {
            setLoadingSmsUpdate(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* 1. Özet Kartları (En Üst) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg border border-blue-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                        <CreditCard className="w-16 h-16 text-blue-900" />
                    </div>
                    <h4 className="text-sm font-semibold text-blue-800 mb-3">Mevcut Abonelik</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Plan:</span>
                            <span className="font-bold text-gray-900">{tenant.current_plan || 'Yok'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Durum:</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${tenant.status?.toLowerCase() === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                {tenant.status}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Bitiş:</span>
                            <span className="text-gray-900">
                                {(tenant as any).subscription_end_date
                                    ? new Date((tenant as any).subscription_end_date).toLocaleDateString('tr-TR')
                                    : '-'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-white p-4 rounded-lg border border-indigo-100 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10">
                        <MessageSquare className="w-16 h-16 text-indigo-900" />
                    </div>
                    <h4 className="text-sm font-semibold text-indigo-800 mb-3">SMS Durumu</h4>
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-500">Toplam Limit:</span>
                            <span className="font-bold text-gray-900">{tenant.feature_usage?.['sms']?.limit || tenant.feature_usage?.['SMS']?.limit || 0}</span>
                        </div>
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-gray-500">Kullanılan:</span>
                            <span className="text-gray-900">{tenant.feature_usage?.['sms']?.used || tenant.feature_usage?.['SMS']?.used || 0}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                            <div
                                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(100, (((tenant.feature_usage?.['sms']?.used || 0) / (tenant.feature_usage?.['sms']?.limit || 1)) * 100))}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between text-xs font-medium">
                            <span className="text-gray-500">Kalan:</span>
                            <span className="text-indigo-600 font-bold text-lg">
                                {Math.max(0, (tenant.feature_usage?.['sms']?.limit || 0) - (tenant.feature_usage?.['sms']?.used || 0))}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. Yönetim Alanı (Orta) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-b py-8 border-gray-100">
                {/* SOL: Add-on Yönetimi */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-base font-semibold text-gray-900 flex items-center">
                            <PlusCircle className="w-4 h-4 mr-2" />
                            Ek Özellikler (Add-ons)
                        </h4>
                    </div>

                    {/* Ekleme Formu */}
                    <div className="flex gap-2">
                        <select
                            value={selectedAddonId}
                            onChange={e => setSelectedAddonId(e.target.value)}
                            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        >
                            <option value="">Özellik Seç...</option>
                            {addons.map(addon => (
                                <option key={addon.id} value={addon.id || ''}>
                                    {addon.name} ({addon.limit_amount} {addon.unit_name}) - {addon.price} TL
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={handleAddAddon}
                            disabled={loadingAddon || !selectedAddonId}
                            className="bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 text-sm font-medium whitespace-nowrap"
                        >
                            {loadingAddon ? '...' : '+ Ekle'}
                        </button>
                    </div>

                    {/* Liste */}
                    <div className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden min-h-[150px]">
                        {((tenant.settings as any)?.addons || []).length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm italic">
                                Henüz eklenmiş özellik yok.
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-200">
                                {((tenant.settings as any)?.addons || []).map((addon: any, idx: number) => (
                                    <li key={idx} className="p-3 flex items-center justify-between hover:bg-white transition-colors">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{addon.name}</p>
                                            <p className="text-xs text-gray-500">
                                                {addon.limit_amount} {addon.unit_name} • {addon.price} TL
                                                {addon.added_at && ` • ${new Date(addon.added_at).toLocaleDateString()}`}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleRemoveAddon(addon.addon_id || addon.id)}
                                            disabled={loadingRemoveAddon}
                                            className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50"
                                            title="Kaldır"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* SAĞ: SMS Yönetimi */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-base font-semibold text-gray-900 flex items-center">
                            <MessageSquare className="w-4 h-4 mr-2" />
                            SMS Yönetimi
                        </h4>
                    </div>

                    {/* Manuel Limit Düzenleme */}
                    <div className="bg-indigo-50 p-3 rounded-md border border-indigo-100">
                        <label className="block text-xs font-medium text-indigo-800 mb-1">Mevcut SMS Limiti (Manuel Düzenle)</label>
                        <div className="flex gap-2">
                            <input
                                type="number"
                                value={manualSmsLimit}
                                onChange={(e) => setManualSmsLimit(e.target.value === '' ? '' : parseInt(e.target.value))}
                                onFocus={(e) => e.target.select()}
                                className="flex-1 rounded border-indigo-200 focus:border-indigo-500 focus:ring-indigo-500 text-sm p-1.5"
                            />
                            <button
                                onClick={handleUpdateSmsLimit}
                                disabled={loadingSmsUpdate}
                                className="bg-indigo-600 text-white px-3 text-xs font-medium rounded hover:bg-indigo-700 disabled:opacity-50"
                            >
                                Güncelle
                            </button>
                        </div>
                    </div>

                    {/* Paket Seçimi */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Hızlı Paket Ekle</label>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                            {[100, 500, 1000, 5000].map(amount => (
                                <button
                                    key={amount}
                                    onClick={() => setSelectedSmsPackage(selectedSmsPackage === amount ? null : amount)}
                                    className={`
                                        px-3 py-2 border rounded-md text-center transition-all
                                        ${selectedSmsPackage === amount
                                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600'
                                            : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50 text-gray-700'}
                                    `}
                                >
                                    <span className="font-bold block">{amount}</span>
                                    <span className="text-xs text-opacity-80">SMS</span>
                                </button>
                            ))}
                        </div>

                        {/* Onay Butonu - Sadece seçim varsa görünür */}
                        {selectedSmsPackage && (
                            <button
                                onClick={handleAddSmsPackage}
                                disabled={loadingSmsUpdate}
                                className="w-full mt-2 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 shadow-md flex items-center justify-center font-medium transition-all animate-in fade-in slide-in-from-top-2"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                {loadingSmsUpdate ? 'Ekleniyor...' : `${selectedSmsPackage} SMS Paketini Ekle`}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. Alt Kısım: Mevcut Limitler Tablosu */}
            <div className="space-y-4">
                <h4 className="text-sm font-semibold text-gray-900 border-b pb-2">Mevcut Özellik Limitleri (Read-Only)</h4>
                <div className="bg-white border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Özellik</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Limit</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kullanılan</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sıfırlanma</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {tenant.feature_usage && Object.entries(tenant.feature_usage).map(([key, value]: [string, any]) => (
                                <tr key={key}>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">{key}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{value.limit === 0 ? 'Sınırsız' : value.limit}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{value.used || 0}</td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-400 text-xs">
                                        {value.last_reset ? new Date(value.last_reset).toLocaleDateString() : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 4. Plan Değiştirme (En Alt) */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mt-8">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <Settings className="w-4 h-4 mr-2" />
                    Plan Değişikliği
                </h4>
                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Yeni Plan</label>
                        <select
                            value={selectedPlanId}
                            onChange={e => setSelectedPlanId(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        >
                            <option value="">Plan Seçin...</option>
                            {plans.map(plan => (
                                <option key={plan.id} value={plan.id}>{plan.name} ({plan.price} TL)</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-500 mb-1">Fatura Dönemi</label>
                        <select
                            value={billingInterval}
                            onChange={e => setBillingInterval(e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        >
                            <option value="MONTHLY">Aylık</option>
                            <option value="YEARLY">Yıllık</option>
                        </select>
                    </div>
                    <button
                        onClick={handleSubscribe}
                        disabled={loadingSubscribe || !selectedPlanId}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium h-[38px]"
                    >
                        {loadingSubscribe ? '...' : 'Planı Güncelle'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const SmsDocumentsTab = ({ tenantId, onUpdate }: { tenantId: string, onUpdate: () => void }) => {
    const [documents, setDocuments] = useState<any[]>([]);
    const [documentsSubmitted, setDocumentsSubmitted] = useState(false);
    const [allDocumentsApproved, setAllDocumentsApproved] = useState(false);
    const [loading, setLoading] = useState(true);
    const [previewDoc, setPreviewDoc] = useState<{ type: string; url: string; filename: string } | null>(null);

    const DOCUMENT_LABELS: Record<string, string> = {
        contract: 'Sözleşme',
        id_card: 'Kimlik Fotokopisi',
        residence: 'İkametgah Belgesi',
        tax_plate: 'Vergi Levhası',
        activity_cert: 'Faaliyet Belgesi',
        signature_circular: 'İmza Sirküleri'
    };

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get(`/api/admin/tenants/${tenantId}/sms-documents`);
            const data = response.data?.data || {};
            setDocuments(data.documents || []);
            setDocumentsSubmitted(data.documentsSubmitted || false);
            setAllDocumentsApproved(data.allDocumentsApproved || false);
        } catch (error) {
            toast.error('Belgeler yüklenemedi');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, [tenantId]);

    const handleApprove = async (docType: string) => {
        try {
            await apiClient.put(`/api/admin/tenants/${tenantId}/sms-documents/${docType}/status`, {
                status: 'approved'
            });
            toast.success('Belge onaylandı');
            fetchDocuments();
            onUpdate();
        } catch (error: any) {
            toast.error(error.response?.data?.error?.message || 'Onaylama başarısız');
        }
    };

    const handleRequestRevision = async (docType: string) => {
        const note = prompt('Revizyon notu (opsiyonel):');
        try {
            await apiClient.put(`/api/admin/tenants/${tenantId}/sms-documents/${docType}/status`, {
                status: 'revision_requested',
                note: note || ''
            });
            toast.success('Revizyon istendi');
            fetchDocuments();
            onUpdate();
        } catch (error: any) {
            toast.error(error.response?.data?.error?.message || 'İşlem başarısız');
        }
    };

    const handlePreview = async (docType: string) => {
        const doc = documents.find(d => d.type === docType);
        if (!doc) return;
        try {
            const response = await apiClient.get(`/api/sms/documents/${docType}/download`);
            const previewUrl = response.data?.data?.url || response.data?.url;
            if (previewUrl) {
                setPreviewDoc({ type: docType, url: previewUrl, filename: doc.filename });
            }
        } catch (error) {
            toast.error('Önizleme açılamadı');
        }
    };

    const handleSendEmail = async () => {
        if (!allDocumentsApproved) {
            toast.error('Tüm belgeler onaylanmadan e-posta gönderilemez');
            return;
        }
        if (window.confirm('Tüm belgeleri e-posta ile göndermek istediğinize emin misiniz?')) {
            try {
                await apiClient.post(`/api/admin/tenants/${tenantId}/sms-documents/send-email`);
                toast.success('E-posta gönderildi');
            } catch (error: any) {
                toast.error(error.response?.data?.error?.message || 'E-posta gönderilemedi');
            }
        }
    };

    const getStatusBadge = (status: string) => {
        const badges: Record<string, { bg: string; text: string; label: string }> = {
            uploaded: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Yüklendi' },
            sent: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Gönderildi' },
            revision_requested: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Revizyon İstendi' },
            approved: { bg: 'bg-green-100', text: 'text-green-800', label: 'Onaylandı' }
        };
        const badge = badges[status] || badges.uploaded;
        return <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>{badge.label}</span>;
    };

    if (loading) return <div className="p-6">Yükleniyor...</div>;

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-gray-500" />
                        SMS Başvuru Belgeleri
                    </h3>
                    {allDocumentsApproved && (
                        <button
                            onClick={handleSendEmail}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                        >
                            <FileText className="w-4 h-4 mr-1.5" />
                            Belgeleri E-posta ile Gönder
                        </button>
                    )}
                </div>

                {!documentsSubmitted ? (
                    <div className="text-center py-8 text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                        <p>Henüz belge yüklenmemiş</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {documents.map((doc) => (
                            <div key={doc.type} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex-1">
                                    <div className="font-medium text-gray-900">{DOCUMENT_LABELS[doc.type] || doc.type}</div>
                                    <div className="text-sm text-gray-500 mt-1">{doc.filename}</div>
                                    <div className="mt-2">{getStatusBadge(doc.status || 'uploaded')}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handlePreview(doc.type)}
                                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                        title="Önizle"
                                    >
                                        <FileText className="w-4 h-4" />
                                    </button>
                                    {doc.status !== 'approved' && (
                                        <button
                                            onClick={() => handleApprove(doc.type)}
                                            className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded"
                                        >
                                            Onayla
                                        </button>
                                    )}
                                    {doc.status !== 'revision_requested' && (
                                        <button
                                            onClick={() => handleRequestRevision(doc.type)}
                                            className="px-3 py-1.5 text-sm font-medium text-orange-700 bg-orange-100 hover:bg-orange-200 rounded"
                                        >
                                            Revizyon İste
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {allDocumentsApproved && (
                    <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 text-green-800">
                            <CheckCircle className="w-5 h-5" />
                            <p className="font-medium">Tüm belgeler onaylandı. SMS Başlıkları sekmesi tenant için aktif.</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Preview Modal */}
            {previewDoc && (
                <Dialog.Root open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
                    <Dialog.Portal>
                        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[90]" />
                        <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[90vh] w-[90vw] max-w-4xl translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white shadow-2xl focus:outline-none z-[100] flex flex-col">
                            <div className="flex items-center justify-between p-4 border-b">
                                <Dialog.Title className="text-lg font-semibold text-gray-900">
                                    Belge Önizleme: {previewDoc.filename}
                                </Dialog.Title>
                                <Dialog.Close className="p-2 hover:bg-gray-100 rounded-lg">
                                    <XMarkIcon className="h-5 w-5" />
                                </Dialog.Close>
                            </div>
                            <div className="flex-1 p-4 overflow-auto">
                                <iframe src={previewDoc.url} className="w-full h-full border-0 rounded-lg min-h-[600px]" title="Document Preview" />
                            </div>
                        </Dialog.Content>
                    </Dialog.Portal>
                </Dialog.Root>
            )}
        </div>
    );
};

const IntegrationsTab = ({ tenant, onUpdate }: { tenant: ExtendedTenant, onUpdate: () => void }) => {
    const { mutateAsync: updateTenant, isPending } = useUpdateTenant();
    const [smsConfigData, setSmsConfigData] = useState<any>(null);
    const [loadingSmsConfig, setLoadingSmsConfig] = useState(true);

    // Initial State from tenant.settings
    const posSettings = (tenant.settings?.pos_integration || {}) as any;
    const invoiceSettings = (tenant.settings?.invoice_integration || {}) as any;
    const smsSettings = (tenant.settings?.sms_integration || {}) as any;

    const [config, setConfig] = useState({
        provider: 'paytr',
        enabled: posSettings.enabled || false,
        merchant_id: posSettings.merchant_id || '',
        merchant_key: posSettings.merchant_key || '',
        merchant_salt: posSettings.merchant_salt || '',
        test_mode: posSettings.test_mode || false
    });

    const [invoiceConfig, setInvoiceConfig] = useState({
        provider: 'birfatura',
        enabled: invoiceSettings.enabled || false,
        api_key: invoiceSettings.api_key || '',
        secret_key: invoiceSettings.secret_key || ''
    });

    const [smsConfig, setSmsConfig] = useState({
        enabled: smsSettings.enabled || false
    });

    // Fetch SMS config to check if API credentials exist
    useEffect(() => {
        const fetchSmsConfig = async () => {
            try {
                const response = await apiClient.get(`/api/admin/tenants/${tenant.id}/sms-config`);
                setSmsConfigData(response.data?.data || null);
            } catch (error) {
                console.error('Failed to fetch SMS config:', error);
            } finally {
                setLoadingSmsConfig(false);
            }
        };
        fetchSmsConfig();
    }, [tenant.id]);

    const handleChange = (field: string, value: any) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    const handleInvoiceChange = (field: string, value: any) => {
        setInvoiceConfig(prev => ({ ...prev, [field]: value }));
    };

    const handleSmsChange = (field: string, value: any) => {
        setSmsConfig(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Merge with existing settings
            const currentSettings = tenant.settings || {};
            const newSettings = {
                ...currentSettings,
                pos_integration: {
                    ...config,
                    updated_at: new Date().toISOString()
                },
                invoice_integration: {
                    ...invoiceConfig,
                    updated_at: new Date().toISOString()
                },
                sms_integration: {
                    ...smsConfig,
                    updated_at: new Date().toISOString()
                }
            };

            await updateTenant({
                id: tenant.id!,
                data: { settings: newSettings } as any
            });
            toast.success('Entegrasyon ayarları güncellendi');
            onUpdate();
        } catch (error: any) {
            toast.error(error.response?.data?.error?.message || 'Güncelleme başarısız');
        }
    };

    const canEnableSms = smsConfigData?.apiUsername && smsConfigData?.documentsEmail;

    return (
        <form onSubmit={handleSave} className="space-y-6 max-w-3xl p-6">
            {/* POS Integration */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-gray-500" />
                    Sanal POS Entegrasyonu
                </h3>

                <div className="grid grid-cols-1 gap-6">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                            <span className="font-medium text-gray-900">Aktif</span>
                            <p className="text-sm text-gray-500">POS entegrasyonunu etkinleştir</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.enabled}
                                onChange={e => handleChange('enabled', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {config.enabled && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Sağlayıcı</label>
                                <select
                                    value={config.provider}
                                    onChange={e => handleChange('provider', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                >
                                    <option value="paytr">PayTR</option>
                                    <option value="iyzico">Iyzico (Yakında)</option>
                                    <option value="stripe">Stripe (Yakında)</option>
                                </select>
                            </div>

                            <div className="space-y-4 border-t pt-4">
                                <h4 className="text-sm font-medium text-gray-900">PayTR Ayarları</h4>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-sm font-medium text-gray-700">Mağaza No (Merchant ID)</label>
                                        <input
                                            type="text"
                                            value={config.merchant_id}
                                            onChange={e => handleChange('merchant_id', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                            placeholder="örn. 123456"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Mağaza Parola (Merchant Key)</label>
                                        <input
                                            type="text"
                                            value={config.merchant_key}
                                            onChange={e => handleChange('merchant_key', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                            placeholder="Gizli anahtar"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Mağaza Gizli Anahtar (Merchant Salt)</label>
                                        <input
                                            type="text"
                                            value={config.merchant_salt}
                                            onChange={e => handleChange('merchant_salt', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                            placeholder="Gizli tuz (salt)"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={config.test_mode}
                                        onChange={e => handleChange('test_mode', e.target.checked)}
                                        id="test_mode"
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="test_mode" className="text-sm text-gray-700 select-none">
                                        Test Modu (Gerçek para çekilmez)
                                    </label>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Invoice Integration */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-gray-500" />
                    Fatura Entegrasyonu
                </h3>

                <div className="grid grid-cols-1 gap-6">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                            <span className="font-medium text-gray-900">Aktif</span>
                            <p className="text-sm text-gray-500">Fatura entegrasyonunu etkinleştir</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={invoiceConfig.enabled}
                                onChange={e => handleInvoiceChange('enabled', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    {invoiceConfig.enabled && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Sağlayıcı</label>
                                <select
                                    value={invoiceConfig.provider}
                                    onChange={e => handleInvoiceChange('provider', e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                                >
                                    <option value="birfatura">BirFatura</option>
                                    <option value="others">Diğer (Yakında)</option>
                                </select>
                            </div>

                            <div className="space-y-4 border-t pt-4">
                                <h4 className="text-sm font-medium text-gray-900">BirFatura Ayarları</h4>
                                <div className="bg-blue-50 p-4 rounded-md text-sm text-blue-700 mb-4">
                                    Integration Key (Entegrasyon Anahtarı) sistem ayarlarından otomatik olarak alınacaktır.
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">API Key</label>
                                        <input
                                            type="text"
                                            value={invoiceConfig.api_key}
                                            onChange={e => handleInvoiceChange('api_key', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border font-mono"
                                            placeholder="Abone'ye özel API Key"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Secret Key</label>
                                        <input
                                            type="text"
                                            value={invoiceConfig.secret_key}
                                            onChange={e => handleInvoiceChange('secret_key', e.target.value)}
                                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border font-mono"
                                            placeholder="Abone'ye özel Secret Key"
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* SMS Integration */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-gray-500" />
                    SMS Entegrasyonu
                </h3>

                <div className="grid grid-cols-1 gap-6">
                    {loadingSmsConfig ? (
                        <div className="p-4 text-center text-gray-500">Yükleniyor...</div>
                    ) : !canEnableSms ? (
                        <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                            <p className="text-sm text-yellow-800">
                                SMS entegrasyonunu aktifleştirmek için önce tenant'ın SMS API bilgilerini (API Username ve Documents Email) doldurması gerekiyor.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <span className="font-medium text-gray-900">Aktif</span>
                                    <p className="text-sm text-gray-500">SMS entegrasyonunu etkinleştir</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={smsConfig.enabled}
                                        onChange={e => handleSmsChange('enabled', e.target.checked)}
                                        disabled={!canEnableSms}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"></div>
                                </label>
                            </div>

                            {smsConfig.enabled && (
                                <div className="space-y-4 border-t pt-4">
                                    <div className="bg-green-50 p-4 rounded-md text-sm text-green-700">
                                        <p className="font-medium mb-1">SMS Entegrasyonu Aktif</p>
                                        <p>Tenant artık SMS belge yükleme alanını görebilir ve SMS başvurusu yapabilir.</p>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">API Username:</span>
                                            <span className="font-medium">{smsConfigData?.apiUsername || '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Documents Email:</span>
                                            <span className="font-medium">{smsConfigData?.documentsEmail || '-'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Belgeler Gönderildi:</span>
                                            <span className={`font-medium ${smsConfigData?.documentsSubmitted ? 'text-green-600' : 'text-gray-400'}`}>
                                                {smsConfigData?.documentsSubmitted ? 'Evet' : 'Hayır'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Tüm Belgeler Onaylı:</span>
                                            <span className={`font-medium ${smsConfigData?.allDocumentsApproved ? 'text-green-600' : 'text-gray-400'}`}>
                                                {smsConfigData?.allDocumentsApproved ? 'Evet' : 'Hayır'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="mt-6 flex justify-end">
                <button
                    type="submit"
                    disabled={isPending}
                    className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
                >
                    {isPending ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
                </button>
            </div>
        </form>
    );
};

export default function TenantsPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const queryClient = useQueryClient();

    // Fetch tenants
    const { data: tenantsData, isLoading, error } = useGetAdminTenants({
        page,
        limit,
        search: searchTerm || undefined,
        status: statusFilter !== 'all' ? (statusFilter as TenantStatus) : undefined
    });

    const tenants = tenantsData?.data?.tenants || [];
    const pagination = tenantsData?.data?.pagination;

    // Status update mutation
    const { mutateAsync: updateStatus } = useUpdateTenantStatus();

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
                    loading: 'Durum güncelleniyor...',
                    success: 'Abone durumu güncellendi',
                    error: 'Durum güncellenemedi'
                }
            );
        }
    };

    const handleDelete = async (tenantId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm('Bu aboneyi silmek istediğinize emin misiniz? Bu işlem geri alınamaz!')) {
            // Delete implementation would go here
            toast.error('Silme işlemi henüz aktif değil');
        }
    };

    const handleCreateSuccess = () => {
        queryClient.invalidateQueries({ queryKey: ['/admin/tenants'] });
    };

    return (
        <div className="p-6">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-semibold text-gray-900">Aboneler</h1>
                    <p className="mt-2 text-sm text-gray-700">
                        Sistemdeki tüm abonelerin listesi ve yönetimi.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Yeni Abone Ekle
                    </button>
                </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:w-96">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        className="block w-full rounded-md border-gray-300 pl-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                        placeholder="Abone ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-full sm:w-48">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="block w-full rounded-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    >
                        <option value="all">Tüm Durumlar</option>
                        <option value="active">Aktif</option>
                        <option value="trial">Deneme</option>
                        <option value="suspended">Askıya Alınmış</option>
                        <option value="cancelled">İptal Edilmiş</option>
                    </select>
                </div>
            </div>

            <div className="mt-8 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                                            Organizasyon
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Durum
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Plan
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Kullanıcılar
                                        </th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                                            Oluşturulma
                                        </th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                            <span className="sr-only">İşlemler</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-4">Yükleniyor...</td>
                                        </tr>
                                    ) : tenants.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="text-center py-4 text-gray-500">Kayıt bulunamadı</td>
                                        </tr>
                                    ) : (
                                        tenants.map((tenant) => (
                                            <tr
                                                key={tenant.id}
                                                className="hover:bg-gray-50 cursor-pointer"
                                                onClick={() => setSelectedTenantId(tenant.id!)}
                                            >
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                                                    <div className="flex items-center">
                                                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                            {tenant.name?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="ml-4">
                                                            <div className="font-medium text-gray-900">{tenant.name}</div>
                                                            <div className="text-gray-500">{tenant.owner_email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 
                                                        ${tenant.status === 'active' ? 'bg-green-100 text-green-800' :
                                                            tenant.status === 'trial' ? 'bg-blue-100 text-blue-800' :
                                                                tenant.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                                                                    'bg-red-100 text-red-800'}`}>
                                                        {tenant.status === 'active' ? 'Aktif' :
                                                            tenant.status === 'trial' ? 'Deneme' :
                                                                tenant.status === 'suspended' ? 'Askıda' : 'İptal'}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    {tenant.current_plan || 'Plan Yok'}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    <div className="flex items-center">
                                                        <Users className="mr-1.5 h-4 w-4 text-gray-400" />
                                                        {/* Assuming we don't have user count in list response, showing max */}
                                                        Max: {tenant.max_users}
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    {tenant.created_at ? new Date(tenant.created_at).toLocaleDateString('tr-TR') : '-'}
                                                </td>
                                                <td className="whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                    <div className="flex justify-end space-x-2">
                                                        {tenant.status !== 'active' && (
                                                            <button
                                                                onClick={(e) => handleStatusChange(tenant.id!, 'active', e)}
                                                                className="text-green-600 hover:text-green-900"
                                                                title="Aktifleştir"
                                                            >
                                                                <CheckCircle className="h-5 w-5" />
                                                            </button>
                                                        )}
                                                        {tenant.status === 'active' && (
                                                            <button
                                                                onClick={(e) => handleStatusChange(tenant.id!, 'suspended', e)}
                                                                className="text-yellow-600 hover:text-yellow-900"
                                                                title="Askıya Al"
                                                            >
                                                                <Ban className="h-5 w-5" />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => handleDelete(tenant.id!, e)}
                                                            className="text-red-600 hover:text-red-900"
                                                            title="Sil"
                                                        >
                                                            <Trash2 className="h-5 w-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <Pagination
                currentPage={page}
                totalPages={pagination?.totalPages || 1}
                totalItems={pagination?.total || 0}
                itemsPerPage={limit}
                onPageChange={setPage}
                onItemsPerPageChange={setLimit}
            />

            {/* Create Modal would go here - simplified for now */}
            {/* <CreateTenantModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSuccess={handleCreateSuccess} /> */}

            {/* Edit Modal */}
            <TenantEditModal
                tenantId={selectedTenantId}
                isOpen={!!selectedTenantId}
                onClose={() => setSelectedTenantId(null)}
            />
        </div>
    );
}

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }: { isOpen: boolean, onClose: () => void, onConfirm: () => void, title: string, message: string }) => {
    if (!isOpen) return null;

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[70]" />
                <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white shadow-2xl focus:outline-none z-[80] p-6">
                    <Dialog.Title className="text-lg font-bold text-gray-900 mb-2">
                        {title}
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-gray-500 mb-6">
                        {message}
                    </Dialog.Description>
                    <div className="flex justify-end space-x-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            İptal
                        </button>
                        <button
                            onClick={onConfirm}
                            className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                        >
                            Onayla
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
