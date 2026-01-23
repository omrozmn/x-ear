import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
    Shield,
    Plus,
    Pencil,
    Trash2,
    Users,
    ChevronRight,
    AlertTriangle,
    Loader2,
    Search,
    Check,
    X as XIcon,
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import toast from 'react-hot-toast';

import {
    useListAdminRoles,
    useListAdminPermissions,
    useCreateAdminRoles,
    useUpdateAdminRole,
    useDeleteAdminRole,
    useUpdateAdminRolePermissions,
    getListAdminRolesQueryKey
} from '@/api/generated/admin-roles/admin-roles';
import { RoleRead } from '@/api/generated/schemas/roleRead';
import { SchemasRolesPermissionRead as AdminPermission } from '@/api/generated/schemas/schemasRolesPermissionRead';
import { useHasPermission, useIsSuperAdmin, PermissionGate } from '@/hooks/useAdminPermission';
import { AdminPermissions } from '@/types';

// Permission category display names
const CATEGORY_NAMES: Record<string, string> = {
    tenants: 'Tenant Yönetimi',
    users: 'Kullanıcı Yönetimi',
    roles: 'Rol Yönetimi',
    billing: 'Fatura & Ödeme',
    settings: 'Ayarlar',
    integrations: 'Entegrasyonlar',
    logs: 'Loglar',
    system: 'Sistem',
    special: 'Özel İzinler',
};

