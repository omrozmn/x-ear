import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Shield, Lock, Save, X, AlertCircle, CheckCircle2, Search } from 'lucide-react';
import {
    useListRoles,
    useCreateRoles,
    useUpdateRole,
    useDeleteRole
} from '../../api/generated/roles/roles';
import { RoutersRolesRoleCreate as RoleCreate } from '../../api/generated/schemas';
import { unwrapArray, unwrapObject } from '../../utils/response-unwrap';

interface Role {
    id: string;
    name: string;
    description?: string;
    is_system?: boolean;
    permissions?: (string | { name: string })[];
    createdAt?: string;
}

// Manual hooks replaced by Orval generated hooks

export default function RolesSettings() {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Create Role Form State
    const [roleData, setRoleData] = useState({
        name: '',
        description: ''
    });
    const [createSuccess, setCreateSuccess] = useState('');
    const [createError, setCreateError] = useState('');

    // React Query hooks (Orval)
    const { data: rolesResponse, isLoading: loading, error: fetchError, refetch } = useListRoles();
    const createRoleMutation = useCreateRoles();
    const updateRoleMutation = useUpdateRole();
    const deleteRoleMutation = useDeleteRole();

    // Extract roles from response
    const roles = unwrapArray<Role>(rolesResponse);
    const error = fetchError ? 'Roller yüklenemedi' : null;

    const handleCreateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError('');
        setCreateSuccess('');

        try {
            await createRoleMutation.mutateAsync({ data: roleData });
            setCreateSuccess('Rol başarıyla oluşturuldu!');
            setRoleData({ name: '', description: '' });
            refetch();
            setTimeout(() => {
                setIsCreateModalOpen(false);
                setCreateSuccess('');
            }, 2000);
        } catch (err: any) {
            setCreateError(err.response?.data?.error || 'Rol oluşturulamadı.');
        }
    };

    const handleEditRole = (role: Role) => {
        setSelectedRole(role);
        setRoleData({
            name: role.name,
            description: role.description || ''
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateRole = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRole) return;

        setCreateError('');

        try {
            await updateRoleMutation.mutateAsync({
                roleId: selectedRole.id,
                data: roleData
            });
            await refetch();
            setIsEditModalOpen(false);
            setSelectedRole(null);
            setRoleData({ name: '', description: '' });
        } catch (err: any) {
            setCreateError(err.response?.data?.error || 'Rol güncellenemedi.');
        }
    };

    const handleDeleteRole = async (roleId: string) => {
        if (!window.confirm('Bu rolü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) return;

        try {
            await deleteRoleMutation.mutateAsync({ roleId });
            await refetch();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Rol silinemedi.');
        }
    };

    const filteredRoles = roles.filter(role =>
        role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        role.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Predefined permissions for selection
    const availablePermissions = [
        { category: 'Hastalar', permissions: ['parties:read', 'parties:create', 'parties:update', 'parties:delete'] },
        { category: 'Satışlar', permissions: ['sales:read', 'sales:create', 'sales:update', 'sales:delete'] },
        { category: 'Envanter', permissions: ['inventory:read', 'inventory:create', 'inventory:update', 'inventory:delete'] },
        { category: 'Faturalar', permissions: ['invoices:read', 'invoices:create', 'invoices:update', 'invoices:delete'] },
        { category: 'Raporlar', permissions: ['reports:read', 'reports:export'] },
        { category: 'Ayarlar', permissions: ['settings:read', 'settings:update'] },
        { category: 'Kullanıcılar', permissions: ['users:read', 'users:create', 'users:update', 'users:delete'] },
    ];

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rol Yönetimi</h1>
                    <p className="text-gray-500 dark:text-gray-400">Rolleri ve yetkilerini yönetin</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Yeni Rol Oluştur
                </button>
            </div>

            {/* Search Bar */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Rol ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                    />
                </div>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" />
                    <div>
                        <div className="font-medium">Roller yüklenirken bir hata oluştu.</div>
                        {error && typeof error === 'string' && (
                            <div className="text-sm mt-1">{error}</div>
                        )}
                    </div>
                </div>
            )}

            {/* Roles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        Yükleniyor...
                    </div>
                ) : filteredRoles.length === 0 ? (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        {searchTerm ? 'Arama kriterine uygun rol bulunamadı.' : 'Henüz rol eklenmemiş.'}
                    </div>
                ) : (
                    filteredRoles.map((role) => (
                        <div
                            key={role.id}
                            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center">
                                    <div className="w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mr-3">
                                        <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 dark:text-white">{role.name}</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {role.permissions?.length || 0} yetki
                                        </p>
                                    </div>
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => handleEditRole(role)}
                                        className="text-gray-400 hover:text-indigo-600 transition-colors"
                                        title="Düzenle"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteRole(role.id)}
                                        className="text-gray-400 hover:text-red-600 transition-colors"
                                        title="Sil"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {role.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                                    {role.description}
                                </p>
                            )}

                            {role.permissions && role.permissions.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                    {role.permissions.slice(0, 3).map((perm, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                                        >
                                            <Lock className="w-3 h-3 mr-1" />
                                            {typeof perm === 'string' ? perm : perm.name}
                                        </span>
                                    ))}
                                    {role.permissions.length > 3 && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                            +{role.permissions.length - 3} daha
                                        </span>
                                    )}
                                </div>
                            )}

                            {role.createdAt && (
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
                                    Oluşturulma: {new Date(role.createdAt).toLocaleDateString('tr-TR')}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Create Role Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Yeni Rol Oluştur</h2>

                        {createSuccess ? (
                            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center text-green-700">
                                    <CheckCircle2 className="w-5 h-5 mr-2" />
                                    {createSuccess}
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleCreateRole} className="space-y-6">
                                <div>
                                    <label htmlFor="role-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Rol Adı *
                                    </label>
                                    <input
                                        id="role-name"
                                        type="text"
                                        required
                                        value={roleData.name}
                                        onChange={(e) => setRoleData({ ...roleData, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Örn: Satış Müdürü"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="role-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Açıklama
                                    </label>
                                    <textarea
                                        id="role-description"
                                        value={roleData.description}
                                        onChange={(e) => setRoleData({ ...roleData, description: e.target.value })}
                                        rows={3}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                        placeholder="Bu rolün görevleri ve sorumlulukları..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                                        Yetkiler
                                    </label>
                                    <div className="space-y-4 max-h-64 overflow-y-auto">
                                        {availablePermissions.map((category) => (
                                            <div key={category.category} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                                                    {category.category}
                                                </h4>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {category.permissions.map((perm) => (
                                                        <label key={perm} className="flex items-center space-x-2 text-sm">
                                                            <input
                                                                type="checkbox"
                                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                                            />
                                                            <span className="text-gray-700 dark:text-gray-300">
                                                                {perm.split(':')[1]}
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {createError && (
                                    <div className="text-sm text-red-600 flex items-center">
                                        <AlertCircle className="w-4 h-4 mr-1" />
                                        {createError}
                                    </div>
                                )}

                                <div className="flex space-x-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateModalOpen(false)}
                                        className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                    >
                                        İptal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createRoleMutation.isPending}
                                        className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center"
                                    >
                                        {createRoleMutation.isPending ? (
                                            'Oluşturuluyor...'
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4 mr-2" />
                                                Oluştur
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}

            {/* Edit Role Modal */}
            {isEditModalOpen && selectedRole && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                                Rol Düzenle: {selectedRole.name}
                            </h2>
                            <button
                                onClick={() => {
                                    setIsEditModalOpen(false);
                                    setCreateError('');
                                    setRoleData({ name: '', description: '' });
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateRole} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Rol Adı *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={roleData.name}
                                    onChange={(e) => setRoleData({ ...roleData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Açıklama
                                </label>
                                <textarea
                                    value={roleData.description}
                                    onChange={(e) => setRoleData({ ...roleData, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            {createError && (
                                <div className="text-sm text-red-600 flex items-center">
                                    <AlertCircle className="w-4 h-4 mr-1" />
                                    {createError}
                                </div>
                            )}

                            <div className="flex space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsEditModalOpen(false);
                                        setCreateError('');
                                        setRoleData({ name: '', description: '' });
                                    }}
                                    className="flex-1 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    İptal
                                </button>
                                <button
                                    type="submit"
                                    disabled={updateRoleMutation.isPending}
                                    className="flex-1 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                                >
                                    {updateRoleMutation.isPending ? 'Güncelleniyor...' : 'Güncelle'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
