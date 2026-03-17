import React, { useState } from 'react';
import {
    useListAdminRoles,
    useCreateAdminRoles,
    useDeleteAdminRole,
    useListPermissions,
    useUpdateRolePermissions,
    type PermissionGroup,
    type PermissionRead,
    type ResponseEnvelopePermissionListResponse,
    type ResponseEnvelopeRoleListResponse,
    type RoleRead,
    type SchemasRolesRoleCreate,
} from '@/lib/api-client';
import {
    Shield,
    PlusIcon,
    TrashIcon,
    LockIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PermissionGate } from '@/hooks/PermissionGate';
import { AdminPermissions } from '@/types';
import { ResponsiveTable } from '@/components/responsive/ResponsiveTable';
import { extractPagination, unwrapData } from '@/lib/orval-response';
import Pagination from '@/components/ui/Pagination';

function getRoles(data: ResponseEnvelopeRoleListResponse | undefined): RoleRead[] {
    const payload = unwrapData<{ roles?: RoleRead[]; items?: RoleRead[]; data?: { roles?: RoleRead[] } } | RoleRead[]>(data);
    if (Array.isArray(payload)) {
        return payload;
    }

    if (!payload) {
        return [];
    }

    if (Array.isArray(payload.roles)) {
        return payload.roles;
    }

    if (Array.isArray(payload.items)) {
        return payload.items;
    }

    return payload.data && Array.isArray(payload.data.roles) ? payload.data.roles : [];
}

function getPermissionGroups(data: ResponseEnvelopePermissionListResponse | undefined): PermissionGroup[] {
    const payload = unwrapData<{ data?: PermissionGroup[]; items?: PermissionGroup[] } | PermissionGroup[]>(data);
    if (Array.isArray(payload)) {
        return payload;
    }

    if (!payload) {
        return [];
    }

    if (Array.isArray(payload.data)) {
        return payload.data;
    }

    return Array.isArray(payload.items) ? payload.items : [];
}

function getPermissionKey(permission: PermissionRead): string {
    return permission.name;
}

