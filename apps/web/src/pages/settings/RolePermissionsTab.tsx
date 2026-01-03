import React, { useState, useMemo } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { customInstance } from '@/api/orval-mutator';
import { Shield, Check, Save, Loader2, AlertCircle, Users, ShoppingCart, DollarSign, FileText, Headphones, Package, Megaphone, Settings, BarChart, LayoutDashboard, Calendar, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  // useAdminRolesGetAdminPermissions,
  usePermissionsGetRolePermissions,
  usePermissionsUpdateRolePermissions,
  getPermissionsGetRolePermissionsQueryKey,
  getPermissionsGetMyPermissionsQueryKey,
} from '@/api/generated';
import { getAdminDebugAvailableRolesQueryKey } from '@/api/generated/admin/admin';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AxiosError } from 'axios';

// Permission categories with icons
const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ReactNode }> = {
  patients: { label: 'Hastalar', icon: <Users className="w-5 h-5" /> },
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

// Editable roles (tenant_admin cannot be edited - has all permissions by default)
const EDITABLE_ROLES = ['admin', 'odyolog', 'odyometrist', 'secretary', 'user'];

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

export function RolePermissionsTab() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<string>('odyolog');
  const [localPermissions, setLocalPermissions] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<string | null>(null);

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
  const { data: rolePermissionsResponse, isLoading: loadingRole } = usePermissionsGetRolePermissions(
    selectedRole || '',
    {
      query: {
        queryKey: getPermissionsGetRolePermissionsQueryKey(selectedRole || ''),
        enabled: !!selectedRole,
      },
    }
  );

  // Update role permissions mutation using orval hook
  const updateMutation = usePermissionsUpdateRolePermissions({
    mutation: {
      onSuccess: () => {
        toast.success('İzinler başarıyla güncellendi');
        // Invalidate role permissions query
        queryClient.invalidateQueries({ queryKey: getPermissionsGetRolePermissionsQueryKey(selectedRole || '') });
        queryClient.invalidateQueries({ queryKey: getPermissionsGetMyPermissionsQueryKey() });
        // Invalidate debug role switcher to update counts
        queryClient.invalidateQueries({ queryKey: getAdminDebugAvailableRolesQueryKey() });
        setHasChanges(false);
      },
      onError: (error: AxiosError<{ error?: string; message?: string }>) => {
        const errorMessage = error.response?.data?.error ||
          error.response?.data?.message ||
          'İzinler güncellenirken bir hata oluştu';
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

    allPermissionsData.all.forEach(perm => {
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

  const isLoading = loadingPermissions || loadingRole;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Rol Izinleri</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Her rol icin izinleri yapilandirin</p>
        </div>
        {hasChanges && (
          <div className="flex items-center space-x-3">
            <button
              onClick={handleReset}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Sifirla
            </button>
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Save className="w-5 h-5 mr-2" />
              )}
              Kaydet
            </button>
          </div>
        )}
      </div>

      {/* Role Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Rol Seçin</label>
        <div className="flex flex-wrap gap-2">
          {EDITABLE_ROLES.map(role => (
            <button
              key={role}
              onClick={() => {
                if (hasChanges) {
                  setPendingRole(role);
                  setConfirmDialogOpen(true);
                } else {
                  setSelectedRole(role);
                }
              }}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedRole === role
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
            >
              {ROLE_LABELS[role] || role}
            </button>
          ))}
        </div>
      </div>

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
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${allSelected
                    ? 'bg-indigo-600 border-indigo-600'
                    : someSelected
                      ? 'bg-indigo-200 border-indigo-600'
                      : 'border-gray-300 dark:border-gray-600'
                    }`}>
                    {allSelected && <Check className="w-3 h-3 text-white" />}
                    {someSelected && !allSelected && <div className="w-2 h-2 bg-indigo-600 rounded-sm" />}
                  </div>
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
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ml-3 ${isSelected
                          ? 'bg-indigo-600 border-indigo-600'
                          : 'border-gray-300 dark:border-gray-600'
                          }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
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
