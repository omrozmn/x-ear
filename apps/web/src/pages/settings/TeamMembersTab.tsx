import React, { useState, useEffect } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { Plus, Trash2, Mail, User, Shield, AlertCircle, CheckCircle2, Lock, Eye, EyeOff, Building2, Pencil, AlertTriangle } from 'lucide-react';
import {
    useListUsersApiUsersGet,
    useCreateUserApiUsersPost,
    useDeleteUserApiUsersUserIdDelete,
    useUpdateUserApiUsersUserIdPut
} from '@/api/generated';
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
    const [editingUser, setEditingUser] = useState<any>(null);
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
    const { data: usersResponse, isLoading: loading, error, refetch } = useListUsersApiUsersGet();

    const inviteMutation = useCreateUserApiUsersPost({
        mutation: {
            onSuccess: () => {
                setInviteSuccess('Kullanici basariyla olusturuldu!');
                refetch();
                setInviteData({ username: '', password: '', email: '', firstName: '', lastName: '', role: 'user', branchId: '' });
            },
            onError: (err: any) => {
                setInviteError(err?.response?.data?.error || 'Davet gonderilemedi.');
            }
        }
    });

    const deleteMutation = useDeleteUserApiUsersUserIdDelete({
        mutation: {
            onSuccess: () => {
                refetch();
            },
            onError: () => {
                toast.error('Kullanici silinemedi.');
            }
        }
    });

    const updateUserMutation = useUpdateUserApiUsersUserIdPut();

    const handleInvite = (e: React.FormEvent) => {
        e.preventDefault();
        setInviteError('');
        setInviteSuccess('');
        // @ts-ignore - Temporary fix for type mismatch if UserCreate differs slightly or strict check fails
        inviteMutation.mutate({ data: inviteData });
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

    const handleEditClick = (user: any) => {
        if (currentUser?.role === 'admin' && user.role === 'tenant_admin') {
            toast.error('Yoneticiler, Tenant Admin kullanicilarini duzenleyemez.');
            return;
        }
        setEditingUser(user);
        setEditData({
            username: user.username || '',
            email: user.email || '',
            firstName: user.first_name || '',
            lastName: user.last_name || '',
            role: user.role || 'user',
            branchId: user.branches && user.branches.length > 0 ? user.branches[0].id : '',
            password: '',
            isActive: user.isActive
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser) return;
        setIsUpdating(true);
        setUpdateError('');

        try {
            const payload: any = {
                username: editData.username,
                email: editData.email,
                firstName: editData.firstName,
                lastName: editData.lastName,
                role: editData.role,
                isActive: editData.isActive
            };
            if (editData.password) payload.password = editData.password;
            if (editData.branchId) payload.branchIds = [editData.branchId];
            else payload.branchIds = [];

            await updateUserMutation.mutateAsync({ userId: editingUser.id, data: payload });
            setIsEditModalOpen(false);
            toast.success('Kullanici basariyla guncellendi.');
            refetch();
        } catch (err: any) {
            setUpdateError(err.message || 'Guncelleme sirasinda bir hata olustu.');
            toast.error(err.message || 'Guncelleme sirasinda bir hata olustu.');
        } finally {
            setIsUpdating(false);
        }
    };

    const handleToggleStatus = async (user: any) => {
        if (currentUser?.role === 'admin' && user.role === 'tenant_admin') {
            toast.error('Yoneticiler, Tenant Admin kullanicilarini pasife alamaz.');
            return;
        }

        setConfirmationModal({
            isOpen: true,
            title: user.isActive ? 'Kullaniciyi Pasife Al' : 'Kullaniciyi Aktiflestir',
            message: `Bu kullaniciyi ${user.isActive ? 'pasife almak' : 'aktiflestirmek'} istediginize emin misiniz?`,
            type: user.isActive ? 'warning' : 'info',
            onConfirm: async () => {
                const previousData = queryClient.getQueryData(['tenantUsersList']);

                queryClient.setQueryData(['tenantUsersList'], (old: any) => {
                    if (!old?.data?.data) return old;
                    return {
                        ...old,
                        data: {
                            ...old.data,
                            data: old.data.data.map((u: any) =>
                                u.id === user.id ? { ...u, isActive: !user.isActive } : u
                            )
                        }
                    };
                });

                try {
                    await updateUserMutation.mutateAsync({ userId: user.id, data: { isActive: !user.isActive } as any });
                    toast.success(`Kullanici ${user.isActive ? 'pasife alindi' : 'aktiflestirildi'}.`);
                    queryClient.invalidateQueries({ queryKey: ['tenantUsersList'] });
                } catch {
                    queryClient.setQueryData(['tenantUsersList'], previousData);
                    toast.error('Durum guncellenemedi.');
                }
                setConfirmationModal(prev => ({ ...prev, isOpen: false }));
            }
        });
    };

    // Backend returns { data: User[], meta: {...}, success: boolean }
    // usersResponse is AxiosResponse, so usersResponse.data is the backend response
    const backendResponse = (usersResponse as any)?.data as any;
    const users = Array.isArray(backendResponse) ? backendResponse : (backendResponse?.data || []);

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
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Yeni Kullanici Ekle
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <div>
                        <div className="font-medium">Kullanicilar yuklenirken bir hata olustu.</div>
                        {(error as any)?.message && (
                            <div className="text-sm mt-1">{String((error as any).message)}</div>
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
                            users.map((user: any) => (
                                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold mr-3">
                                                {user.first_name?.[0] || user.username?.[0] || '?'}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900 dark:text-white">
                                                    {user.first_name} {user.last_name}
                                                </div>
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleStyle(user.role)}`}>
                                            {getRoleLabel(user.role)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isActive
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                            }`}>
                                            {user.isActive ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        {user.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR') : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right flex justify-end items-center space-x-2">
                                        {user.isActive ? (
                                            <button
                                                onClick={() => handleToggleStatus(user)}
                                                className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
                                            >
                                                Pasife Al
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleToggleStatus(user)}
                                                className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                                            >
                                                Aktiflestir
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleEditClick(user)}
                                            className="text-blue-600 hover:text-blue-800 transition-colors p-1"
                                            title="Duzenle"
                                        >
                                            <Pencil className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user.id)}
                                            className="text-gray-400 hover:text-red-600 transition-colors p-1"
                                            title="Kullaniciyi Sil"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
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
                                <button
                                    onClick={() => { setIsModalOpen(false); setInviteSuccess(''); }}
                                    className="mt-4 w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                >
                                    Tamam
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleInvite} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Ad</label>
                                        <input
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
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Soyad</label>
                                        <input
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
                                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kullanici Adi *</label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            required
                                            value={inviteData.username}
                                            onChange={(e) => setInviteData({ ...inviteData, username: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                            placeholder="kullanici.adi"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sifre *</label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            required
                                            value={inviteData.password}
                                            onChange={(e) => setInviteData({ ...inviteData, password: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Guvenli sifre olusturun"
                                            minLength={6}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Minimum 6 karakter</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-posta Adresi (Opsiyonel)</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                        <input
                                            type="email"
                                            value={inviteData.email}
                                            onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                            placeholder="ornek@sirket.com"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rol</label>
                                    <div className="relative">
                                        <Shield className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                        <select
                                            value={inviteData.role}
                                            onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="user">Kullanici</option>
                                            <option value="admin">Yonetici</option>
                                            <option value="tenant_admin">Tenant Admin</option>
                                            <option value="doctor">Doktor</option>
                                            <option value="secretary">Sekreter</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sube</label>
                                    <div className="relative">
                                        <Building2 className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                        <select
                                            value={inviteData.branchId}
                                            onChange={(e) => setInviteData({ ...inviteData, branchId: e.target.value })}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="">Sube Seciniz (Opsiyonel)</option>
                                            {branches.map((branch) => (
                                                <option key={branch.id} value={branch.id}>{branch.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {inviteError && (
                                    <div className="text-sm text-red-600 flex items-center">
                                        <AlertCircle className="w-4 h-4 mr-1" />
                                        {inviteError}
                                    </div>
                                )}

                                <div className="flex space-x-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        Iptal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={inviteMutation.isPending}
                                        className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                    >
                                        {inviteMutation.isPending ? 'Olusturuluyor...' : 'Kullanici Olustur'}
                                    </button>
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
                                    <input
                                        type="text"
                                        value={editData.firstName}
                                        onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Soyad</label>
                                    <input
                                        type="text"
                                        value={editData.lastName}
                                        onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Kullanici Adi</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        required
                                        value={editData.username}
                                        onChange={(e) => setEditData({ ...editData, username: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Yeni Sifre (Opsiyonel)</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={editData.password}
                                        onChange={(e) => setEditData({ ...editData, password: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Degistirmek icin girin"
                                        minLength={6}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                    >
                                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-posta Adresi</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                    <input
                                        type="email"
                                        value={editData.email}
                                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rol</label>
                                <div className="relative">
                                    <Shield className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                    <select
                                        value={editData.role}
                                        onChange={(e) => setEditData({ ...editData, role: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="user">Kullanici</option>
                                        <option value="admin">Yonetici</option>
                                        <option value="tenant_admin">Tenant Admin</option>
                                        <option value="doctor">Doktor</option>
                                        <option value="secretary">Sekreter</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sube</label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                                    <select
                                        value={editData.branchId}
                                        onChange={(e) => setEditData({ ...editData, branchId: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Sube Seciniz (Opsiyonel)</option>
                                        {branches.map((branch) => (
                                            <option key={branch.id} value={branch.id}>{branch.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {updateError && (
                                <div className="text-sm text-red-600 flex items-center">
                                    <AlertCircle className="w-4 h-4 mr-1" />
                                    {updateError}
                                </div>
                            )}

                            <div className="flex space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Iptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdating}
                                    className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {isUpdating ? 'Guncelleniyor...' : 'Guncelle'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Confirmation Modal */}
            {confirmationModal.isOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-sm w-full p-6 transform transition-all">
                        <div className={`flex items-center mb-4 ${confirmationModal.type === 'danger' ? 'text-red-600' :
                            confirmationModal.type === 'warning' ? 'text-amber-500' : 'text-blue-600'
                            }`}>
                            <AlertTriangle className="w-6 h-6 mr-2" />
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                {confirmationModal.title}
                            </h3>
                        </div>

                        <p className="text-gray-600 dark:text-gray-300 mb-6">
                            {confirmationModal.message}
                        </p>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setConfirmationModal(prev => ({ ...prev, isOpen: false }))}
                                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Iptal
                            </button>
                            <button
                                onClick={confirmationModal.onConfirm}
                                className={`px-4 py-2 text-white rounded-lg transition-colors ${confirmationModal.type === 'danger' ? 'bg-red-600 hover:bg-red-700' :
                                    confirmationModal.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600' :
                                        'bg-blue-600 hover:bg-blue-700'
                                    }`}
                            >
                                Onayla
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