const AdminRolesPage: React.FC = () => {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState('');
    const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
    const [selectedRole, setSelectedRole] = useState<RoleRead | null>(null);

    // Form state
    const [roleName, setRoleName] = useState('');
    const [roleDescription, setRoleDescription] = useState('');
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

    const { data: rolesData, isLoading, refetch } = useListAdminRoles({ include_permissions: true });
    const { data: permissionsData } = useListPermissions({});

    const createRoleMutation = useCreateAdminRoles();
    const deleteRoleMutation = useDeleteAdminRole();
    const updatePermissionsMutation = useUpdateRolePermissions();

    const roles = getRoles(rolesData);
    const permissionGroups = getPermissionGroups(permissionsData);
    const pagination = extractPagination(rolesData);
    const filteredRoles = roles.filter((role) => {
        const query = search.trim().toLowerCase();
        if (!query) {
            return true;
        }

        return [role.name, role.description || '']
            .some((value) => value.toLowerCase().includes(query));
    });
    const paginatedRoles = filteredRoles.slice((page - 1) * limit, page * limit);

    const handleCreate = async () => {
        if (!roleName) {
            toast.error('Rol adı zorunludur');
            return;
        }

        try {
            const payload: SchemasRolesRoleCreate = {
                name: roleName,
                description: roleDescription,
            };

            await createRoleMutation.mutateAsync({
                data: payload
            });
            toast.success('Rol oluşturuldu');
            setIsCreateModalOpen(false);
            setRoleName('');
            setRoleDescription('');
            refetch();
        } catch {
            toast.error('Rol oluşturulamadı');
        }
    };

    const handleDelete = async (roleId: string) => {
        if (!window.confirm('Bu rolü silmek istediğinize emin misiniz?')) return;

        try {
            await deleteRoleMutation.mutateAsync({ roleId: roleId });
            toast.success('Rol silindi');
            setSelectedRoleIds((prev) => prev.filter((id) => id !== roleId));
            refetch();
        } catch {
            toast.error('Silme işlemi başarısız');
        }
    };

    const handleBulkDelete = async () => {
        const deletableRoleIds = selectedRoleIds.filter((roleId) => {
            const role = roles.find((item) => item.id === roleId);
            return role && !role.isSystem;
        });

        if (deletableRoleIds.length === 0) {
            toast.error('Secili silinebilir rol yok');
            return;
        }

        if (!window.confirm(`${deletableRoleIds.length} rol silinsin mi?`)) {
            return;
        }

        try {
            await Promise.all(deletableRoleIds.map((roleId) => deleteRoleMutation.mutateAsync({ roleId })));
            toast.success(`${deletableRoleIds.length} rol silindi`);
            setSelectedRoleIds([]);
            refetch();
        } catch {
            toast.error('Toplu silme işlemi başarısız');
        }
    };

    const openPermissionModal = (role: RoleRead) => {
        setSelectedRole(role);
        setSelectedPermissions(role.permissions?.map(getPermissionKey) || []);
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
        } catch {
            toast.error('Güncelleme başarısız');
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
                <PermissionGate permission={AdminPermissions.ROLES_MANAGE}>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-primary-600 hover:bg-primary-700"
                    >
                        <PlusIcon className="h-5 w-5 mr-2" />
                        Yeni Rol
                    </button>
                </PermissionGate>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="border-b border-gray-200 px-4 py-3">
                    <input
                        type="text"
                        value={search}
                        onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(1);
                        }}
                        placeholder="Rol adı veya açıklama ara..."
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    />
                </div>
                {isLoading ? (
                    <div className="text-center py-12">Yükleniyor...</div>
                ) : (
                    <>
                        <ResponsiveTable
                            data={paginatedRoles}
                            keyExtractor={(role) => role.id}
                            emptyMessage="Rol bulunamadı"
                            selectable
                            selectedKeys={selectedRoleIds}
                            onSelectionChange={setSelectedRoleIds}
                            selectionLabel="rol secildi"
                            bulkActions={(
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRoleIds(paginatedRoles.map((role) => role.id))}
                                        className="rounded-xl border border-primary-200 bg-white px-3 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-100"
                                    >
                                        Tumunu sec
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedRoleIds([])}
                                        className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                                    >
                                        Secimi temizle
                                    </button>
                                    <PermissionGate permission={AdminPermissions.ROLES_MANAGE}>
                                        <button
                                            type="button"
                                            onClick={handleBulkDelete}
                                            className="rounded-xl bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                                        >
                                            Secilenleri sil
                                        </button>
                                    </PermissionGate>
                                </>
                            )}
                            columns={[
                                {
                                    key: 'name',
                                    header: 'Rol',
                                    sortable: true,
                                    sortKey: 'name',
                                    sortValue: (role: RoleRead) => role.name,
                                    render: (role: RoleRead) => (
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-2xl ${role.isSystem ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                                <Shield className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900 dark:text-white">{role.name}</div>
                                                {role.isSystem && <span className="text-xs text-gray-500">Sistem Rolü</span>}
                                            </div>
                                        </div>
                                    )
                                },
                                {
                                    key: 'subscriber',
                                    header: 'Abone',
                                    sortable: true,
                                    sortKey: 'subscriber',
                                    sortValue: () => 'Global',
                                    render: () => (
                                        <span className="text-sm font-medium text-gray-700">Global</span>
                                    )
                                },
                                {
                                    key: 'description',
                                    header: 'Açıklama',
                                    sortable: true,
                                    sortKey: 'description',
                                    sortValue: (role: RoleRead) => role.description || '',
                                    render: (role: RoleRead) => (
                                        <span className="text-sm text-gray-500 dark:text-gray-400">{role.description || 'Açıklama yok'}</span>
                                    )
                                },
                                {
                                    key: 'permissions',
                                    header: 'İzin Sayısı',
                                    sortable: true,
                                    sortKey: 'permissions',
                                    sortValue: (role: RoleRead) => role.permissions?.length || 0,
                                    render: (role: RoleRead) => (
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{role.permissions?.length || 0}</span>
                                    )
                                },
                                {
                                    key: 'actions',
                                    header: 'İşlemler',
                                    render: (role: RoleRead) => (
                                        <div className="flex items-center justify-end gap-2">
                                            <PermissionGate permission={AdminPermissions.ROLES_MANAGE}>
                                                <button
                                                    onClick={() => openPermissionModal(role)}
                                                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-xl text-sm text-gray-700 hover:bg-gray-50"
                                                >
                                                    <LockIcon className="w-4 h-4 mr-2" />
                                                    İzinler
                                                </button>
                                                {!role.isSystem && (
                                                    <button
                                                        onClick={() => handleDelete(role.id)}
                                                        className="text-gray-400 hover:text-red-600"
                                                    >
                                                        <TrashIcon className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </PermissionGate>
                                        </div>
                                    )
                                }
                            ]}
                        />
                        <div className="border-t border-gray-200 px-4 py-3">
                            <Pagination
                                currentPage={page}
                                totalPages={pagination?.totalPages ?? Math.max(1, Math.ceil(filteredRoles.length / limit))}
                                totalItems={filteredRoles.length}
                                itemsPerPage={limit}
                                onPageChange={setPage}
                                onItemsPerPageChange={(nextLimit) => {
                                    setLimit(nextLimit);
                                    setPage(1);
                                }}
                            />
                        </div>
                    </>
                )}
            </div>

            {/* Create Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Yeni Rol Oluştur</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Rol Adı</label>
                                <input
                                    type="text"
                                    value={roleName}
                                    onChange={(e) => setRoleName(e.target.value)}
                                    className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                    placeholder="Örn: Editor"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Açıklama</label>
                                <textarea
                                    value={roleDescription}
                                    onChange={(e) => setRoleDescription(e.target.value)}
                                    rows={3}
                                    className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                />
                            </div>
                            <div className="flex justify-end space-x-3 mt-6">
                                <button
                                    onClick={() => setIsCreateModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                                >
                                    İptal
                                </button>
                                <button
                                    onClick={handleCreate}
                                    disabled={createRoleMutation.isPending}
                                    className="px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
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
                    <div className="bg-white rounded-2xl max-w-4xl w-full p-6 max-h-[90vh] flex flex-col">
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
                                {permissionGroups.map((group) => (
                                    <div key={group.category} className="bg-gray-50 rounded-2xl p-4">
                                        <h4 className="font-medium text-gray-900 mb-3 capitalize border-b pb-2">
                                            {group.label}
                                        </h4>
                                        <div className="space-y-2">
                                            {group.permissions.map((perm: PermissionRead) => (
                                                <label key={perm.id} className="flex items-start">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedPermissions.includes(getPermissionKey(perm))}
                                                        onChange={() => togglePermission(getPermissionKey(perm))}
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
                                className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                                İptal
                            </button>
                            <button
                                onClick={handleSavePermissions}
                                disabled={updatePermissionsMutation.isPending || selectedRole.name === 'SuperAdmin'}
                                className="px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
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
