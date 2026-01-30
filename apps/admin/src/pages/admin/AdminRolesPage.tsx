import React, { useState } from 'react';
import {
    useListAdminRoles,
    useCreateAdminRoles,
    useUpdateAdminRole,
    useDeleteAdminRole,
    useListPermissions,
    useUpdateRolePermissions
} from '@/lib/api-client';
import {
    Shield,
    PlusIcon,
    TrashIcon,
    EditIcon,
    CheckIcon,
    LockIcon
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminRolesPage: React.FC = () => {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<any>(null);

    // Form state
    const [roleName, setRoleName] = useState('');
    const [roleDescription, setRoleDescription] = useState('');
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

    const { data: rolesData, isLoading, refetch } = useListAdminRoles({ include_permissions: true });
    const { data: permissionsData } = useListPermissions({});

    const createRoleMutation = useCreateAdminRoles();
    const updateRoleMutation = useUpdateAdminRole();
    const deleteRoleMutation = useDeleteAdminRole();
    const updatePermissionsMutation = useUpdateRolePermissions();

    const roles = (rolesData as any)?.roles || (rolesData as any)?.data?.roles || [];
    const groupedPermissions = (permissionsData as any)?.grouped || (permissionsData as any)?.data?.grouped || {};
    const categories = (permissionsData as any)?.categories || (permissionsData as any)?.data?.categories || [];

    const handleCreate = async () => {
        if (!roleName) {
            toast.error('Rol adı zorunludur');
            return;
        }

        try {
            await createRoleMutation.mutateAsync({
                data: {
                    name: roleName,
                    description: roleDescription
                    // Note: permissions are handled separately via updateRolePermissions
                } as any
            });
            toast.success('Rol oluşturuldu');
            setIsCreateModalOpen(false);
            setRoleName('');
            setRoleDescription('');
            refetch();
        } catch (error) {
            toast.error('Rol oluşturulamadı');
        }
    };

    const handleDelete = async (roleId: string) => {
        if (!confirm('Bu rolü silmek istediğinize emin misiniz?')) return;

        try {
            await deleteRoleMutation.mutateAsync({ roleId: roleId });
            toast.success('Rol silindi');
            refetch();
        } catch (error: any) {
            toast.error(error?.response?.data?.error?.message || 'Silme işlemi başarısız');
        }
    };

    const openPermissionModal = (role: any) => {
        setSelectedRole(role);
        setSelectedPermissions(role.permissions?.map((p: any) => p.code) || []);
        setIsPermissionModalOpen(true);
    };

    const handleSavePermissions = async () => {
        if (!selectedRole) return;

        try {
            await updatePermissionsMutation.mutateAsync({
                roleId: selectedRole.id,
                data: selectedPermissions
            });
            toast.success('İzinler güncellendi');
            setIsPermissionModalOpen(false);
            refetch();
        } catch (error: any) {
            toast.error(error?.response?.data?.error?.message || 'Güncelleme başarısız');
        }
    };

    const togglePermission = (code: string) => {
        if (selectedPermissions.includes(code)) {
            setSelectedPermissions(prev => prev.filter(p => p !== code));
        } else {
            setSelectedPermissions(prev => [...prev, code]);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Rol ve Yetki Yönetimi</h1>
                    <p className="text-gray-500">Admin paneli kullanıcı rolleri ve erişim izinleri</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
                >
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Yeni Rol
                </button>
            </div>

            {/* Roles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    <div className="col-span-3 text-center py-12">Yükleniyor...</div>
                ) : roles.map((role: any) => (
                    <div key={role.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col h-full">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-lg ${role.isSystemRole ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                    <Shield className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">{role.name}</h3>
                                    {role.isSystemRole && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                            Sistem Rolü
                                        </span>
                                    )}
                                </div>
                            </div>
                            {!role.isSystemRole && (
                                <button
                                    onClick={() => handleDelete(role.id)}
                                    className="text-gray-400 hover:text-red-600"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        <p className="text-sm text-gray-500 mb-6 flex-grow">
                            {role.description || 'Açıklama yok'}
                        </p>

                        <div className="border-t pt-4 mt-auto">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm font-medium text-gray-700">
                                    {role.permissions?.length || 0} İzin Tanımlı
                                </span>
                            </div>

                            <button
                                onClick={() => openPermissionModal(role)}
                                className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                            >
                                <LockIcon className="w-4 h-4 mr-2" />
                                İzinleri Düzenle
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-md w-full p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Yeni Rol Oluştur</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Rol Adı</label>
                                <input
                                    type="text"
                                    value={roleName}
                                    onChange={(e) => setRoleName(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                    placeholder="Örn: Editor"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Açıklama</label>
                                <textarea
                                    value={roleDescription}
                                    onChange={(e) => setRoleDescription(e.target.value)}
                                    rows={3}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                />
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={createRoleMutation.isPending}
                                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                                >
                                    {createRoleMutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Permission Modal */}
            {isPermissionModalOpen && selectedRole && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg max-w-4xl w-full p-6 max-h-[90vh] flex flex-col">
                        <div className="mb-4">
                            <h3 className="text-lg font-medium text-gray-900">
                                İzinleri Düzenle: {selectedRole.name}
                            </h3>
                            <p className="text-sm text-gray-500">
                                Bu rolün erişebileceği alanları seçin.
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {categories.map((category: string) => (
                                    <div key={category} className="bg-gray-50 rounded-lg p-4">
                                        <h4 className="font-medium text-gray-900 mb-3 capitalize border-b pb-2">
                                            {category}
                                        </h4>
                                        <div className="space-y-2">
                                            {groupedPermissions[category]?.map((perm: any) => (
                                                <label key={perm.id} className="flex items-start">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedPermissions.includes(perm.code)}
                                                        onChange={() => togglePermission(perm.code)}
                                                        disabled={selectedRole.name === 'SuperAdmin'} // SuperAdmin permissions locked
                                                        className="mt-1 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                                    />
                                                    <div className="ml-2">
                                                        <span className="text-sm font-medium text-gray-700 block">
                                                            {perm.name}
                                                        </span>
                                                        <span className="text-xs text-gray-500 block">
                                                            {perm.description}
                                                        </span>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                            <button
                                onClick={() => setIsPermissionModalOpen(false)}
                                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleSavePermissions}
                                disabled={updatePermissionsMutation.isPending || selectedRole.name === 'SuperAdmin'}
                                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
                            >
                                {updatePermissionsMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminRolesPage;
