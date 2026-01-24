import React, { useState, useMemo } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { customInstance } from '@/api/orval-mutator';
import { Shield, Check, Save, Loader2, AlertCircle, Users, ShoppingCart, DollarSign, FileText, Headphones, Package, Megaphone, Settings, BarChart, LayoutDashboard, Calendar, ClipboardList, Pencil, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  useGetPermissionRole,
  useUpdatePermissionRole,
  getGetPermissionRoleQueryKey,
  getListPermissionsQueryKey,
  useListRoles,
  useCreateRoles,
  useUpdateRole,
  getListRolesQueryKey,
} from '@/api/client/permissions.client';
import { RoleRead, ResponseEnvelopeListRoleRead } from '@/api/generated/schemas';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { Button, Input, Checkbox } from '@x-ear/ui-web';
import { AxiosError } from '@/api/orval-mutator';

// Permission categories with icons
const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  parties: { label: 'Hastalar', icon: <Users className="w-5 h-5" /> },
  sales: { label: 'Satışlar', icon: <ShoppingCart className="w-5 h-5" /> },
  finance: { label: 'Finans', icon: <DollarSign className="w-5 h-5" /> },
  invoices: { label: 'Faturalar', icon: <FileText className="w-5 h-5" /> },
  devices: { label: 'Cihazlar', icon: <Headphones className="w-5 h-5" /> },
  inventory: { label: 'Stok', icon: <Package className="w-5 h-5" /> },
  campaigns: { label: 'Kampanyalar', icon: <Megaphone className="w-5 h-5" /> },
  sgk: { label: 'SGK', icon: <Shield className="w-5 h-5" /> },
  settings: { label: 'Ayarlar', icon: <Settings className="w-5 h-5" /> },
  team: { label: 'Ekip Yönetimi', icon: <Users className="w-5 h-5" /> },
  reports: { label: 'Raporlar', icon: <BarChart className="w-5 h-5" /> },
  dashboard: { label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  // Newly added categories
  appointments: { label: 'Randevular', icon: <Calendar className="w-5 h-5" /> },
  activity_logs: { label: 'Aktivite Logları', icon: <ClipboardList className="w-5 h-5" /> },
};

// Role display names
const ROLE_LABELS: Record<string, string> = {
  admin: 'Yönetici',
  odyolog: 'Odyolog',
  odyometrist: 'Odyometrist',
  secretary: 'Sekreter',
  user: 'Kullanıcı',
  tenant_admin: 'Tenant Admin',
  sales_manager: 'Satış Yöneticisi',
  receptionist: 'Resepsiyonist',
  accountant: 'Muhasebeci',
  stock_manager: 'Stok Yöneticisi',
};

// System roles that cannot be deleted (but can be renamed)
const _SYSTEM_ROLES = ['tenant_admin'];

// Local Permission interface - matches actual API response shape
interface Permission {
  id: string;
  name: string;
  description: string | null;
}

interface PermissionGroup {
  category: string;
  label: string;
  icon: string;
  permissions: Permission[];
}

interface AllPermissionsResponse {
  success: boolean;
  data: PermissionGroup[];
  all: Permission[];
}

interface RolePermissionsResponse {
  success: boolean;
  data: {
    role: {
      id: string;
      name: string;
      description: string | null;
      isSystem: boolean;
    };
    permissions: string[];
  };
}

// RoleItem interface removed in favor of RoleRead