const Roles: React.FC = () => {
    const queryClient = useQueryClient();
    const canManageRoles = useHasPermission(AdminPermissions.ROLES_MANAGE);
    const isSuperAdmin = useIsSuperAdmin();

    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<RoleRead | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        permissions: [] as string[],
    });

    // Fetch roles
    const { data: rolesResponse, isLoading: rolesLoading } = useListAdminRoles({
        include_permissions: true
    });

    // Fetch all permissions
    const { data: permissionsResponse } = useListAdminPermissions();

    // Create role mutation
    const createRoleMutation = useCreateAdminRoles({
        mutation: {
            onSuccess: () => {
                toast.success('Rol başarıyla oluşturuldu');
                queryClient.invalidateQueries({ queryKey: getListAdminRolesQueryKey() });
                setIsCreateModalOpen(false);
                resetForm();
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.error?.message || 'Rol oluşturulurken hata oluştu');
            },
        }
    });

    // Update role mutation
    const updateRoleMutation = useUpdateAdminRole({
        mutation: {
            onSuccess: () => {
                toast.success('Rol başarıyla güncellendi');
                queryClient.invalidateQueries({ queryKey: getListAdminRolesQueryKey() });
                setIsEditModalOpen(false);
                setSelectedRole(null);
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.error?.message || 'Rol güncellenirken hata oluştu');
            },
        }
    });

    // Update role permissions mutation
    const updatePermissionsMutation = useUpdateAdminRolePermissions({
        mutation: {
            onSuccess: () => {
                toast.success('İzinler başarıyla güncellendi');
                queryClient.invalidateQueries({ queryKey: getListAdminRolesQueryKey() });
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.error?.message || 'İzinler güncellenirken hata oluştu');
            },
        }
    });

    // Delete role mutation
    const deleteRoleMutation = useDeleteAdminRole({
        mutation: {
            onSuccess: () => {
                toast.success('Rol başarıyla silindi');
                queryClient.invalidateQueries({ queryKey: getListAdminRolesQueryKey() });
                setIsDeleteModalOpen(false);
                setSelectedRole(null);
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.error?.message || 'Rol silinirken hata oluştu');
            },
        }
    });

    const resetForm = () => {
        setFormData({ name: '', description: '', permissions: [] });
    };


    const handleCreateRole = (e: React.FormEvent) => {
        e.preventDefault();
        createRoleMutation.mutate({ data: formData });
    };

    const handleUpdateRole = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRole) return;
        updateRoleMutation.mutate({
            roleId: selectedRole.id,
            data: { name: formData.name, description: formData.description },
        });
    };

    const handleTogglePermission = (roleId: string, permissionCode: string, currentPermissions: string[]) => {
        const newPermissions = currentPermissions.includes(permissionCode)
            ? currentPermissions.filter(p => p !== permissionCode)
            : [...currentPermissions, permissionCode];

        updatePermissionsMutation.mutate({ roleId: roleId, data: { permissions: newPermissions } });
    };


    const openEditModal = (role: RoleRead) => {
        setSelectedRole(role);
        setFormData({
            name: role.name,
            description: role.description || '',
            permissions: role.permissions?.map(p => p.name) || [],
        });
        setIsEditModalOpen(true);
    };

    const openDeleteModal = (role: RoleRead) => {
        setSelectedRole(role);
        setIsDeleteModalOpen(true);
    };

    const roles = rolesResponse?.data?.roles || [];
    const permissionGroups = permissionsResponse?.data?.data || []; // Array of PermissionGroup

    // Filter roles by search
    const filteredRoles = roles.filter(role =>
        role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (rolesLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Rol Yönetimi
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Admin panel kullanıcı rollerini ve izinlerini yönetin
                    </p>
                </div>

                <PermissionGate permission={AdminPermissions.ROLES_MANAGE}>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Yeni Rol
                    </button>
                </PermissionGate>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                    type="text"
                    placeholder="Rol ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                />
            </div>

            {/* Roles Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredRoles.map(role => (
                    <div
                        key={role.id}
                        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${role.isSystem ? 'bg-purple-100 dark:bg-purple-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                                    <Shield className={`h-5 w-5 ${role.isSystem ? 'text-purple-600 dark:text-purple-400' : 'text-blue-600 dark:text-blue-400'}`} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                        {role.name}
                                        {role.isSystem && (
                                            <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-full">
                                                Sistem
                                            </span>
                                        )}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {role.description || 'Açıklama yok'}
                                    </p>
                                </div>
                            </div>

                            <PermissionGate permission={AdminPermissions.ROLES_MANAGE}>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => openEditModal(role)}
                                        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                        title="Düzenle"
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </button>
                                    {!role.isSystem && (
                                        <button
                                            onClick={() => openDeleteModal(role)}
                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Sil"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </PermissionGate>
                        </div>

                        {/* Permissions count */}
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                            <Users className="h-4 w-4" />
                            <span>{role.permissions?.length || 0} izin</span>
                        </div>

                        {/* Permission badges - show first 5 */}
                        <div className="mt-3 flex flex-wrap gap-1">
                            {role.permissions?.slice(0, 5).map(perm => (
                                <span
                                    key={perm.id}
                                    className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full"
                                    title={perm.description as string}
                                >
                                    {perm.name.split('.').slice(-1)[0]}
                                </span>
                            ))}
                            {(role.permissions?.length || 0) > 5 && (
                                <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 rounded-full">
                                    +{role.permissions!.length - 5}
                                </span>
                            )}
                        </div>
                    </div>
                ))
                }
            </div >

            {
                filteredRoles.length === 0 && (
                    <div className="text-center py-12">
                        <Shield className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <p className="text-gray-500 dark:text-gray-400">
                            {searchTerm ? 'Arama sonucu bulunamadı' : 'Henüz rol tanımlanmamış'}
                        </p>
                    </div>
                )
            }

            {/* Create Role Modal */}
            <Dialog.Root open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Yeni Rol Oluştur
                        </Dialog.Title>

                        <form onSubmit={handleCreateRole} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Rol Adı *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Açıklama
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                                />
                            </div>

                            {/* Permissions Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    İzinler
                                </label>
                                <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-3 space-y-3">
                                    {permissionGroups.map((group) => (
                                        <div key={group.category}>
                                            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                                                {group.label}
                                            </h4>
                                            <div className="space-y-1">
                                                {group.permissions.map(perm => (
                                                    <label
                                                        key={perm.id}
                                                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 p-1 rounded"
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.permissions.includes(perm.name)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        permissions: [...prev.permissions, perm.name]
                                                                    }));
                                                                } else {
                                                                    setFormData(prev => ({
                                                                        ...prev,
                                                                        permissions: prev.permissions.filter(p => p !== perm.name)
                                                                    }));
                                                                }
                                                            }}
                                                            className="rounded border-gray-300 text-primary focus:ring-primary"
                                                        />
                                                        <span className="text-sm text-gray-700 dark:text-gray-300">{(perm as any).label || perm.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsCreateModalOpen(false);
                                        resetForm();
                                    }}
                                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={createRoleMutation.isPending}
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {createRoleMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Oluştur
                                </button>
                            </div>
                        </form>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Edit Role Modal */}
            <Dialog.Root open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Rol Düzenle: {selectedRole?.name}
                        </Dialog.Title>

                        <form onSubmit={handleUpdateRole} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Rol Adı *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        disabled={selectedRole?.isSystem}
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                                        required
                                    />
                                    {selectedRole?.isSystem && (
                                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                            Sistem rollerinin adı değiştirilemez
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Açıklama
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.description}
                                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={updateRoleMutation.isPending}
                                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {updateRoleMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Kaydet
                                </button>
                            </div>
                        </form>

                        {/* Permission Matrix */}
                        {isSuperAdmin && selectedRole?.name !== 'SuperAdmin' && (
                            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <Shield className="h-5 w-5" />
                                    İzin Matrisi
                                </h3>

                                <div className="space-y-4">
                                    {permissionGroups.map((group) => (
                                        <div key={group.category} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                                {group.label}
                                            </h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                {group.permissions.map(perm => {
                                                    const currentPerms = selectedRole?.permissions?.map(p => p.name) || [];
                                                    const isActive = currentPerms.includes(perm.name);

                                                    return (
                                                        <button
                                                            key={perm.id}
                                                            onClick={() => handleTogglePermission(selectedRole!.id, perm.name, currentPerms)}
                                                            disabled={updatePermissionsMutation.isPending}
                                                            className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${isActive
                                                                ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700 text-green-700 dark:text-green-400'
                                                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                                                                }`}
                                                        >
                                                            <span className="text-sm truncate">{(perm as any).label || perm.name}</span>
                                                            {isActive ? (
                                                                <Check className="h-4 w-4 flex-shrink-0" />
                                                            ) : (
                                                                <XIcon className="h-4 w-4 flex-shrink-0" />
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedRole?.name === 'SuperAdmin' && (
                            <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                                    <AlertTriangle className="h-5 w-5" />
                                    <span className="font-medium">SuperAdmin rolünün izinleri değiştirilemez</span>
                                </div>
                                <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
                                    Bu rol tüm sistem izinlerine otomatik olarak sahiptir.
                                </p>
                            </div>
                        )}
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Delete Confirmation Modal */}
            <Dialog.Root open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50" />
                    <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
                        <div className="flex items-center gap-3 text-red-600 dark:text-red-400 mb-4">
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                <AlertTriangle className="h-6 w-6" />
                            </div>
                            <Dialog.Title className="text-lg font-semibold">
                                Rolü Sil
                            </Dialog.Title>
                        </div>

                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            <span className="font-semibold text-gray-900 dark:text-white">{selectedRole?.name}</span> rolünü silmek istediğinize emin misiniz?
                            Bu işlem geri alınamaz.
                        </p>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                İptal
                            </button>
                            <button
                                onClick={() => selectedRole && deleteRoleMutation.mutate({ roleId: selectedRole.id })}
                                disabled={deleteRoleMutation.isPending}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {deleteRoleMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                Sil
                            </button>
                        </div>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </div >
    );
};

export default Roles;
