
import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Mail, User, Shield, AlertCircle, CheckCircle2, Lock, Eye, EyeOff, Building2, Pencil, AlertTriangle } from 'lucide-react';
import { Button, Input, Select } from '@x-ear/ui-web';
import {
    useListTenantUsers,
    useCreateTenantUsers,
    useDeleteTenantUser,
    useUpdateTenantUser,
    getListTenantUsersQueryKey
} from '@/api/client/tenant-users.client';
import {
    UserRead,
    TenantUserCreate,
    TenantUserUpdate,
    ResponseEnvelopeListUserRead
} from '@/api/generated/schemas';
import { branchService, Branch } from '../../services/branch.service';
import { useAuthStore } from '../../stores/authStore';
import toast from 'react-hot-toast';
import { generateUsername } from '../../utils/stringUtils';

interface ConfirmationModal {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
}

export function TeamMembersTab() {
    const queryClient = useQueryClient();
    const { user: currentUser } = useAuthStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [branches, setBranches] = useState<Branch[]>([]);

    // Edit State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserRead | null>(null);
    const [editData, setEditData] = useState({
        username: '',
        email: '',
        firstName: '',
        lastName: '',
        role: '',
        branchId: '',
        password: '',
        isActive: true
    });
    const [updateError, setUpdateError] = useState('');
    const [isUpdating, setIsUpdating] = useState(false);

    // Confirmation Modal State
    const [confirmationModal, setConfirmationModal] = useState<ConfirmationModal>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
        type: 'info'
    });

    // Fetch branches on mount
    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const data = await branchService.getBranches();
                setBranches(data);
            } catch (error) {
                console.error('Failed to fetch branches:', error);
            }
        };
        fetchBranches();
    }, []);

    // Invite Form State
    const [inviteData, setInviteData] = useState({
        username: '',
        password: '',
        email: '',
        firstName: '',
        lastName: '',
        role: 'user',
        branchId: ''
    });
    const [inviteSuccess, setInviteSuccess] = useState('');
    const [inviteError, setInviteError] = useState('');

    // Queries and Mutations
    const { data: usersResponse, isLoading: loading, error: queryError, refetch } = useListTenantUsers();
    const error = queryError as Error | null;

    const inviteMutation = useCreateTenantUsers({
        mutation: {
            onSuccess: () => {
                setInviteSuccess('Kullanici basariyla olusturuldu!');
                refetch();
                setInviteData({ username: '', password: '', email: '', firstName: '', lastName: '', role: 'user', branchId: '' });
            },
            onError: (err: unknown) => {
                setInviteError((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Davet gonderilemedi.');
            }
        }
    });

    const deleteMutation = useDeleteTenantUser({
        mutation: {
            onSuccess: () => {
                refetch();
            },
            onError: () => {
                toast.error('Kullanici silinemedi.');
            }
        }
    });

    const updateUserMutation = useUpdateTenantUser();

    const handleInvite = (e: React.FormEvent) => {
        e.preventDefault();
        setInviteError('');
        setInviteSuccess('');
        const payload: TenantUserCreate = {
            username: inviteData.username,
            password: inviteData.password,
            email: inviteData.email,
            firstName: inviteData.firstName,
            lastName: inviteData.lastName,
            role: inviteData.role,
            branchIds: inviteData.branchId ? [inviteData.branchId] : []
        };

        inviteMutation.mutate({ data: payload });
    };

    const handleDelete = (userId: string) => {
        setConfirmationModal({
            isOpen: true,
            title: 'Kullaniciyi Sil',
            message: 'Bu kullaniciyi silmek istediginize emin misiniz? Bu islem geri alinamaz.',
            type: 'danger',
            onConfirm: () => {
                deleteMutation.mutate({ userId });
                setConfirmationModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    const handleEditClick = (user: UserRead) => {
        if (currentUser?.role === 'admin' && user.role === 'tenant_admin') {
            toast.error('Yoneticiler, Tenant Admin kullanicilarini duzenleyemez.');
            return;
        }
        setEditingUser(user);
        setEditData({
            username: user.username || '',
            email: user.email || '',
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            role: user.role || 'user',
            branchId: (user as unknown as Record<string, unknown>).branchId as string || '',
            password: '',
            isActive: user.isActive ?? true
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setIsUpdating(true);
        setUpdateError('');

        try {
            const payload: TenantUserUpdate = {
                firstName: editData.firstName,
                lastName: editData.lastName,
                role: editData.role as TenantUserUpdate['role'],
                isActive: editData.isActive ?? true,
                email: editData.email,
                username: editData.username,
                password: editData.password || undefined,
                branchIds: editData.branchId ? [editData.branchId] : []
            };

            await updateUserMutation.mutateAsync({ userId: editingUser.id, data: payload });
            setIsEditModalOpen(false);
            toast.success('Kullanici basariyla guncellendi.');
            refetch();
        } catch (err: unknown) {
            setUpdateError((err as Error).message || 'Guncelleme sirasinda bir hata olustu.');
            toast.error((err as Error).message || 'Guncelleme sirasinda bir hata olustu.');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleToggleStatus = async (user: UserRead) => {
        if (currentUser?.role === 'admin' && user.role === 'tenant_admin') {
            toast.error('Yoneticiler, Tenant Admin kullanicilarini pasife alamaz.');
            return;
        }

        const newIsActive = !user.isActive;

        setConfirmationModal({
            isOpen: true,
            title: user.isActive ? 'Kullaniciyi Pasife Al' : 'Kullaniciyi Aktiflestir',
            message: `Bu kullaniciyi ${user.isActive ? 'pasife almak' : 'aktiflestirmek'} istediginize emin misiniz ? `,
            type: user.isActive ? 'warning' : 'info',
            onConfirm: async () => {
                try {
                    console.log('[TeamMembersTab] Toggling user status:', { userId: user.id, currentIsActive: user.isActive, newIsActive });
                    console.log('[TeamMembersTab] Toggling user status:', { userId: user.id, currentIsActive: user.isActive, newIsActive });
                    await updateUserMutation.mutateAsync({ userId: user.id, data: { isActive: newIsActive } });
                    toast.success(`Kullanici ${user.isActive ? 'pasife alindi' : 'aktiflestirildi'}.`);
                    // Invalidate and refetch to ensure UI updates
                    queryClient.invalidateQueries({ queryKey: getListTenantUsersQueryKey() });
                    await refetch();
                } catch (err: unknown) {
                    console.error('[TeamMembersTab] Toggle status error:', err);
                    const errorObj = err as { response?: { data?: { error?: { message?: string } } }; message?: string };
                    toast.error(errorObj?.response?.data?.error?.message || errorObj?.message || 'Durum guncellenemedi.');
                }
                setConfirmationModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    // Backend returns ResponseEnvelopeListUserRead
    const usersResponseTyped = usersResponse as ResponseEnvelopeListUserRead | undefined;
    const users = Array.isArray(usersResponseTyped?.data) ? usersResponseTyped!.data : [];

    const getRoleLabel = (role: string) => {
        const labels: Record<string, string> = {
            'admin': 'Yonetici',
            'tenant_admin': 'Tenant Admin',
            'doctor': 'Doktor',
            'secretary': 'Sekreter',
            'user': 'Kullanici'
        };
        return labels[role] || role;
    };

    const getRoleStyle = (role: string) => {
        const styles: Record<string, string> = {
            'admin': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
            'tenant_admin': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
            'doctor': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            'secretary': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
            'user': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
        };
        return styles[role] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Ekip Uyeleri</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Sistemdeki tum kullanicilari yonetin</p>
                </div>
                <Button
                    onClick={() => setIsModalOpen(true)}
                    variant="primary"
                    className="flex items-center"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Yeni Kullanici Ekle
                </Button>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <div>
                        <div className="font-medium">Kullanicilar yuklenirken bir hata olustu.</div>
                        {(error as Error)?.message && (
                            <div className="text-sm mt-1">{String((error as Error).message)}</div>
                        )}
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Kullanici</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rol</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Durum</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Katilma Tarihi</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Islemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Yukleniyor...</td>
                            </tr>
                        ) : users.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Henuz ekip uyesi eklenmemis.</td>
                            </tr>
                        ) : (
                            users.map((user: UserRead) => (
                                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold mr-3">
                                                {user.firstName?.[0] || user.email?.[0] || '?'}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white">
                                                    {user.firstName} {user.lastName}
                                                </div>
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleStyle(user.role || '')} `}>
                                            {getRoleLabel(user.role || '')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isActive
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                            } `}>
                                            {user.isActive ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('tr-TR') : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end items-center space-x-2">
                                        {user.isActive ? (
                                            <Button
                                                onClick={() => handleToggleStatus(user)}
                                                size="sm"
                                                variant="outline"
                                                className="border-transparent text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:ring-yellow-500"
                                            >
                                                Pasife Al
                                            </Button>
                                        ) : (
                                            <Button
                                                onClick={() => handleToggleStatus(user)}
                                                size="sm"
                                                variant="outline"
                                                className="border-transparent text-green-700 bg-green-100 hover:bg-green-200 focus:ring-green-500"
                                            >
                                                Aktiflestir
                                            </Button>
                                        )}
                                        <Button
                                            onClick={() => handleEditClick(user)}
                                            variant="ghost"
                                            size="sm"
                                            className="text-blue-600 hover:text-blue-800 p-1"
                                            title="Duzenle"
                                        >
                                            <Pencil className="w-5 h-5" />
                                        </Button>
                                        <Button
                                            onClick={() => handleDelete(user.id)}
                                            variant="ghost"
                                            size="sm"
                                            className="text-gray-400 hover:text-red-600 p-1"
                                            title="Kullaniciyi Sil"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Invite Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Yeni Kullanici Olustur</h2>

                        {inviteSuccess ? (
                            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center text-green-700 mb-2">
                                    <CheckCircle2 className="w-5 h-5 mr-2" />
                                    Davet Basarili!
                                </div>
                                <p className="text-sm text-green-600 break-all">{inviteSuccess}</p>
                                <Button
                                    onClick={() => { setIsModalOpen(false); setInviteSuccess(''); }}
                                    fullWidth
                                    variant="success"
                                    className="mt-4"
                                >
                                    Tamam
                                </Button>
                            </div>
                        ) : (
                            <form onSubmit={handleInvite} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ad</label>
                                        <Input
                                            type="text"
                                            required
                                            value={inviteData.firstName}
                                            onChange={(e) => {
                                                const newFirstName = e.target.value;
                                                const newUsername = generateUsername(newFirstName, inviteData.lastName);
                                                setInviteData({
                                                    ...inviteData,
                                                    firstName: newFirstName,
                                                    username: newUsername
                                                });
                                            }}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Soyad</label>
                                        <Input
                                            type="text"
                                            required
                                            value={inviteData.lastName}
                                            onChange={(e) => {
                                                const newLastName = e.target.value;
                                                const newUsername = generateUsername(inviteData.firstName, newLastName);
                                                setInviteData({
                                                    ...inviteData,
                                                    lastName: newLastName,
                                                    username: newUsername
                                                });
                                            }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kullanici Adi *</label>
                                    <div className="relative">

                                        <Input
                                            type="text"
                                            required
                                            value={inviteData.username}
                                            onChange={(e) => setInviteData({ ...inviteData, username: e.target.value })}
                                            leftIcon={<User className="w-5 h-5" />}
                                            placeholder="kullanici.adi"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sifre *</label>
                                    <div className="relative">

                                        <Input
                                            type={showPassword ? "text" : "password"}
                                            required
                                            value={inviteData.password}
                                            onChange={(e) => setInviteData({ ...inviteData, password: e.target.value })}
                                            leftIcon={<Lock className="w-5 h-5" />}
                                            rightIcon={
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="p-1 h-auto"
                                                >
                                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </Button>
                                            }
                                            placeholder="Guvenli sifre olusturun"
                                            minLength={6}
                                        />
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Minimum 6 karakter</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-posta Adresi (Opsiyonel)</label>
                                    <div className="relative">
                                        <Input
                                            type="email"
                                            value={inviteData.email}
                                            onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                                            leftIcon={<Mail className="w-5 h-5" />}
                                            placeholder="ornek@sirket.com"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rol</label>
                                        <div className="relative">
                                            <Select
                                                value={inviteData.role}
                                                onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                                                className="pl-10"
                                                options={[
                                                    { value: "user", label: "Kullanici" },
                                                    { value: "admin", label: "Yonetici" },
                                                    { value: "tenant_admin", label: "Tenant Admin" },
                                                    { value: "doctor", label: "Doktor" },
                                                    { value: "secretary", label: "Sekreter" }
                                                ]}
                                            />
                                            <div className="absolute left-3 top-2.5 pointer-events-none">
                                                <Shield className="w-5 h-5 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sube</label>
                                        <div className="relative">
                                            <Select
                                                value={inviteData.branchId}
                                                onChange={(e) => setInviteData({ ...inviteData, branchId: e.target.value })}
                                                className="pl-10"
                                                placeholder="Sube Seciniz (Opsiyonel)"
                                                options={branches.map((branch) => ({
                                                    value: branch.id,
                                                    label: branch.name
                                                }))}
                                            />
                                            <div className="absolute left-3 top-2.5 pointer-events-none">
                                                <Building2 className="w-5 h-5 text-gray-400" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {inviteError && (
                                    <div className="text-sm text-red-600 flex items-center">
                                        <AlertCircle className="w-4 h-4 mr-1" />
                                        {inviteError}
                                    </div>
                                )}

                                <div className="flex space-x-3 pt-4">
                                    <Button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        variant="outline"
                                        className="flex-1"
                                    >
                                        İptal
                                    </Button>
                                    <Button
                                        type="submit"
                                        loading={inviteMutation.isPending}
                                        variant="primary"
                                        className="flex-1"
                                    >
                                        Kullanıcı Oluştur
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Kullanici Duzenle</h2>

                        <form onSubmit={handleUpdateUser} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ad</label>
                                    <Input
                                        type="text"
                                        value={editData.firstName}
                                        onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Soyad</label>
                                    <Input
                                        type="text"
                                        value={editData.lastName}
                                        onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kullanici Adi</label>
                                <div className="relative">

                                    <Input
                                        type="text"
                                        required
                                        value={editData.username}
                                        onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                                        leftIcon={<User className="w-5 h-5" />}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Yeni Sifre (Opsiyonel)</label>
                                <div className="relative">

                                    <Input
                                        type={showPassword ? "text" : "password"}
                                        value={editData.password}
                                        onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                                        leftIcon={<Lock className="w-5 h-5" />}
                                        rightIcon={
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="p-1 h-auto"
                                            >
                                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                            </Button>
                                        }
                                        placeholder="Degistirmek icin girin"
                                        minLength={6}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-posta Adresi</label>
                                <div className="relative">

                                    <Input
                                        type="email"
                                        value={editData.email}
                                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                                        leftIcon={<Mail className="w-5 h-5" />}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rol</label>
                                <div className="relative">
                                    <Select
                                        value={editData.role}
                                        onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                                        className="pl-10"
                                        options={[
                                            { value: "user", label: "Kullanici" },
                                            { value: "admin", label: "Yonetici" },
                                            { value: "tenant_admin", label: "Tenant Admin" },
                                            { value: "doctor", label: "Doktor" },
                                            { value: "secretary", label: "Sekreter" }
                                        ]}
                                    />

                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sube</label>
                                <div className="relative">
                                    <Select
                                        value={editData.branchId}
                                        onChange={(e) => setEditData({ ...editData, branchId: e.target.value })}
                                        className="pl-10"
                                        placeholder="Sube Seciniz (Opsiyonel)"
                                        options={branches.map((branch) => ({
                                            value: branch.id,
                                            label: branch.name
                                        }))}
                                    />

                                </div>
                            </div>

                            {updateError && (
                                <div className="text-sm text-red-600 flex items-center">
                                    <AlertCircle className="w-4 h-4 mr-1" />
                                    {updateError}
                                </div>
                            )}

                            <div className="flex space-x-3 pt-4">
                                <Button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    variant="outline"
                                    className="flex-1"
                                >
                                    Iptal
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={isUpdating}
                                    loading={isUpdating}
                                    variant="primary"
                                    className="flex-1"
                                >
                                    {isUpdating ? 'Guncelleniyor...' : 'Guncelle'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmationModal.isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6 transform transition-all">
                        <div className={`flex items - center mb - 4 ${confirmationModal.type === 'danger' ? 'text-red-600' :
                            confirmationModal.type === 'warning' ? 'text-amber-500' : 'text-blue-600'
                            } `}>
                            <AlertTriangle className="w-6 h-6 mr-2" />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {confirmationModal.title}
                            </h3>
                        </div>

                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            {confirmationModal.message}
                        </p>

                        <div className="flex justify-end space-x-3">
                            <Button
                                onClick={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
                                variant="outline"
                            >
                                İptal
                            </Button>
                            <Button
                                onClick={confirmationModal.onConfirm}
                                variant={confirmationModal.type === 'danger' ? 'danger' : (confirmationModal.type === 'warning' ? 'default' : 'primary')}
                            >
                                Onayla
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