export function RolePermissionsTab() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [localPermissions, setLocalPermissions] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<string | null>(null);

  // Role edit/create modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleRead | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [editRoleName, setEditRoleName] = useState('');

  // Fetch roles from backend
  const { data: rolesResponse, isLoading: loadingRoles, refetch: refetchRoles } = useListRoles();

  // Extract roles list - handle wrapped response
  const rolesList = useMemo(() => {
    // customInstance returns response.data, which is ResponseEnvelope
    // So rolesResponse = { success: true, data: [...], meta: {...} }
    // rolesResponse.data = RoleRead[]
    console.log('[RolePermissionsTab] rolesResponse:', rolesResponse);

    // rolesResponse is UseQueryResult<ResponseEnvelopeListRoleRead | undefined> ?
    // Actually useListRoles returns UseQueryResult<ResponseEnvelopeListRoleRead> if successful.

    // With strict typing:
    let roles: RoleRead[] = [];

    // cast to unknown first if we really suspect types are loose, but prefer:
    const envelope = rolesResponse as unknown as ResponseEnvelopeListRoleRead | undefined;

    if (envelope?.data && Array.isArray(envelope.data)) {
      roles = envelope.data;
    }

    console.log('[RolePermissionsTab] Extracted roles:', roles);

    // Filter out tenant_admin from editable list (it has all permissions)
    return roles.filter(r => r.name !== 'tenant_admin');
  }, [rolesResponse]);

  // Set default selected role when roles load
  React.useEffect(() => {
    if (rolesList.length > 0 && !selectedRole) {
      setSelectedRole(rolesList[0].name);
    }
  }, [rolesList, selectedRole]);

  // Create role mutation
  const createRoleMutation = useCreateRoles({
    mutation: {
      onSuccess: () => {
        toast.success('Rol başarıyla oluşturuldu');
        queryClient.invalidateQueries({ queryKey: getListRolesQueryKey() });
        refetchRoles(); // Force refetch
        setCreateModalOpen(false);
        setNewRoleName('');
      },
      onError: (error: AxiosError<{ error?: { message?: string; code?: string } | string; message?: string; detail?: any }>) => {
        let errorMessage = 'Rol oluşturulurken bir hata oluştu';

        try {
          const errorData = error.response?.data?.error;
          const detail = error.response?.data?.detail;

          if (typeof errorData === 'object' && errorData?.message) {
            errorMessage = String(errorData.message);
          } else if (typeof errorData === 'string') {
            errorMessage = errorData;
          } else if (typeof detail === 'object' && detail?.message) {
            errorMessage = String(detail.message);
          } else if (typeof detail === 'string') {
            errorMessage = detail;
          } else if (error.response?.data?.message) {
            errorMessage = String(error.response.data.message);
          }
        } catch (e) {
          console.error('Error parsing error response:', e);
        }

        toast.error(errorMessage);
      },
    },
  });

  // Update role mutation
  const updateRoleMutation = useUpdateRole({
    mutation: {
      onSuccess: () => {
        toast.success('Rol adı başarıyla güncellendi');
        queryClient.invalidateQueries({ queryKey: getListRolesQueryKey() });
        // Update selected role if it was renamed
        if (editingRole && selectedRole === editingRole.name) {
          setSelectedRole(editRoleName);
        }
        setEditModalOpen(false);
        setEditingRole(null);
        setEditRoleName('');
      },
      onError: (error: AxiosError<{ error?: { message?: string; code?: string } | string; message?: string; detail?: any }>) => {
        let errorMessage = 'Rol güncellenirken bir hata oluştu';

        try {
          const errorData = error.response?.data?.error;
          const detail = error.response?.data?.detail;

          if (typeof errorData === 'object' && errorData?.message) {
            errorMessage = String(errorData.message);
          } else if (typeof errorData === 'string') {
            errorMessage = errorData;
          } else if (typeof detail === 'object' && detail?.message) {
            errorMessage = String(detail.message);
          } else if (typeof detail === 'string') {
            errorMessage = detail;
          } else if (error.response?.data?.message) {
            errorMessage = String(error.response.data.message);
          }
        } catch (e) {
          console.error('Error parsing error response:', e);
        }

        toast.error(errorMessage);
      },
    },
  });

  // Custom hook to fetch permissions from the correct endpoint (/api/permissions)
  // instead of the admin endpoint (/api/admin/permissions)
  const usePermissionsGetAllPermissions = () => {
    return useQuery({
      queryKey: ['/api/permissions'],
      queryFn: ({ signal }) => customInstance<AllPermissionsResponse>({
        url: '/api/permissions',
        method: 'GET',
        signal
      })
    });
  };

  // Fetch all permissions using correct hook
  const { data: allPermissionsResponse, isLoading: loadingPermissions } = usePermissionsGetAllPermissions();

  // Get role permissions using orval hook
  const { data: rolePermissionsResponse, isLoading: loadingRole } = useGetPermissionRole(
    selectedRole || '',
    {
      query: {
        queryKey: getGetPermissionRoleQueryKey(selectedRole || ''),
        enabled: !!selectedRole,
      },
    }
  );

  // Update role permissions mutation using orval hook
  const updateMutation = useUpdatePermissionRole({
    mutation: {
      onSuccess: () => {
        toast.success('İzinler başarıyla güncellendi');
        // Invalidate role permissions query
        queryClient.invalidateQueries({ queryKey: getGetPermissionRoleQueryKey(selectedRole || '') });
        queryClient.invalidateQueries({ queryKey: getListPermissionsQueryKey() });
        setHasChanges(false);
      },
      onError: (error: AxiosError<{ error?: { message?: string; code?: string } | string; message?: string; detail?: any }>) => {
        let errorMessage = 'İzinler güncellenirken bir hata oluştu';

        try {
          const errorData = error.response?.data?.error;
          const detail = error.response?.data?.detail;

          if (typeof errorData === 'object' && errorData?.message) {
            errorMessage = String(errorData.message);
          } else if (typeof errorData === 'string') {
            errorMessage = errorData;
          } else if (typeof detail === 'object' && detail?.message) {
            errorMessage = String(detail.message);
          } else if (typeof detail === 'string') {
            errorMessage = detail;
          } else if (error.response?.data?.message) {
            errorMessage = String(error.response.data.message);
          }
        } catch (e) {
          console.error('Error parsing error response:', e);
        }

        toast.error(errorMessage);
        console.error('Permission update error:', error);
      },
    },
  });

  // Extract data from responses
  const allPermissionsData = allPermissionsResponse?.data as AllPermissionsResponse | undefined;
  const rolePermissionsData = rolePermissionsResponse as RolePermissionsResponse | undefined;

  // Initialize local permissions when role data loads
  React.useEffect(() => {
    if (rolePermissionsData?.data?.permissions) {
      setLocalPermissions(new Set(rolePermissionsData.data.permissions));
      setHasChanges(false);
    }
  }, [rolePermissionsData]);

  // Group permissions by category
  const groupedPermissions = useMemo(() => {
    if (!allPermissionsData?.all) return [];

    const groups: Record<string, Permission[]> = {};

    allPermissionsData.all.forEach((perm: Permission) => {
      const category = perm.name.split('.')[0];
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(perm);
    });

    return Object.entries(groups).map(([category, permissions]) => ({
      category,
      label: CATEGORY_CONFIG[category]?.label || category,
      icon: CATEGORY_CONFIG[category]?.icon || <Shield className="w-5 h-5" />,
      permissions,
    }));
  }, [allPermissionsData]);

  const handlePermissionToggle = (permissionName: string) => {
    const newPermissions = new Set(localPermissions);
    if (newPermissions.has(permissionName)) {
      newPermissions.delete(permissionName);
    } else {
      newPermissions.add(permissionName);
    }
    setLocalPermissions(newPermissions);
    setHasChanges(true);
  };

  const handleCategoryToggle = (category: string, permissions: Permission[]) => {
    const newPermissions = new Set(localPermissions);
    const allSelected = permissions.every(p => localPermissions.has(p.name));

    if (allSelected) {
      permissions.forEach(p => newPermissions.delete(p.name));
    } else {
      permissions.forEach(p => newPermissions.add(p.name));
    }

    setLocalPermissions(newPermissions);
    setHasChanges(true);
  };

  const handleSave = () => {
    const permissionsArray = Array.from(localPermissions);
    console.log('Saving permissions for role:', selectedRole, 'permissions:', permissionsArray);

    updateMutation.mutate({
      roleName: selectedRole,
      data: { permissions: permissionsArray },
    });
  };

  const handleReset = () => {
    if (rolePermissionsData?.data?.permissions) {
      setLocalPermissions(new Set(rolePermissionsData.data.permissions));
      setHasChanges(false);
    }
  };

  // Role edit handlers
  const handleEditRole = (role: RoleRead, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingRole(role);
    setEditRoleName(role.name);
    setEditModalOpen(true);
  };

  const handleSaveEditRole = () => {
    if (!editingRole || !editRoleName.trim()) {
      toast.error('Rol adı boş olamaz');
      return;
    }
    updateRoleMutation.mutate({
      roleId: editingRole.id,
      data: { name: editRoleName.trim() },
    });
  };

  const handleCreateRole = () => {
    if (!newRoleName.trim()) {
      toast.error('Rol adı boş olamaz');
      return;
    }
    createRoleMutation.mutate({
      data: { name: newRoleName.trim() },
    });
  };

  const isLoading = loadingPermissions || loadingRole || loadingRoles;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Rol Izinleri</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Her rol icin izinleri yapilandirin</p>
        </div>
        {hasChanges && (
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={handleReset}
              className="px-4 py-2"
            >
              Sıfırla
            </Button>
            <Button
              onClick={handleSave}
              loading={updateMutation.isPending}
              icon={<Save className="w-5 h-5" />}
              className="px-4 py-2"
            >
              Kaydet
            </Button>
          </div>
        )}
      </div>

      {/* Role Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex justify-between items-center mb-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Rol Seçin</label>
          <Button
            onClick={() => {
              setNewRoleName('');
              setCreateModalOpen(true);
            }}
            variant="success"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
          >
            Yeni Rol Oluştur
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {rolesList.map(role => (
            <div key={role.id} className="flex items-center">
              <Button
                onClick={() => {
                  if (hasChanges) {
                    setPendingRole(role.name);
                    setConfirmDialogOpen(true);
                  } else {
                    setSelectedRole(role.name);
                  }
                }}
                className={`px-4 py-2.5 rounded-r-none font-medium transition-colors ${selectedRole === role.name
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
              >
                {ROLE_LABELS[role.name] || role.name}
              </Button>
              <Button
                variant="ghost"
                onClick={(e) => handleEditRole(role, e)}
                className={`px-2 py-2.5 rounded-l-none border-l ${selectedRole === role.name
                  ? 'bg-indigo-700 text-white border-indigo-500 hover:bg-indigo-800'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                title="Rol adını düzenle"
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Role Modal */}
      <Modal
        open={editModalOpen}
        title="Rol Adını Düzenle"
        onClose={() => {
          setEditModalOpen(false);
          setEditingRole(null);
          setEditRoleName('');
        }}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol Adı</label>
            <Input
              type="text"
              value={editRoleName}
              onChange={(e) => setEditRoleName(e.target.value)}
              className="w-full"
              placeholder="Rol adı girin"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setEditModalOpen(false);
                setEditingRole(null);
                setEditRoleName('');
              }}
            >
              İptal
            </Button>
            <Button
              onClick={handleSaveEditRole}
              loading={updateRoleMutation.isPending}
            >
              Kaydet
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Role Modal */}
      <Modal
        open={createModalOpen}
        title="Yeni Rol Oluştur"
        onClose={() => {
          setCreateModalOpen(false);
          setNewRoleName('');
        }}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol Adı</label>
            <Input
              type="text"
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              className="w-full"
              placeholder="Yeni rol adı girin"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setCreateModalOpen(false);
                setNewRoleName('');
              }}
            >
              İptal
            </Button>
            <Button
              onClick={handleCreateRole}
              variant="success"
              loading={createRoleMutation.isPending}
            >
              Oluştur
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Dialog for unsaved changes */}
      <ConfirmDialog
        isOpen={confirmDialogOpen}
        title="Kaydedilmemiş Değişiklikler"
        description="Kaydedilmemiş değişiklikler var. Devam etmek istiyor musunuz?"
        onClose={() => {
          setConfirmDialogOpen(false);
          setPendingRole(null);
        }}
        onConfirm={() => {
          if (pendingRole) {
            setSelectedRole(pendingRole);
          }
          setConfirmDialogOpen(false);
          setPendingRole(null);
        }}
        confirmLabel="Devam Et"
        cancelLabel="İptal"
      />

      {/* Permissions Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
          <span className="ml-3 text-gray-500">Izinler yukleniyor...</span>
        </div>
      ) : groupedPermissions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Izinler yuklenemedi veya henuz tanimlanmamis.</p>
          <p className="text-sm text-gray-400 mt-2">Lutfen sayfayi yenileyin veya sistem yoneticinize basvurun.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupedPermissions.map(group => {
            const allSelected = group.permissions.every(p => localPermissions.has(p.name));
            const someSelected = group.permissions.some(p => localPermissions.has(p.name));

            return (
              <div
                key={group.category}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                {/* Category Header */}
                <div
                  onClick={() => handleCategoryToggle(group.category, group.permissions)}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <div className="flex items-center">
                    <span className="text-indigo-600 dark:text-indigo-400 mr-3">{group.icon}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{group.label}</span>
                  </div>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    readOnly
                    className="pointer-events-none"
                  />
                </div>

                {/* Permissions List */}
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {group.permissions.map(perm => {
                    const isSelected = localPermissions.has(perm.name);
                    const action = perm.name.split('.')[1];

                    return (
                      <div
                        key={perm.id}
                        onClick={() => handlePermissionToggle(perm.name)}
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                            {action === 'view' ? 'Goruntuleme' :
                              action === 'create' ? 'Olusturma' :
                                action === 'edit' ? 'Duzenleme' :
                                  action === 'delete' ? 'Silme' :
                                    action === 'approve' ? 'Onaylama' :
                                      action === 'send' ? 'Gonderme' :
                                        action === 'manage' ? 'Yonetim' :
                                          action === 'export' ? 'Disari Aktar' :
                                            action === 'upload' ? 'Yukleme' :
                                              action === 'notes' ? 'Notlar' :
                                                action === 'history' ? 'Gecmis' :
                                                  action === 'assign' ? 'Atama' :
                                                    action === 'payments' ? 'Odemeler' :
                                                      action === 'refunds' ? 'Iadeler' :
                                                        action === 'reports' ? 'Raporlar' :
                                                          action === 'cash_register' ? 'Kasa' :
                                                            action === 'cancel' ? 'Iptal' :
                                                              action === 'send_sms' ? 'SMS Gonder' :
                                                                action === 'branches' ? 'Subeler' :
                                                                  action === 'integrations' ? 'Entegrasyonlar' :
                                                                    action === 'permissions' ? 'Izinler' :
                                                                      action === 'analytics' ? 'Analitik' :
                                                                        action}
                          </div>
                          {perm.description && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {perm.description}
                            </div>
                          )}
                        </div>
                        <Checkbox
                          checked={isSelected}
                          readOnly
                          className="pointer-events-none"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">İzin Sistemi Hakkında</h4>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
              Tenant Admin rolü tüm izinlere otomatik olarak sahiptir ve düzenlenemez.
              Bu sayfada Yönetici, Odyolog, Odyometrist, Sekreter ve Kullanıcı rollerinin izinlerini yapılandırabilirsiniz.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
