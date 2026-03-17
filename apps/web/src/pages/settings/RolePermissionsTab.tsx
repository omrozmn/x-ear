import React, { useState, useMemo } from 'react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { customInstance } from '@/api/orval-mutator';
import { Shield, Save, Loader2, AlertCircle, Users, ShoppingCart, DollarSign, FileText, Headphones, Package, Megaphone, Settings, BarChart, LayoutDashboard, Calendar, ClipboardList, Pencil, Plus } from 'lucide-react';
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
import { SettingsSectionHeader } from '../../components/layout/SettingsSectionHeader';
import { PERMISSION_PAGE_REGISTRY, type PermissionPageDefinition, type PermissionTabDefinition, type PermissionBlockDefinition } from './permissionRegistry';

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
  appointments: { label: 'Randevular', icon: <Calendar className="w-5 h-5" /> },
  activity_logs: { label: 'Aktivite Logları', icon: <ClipboardList className="w-5 h-5" /> },
  // Additional categories
  patient: { label: 'Hasta (Legacy)', icon: <Users className="w-5 h-5" /> },
  sale: { label: 'Satış (Legacy)', icon: <ShoppingCart className="w-5 h-5" /> },
  invoice: { label: 'Fatura (Legacy)', icon: <FileText className="w-5 h-5" /> },
  appointment: { label: 'Randevu (Legacy)', icon: <Calendar className="w-5 h-5" /> },
  supplier: { label: 'Tedarikçi', icon: <Package className="w-5 h-5" /> },
  tenant: { label: 'Tenant', icon: <Settings className="w-5 h-5" /> },
  user: { label: 'Kullanıcı', icon: <Users className="w-5 h-5" /> },
  users: { label: 'Kullanıcılar', icon: <Users className="w-5 h-5" /> },
  branches: { label: 'Şubeler', icon: <Settings className="w-5 h-5" /> },
  payments: { label: 'Ödemeler', icon: <DollarSign className="w-5 h-5" /> },
  cash_records: { label: 'Kasa Kayıtları', icon: <DollarSign className="w-5 h-5" /> },
  campaign: { label: 'Kampanya (Legacy)', icon: <Megaphone className="w-5 h-5" /> },
  ocr: { label: 'OCR', icon: <FileText className="w-5 h-5" /> },
  role: { label: 'Rol', icon: <Shield className="w-5 h-5" /> },
  sms: { label: 'SMS', icon: <Megaphone className="w-5 h-5" /> },
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

interface PermissionCardItem {
  key: string;
  category: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  rootPermissions: Permission[];
  permissions: Permission[];
  tabs?: PermissionTabDefinition[];
}

function buildRegistryPermissionDescriptions() {
  const describeAction = (permissionName: string) => {
    const action = permissionName.split('.').pop() || '';
    const actionLabels: Record<string, string> = {
      view: 'görüntüleyebilir',
      create: 'oluşturabilir',
      edit: 'düzenleyebilir',
      delete: 'silebilir',
      approve: 'onaylayabilir',
      export: 'dışa aktarabilir',
      send: 'gönderebilir',
      upload: 'yükleyebilir',
      assign: 'atayabilir',
      manage: 'yönetebilir',
      analytics: 'analizleri görüntüleyebilir',
      permissions: 'izinlerini yönetebilir',
      branches: 'şubelerini yönetebilir',
      integrations: 'entegrasyonlarını yönetebilir',
      payments: 'ödeme kayıtlarını görüntüleyebilir',
      refunds: 'iade kayıtlarını görüntüleyebilir',
      reports: 'raporlarını görüntüleyebilir',
      modal: 'modalını görüntüleyebilir',
      actions: 'işlemlerini kullanabilir',
      summary: 'özetini görüntüleyebilir',
      table: 'tablosunu görüntüleyebilir',
      list: 'listesini görüntüleyebilir',
      filters: 'filtrelerini görüntüleyebilir',
      panel: 'panelini görüntüleyebilir',
      cards: 'kartlarını görüntüleyebilir',
      credentials: 'kimlik bilgilerini görüntüleyebilir',
      services: 'servis bağlantılarını görüntüleyebilir',
      profile: 'profilini görüntüleyebilir',
      branding: 'marka ayarlarını görüntüleyebilir',
      billing: 'faturalama alanını görüntüleyebilir',
      plan: 'paket bilgilerini görüntüleyebilir',
      forms: 'form ayarlarını görüntüleyebilir',
      segments: 'segmentlerini görüntüleyebilir',
      sms: 'SMS alanını kullanabilir',
      editor: 'düzenleyicisini kullanabilir',
      preview: 'önizlemesini görüntüleyebilir',
      download: 'indirebilir',
      transfer: 'içe/dışa aktarım alanını kullanabilir',
      form: 'formunu görüntüleyebilir',
      new_record: 'yeni kayıt oluşturabilir',
      cashflow_modal: 'nakit akışı modalını görüntüleyebilir',
      provider: 'sağlayıcı durumunu görüntüleyebilir',
      status: 'durum alanını görüntüleyebilir',
      company: 'firma bilgilerini görüntüleyebilir',
      integration: 'entegrasyon ayarlarını görüntüleyebilir',
      team: 'ekip ayarlarını görüntüleyebilir',
      parties: 'hasta ayarlarını görüntüleyebilir',
      sgk: 'SGK alanını görüntüleyebilir',
      subscription: 'abonelik alanını görüntüleyebilir',
    };
    return actionLabels[action] || 'kullanabilir';
  };

  const descriptions = new Map<string, string>();

  PERMISSION_PAGE_REGISTRY.forEach((page) => {
    page.permissions.forEach((permissionName) => {
      if (!descriptions.has(permissionName)) {
        descriptions.set(permissionName, `${page.label} sayfasını ${describeAction(permissionName)}`);
      }
    });

    page.tabs?.forEach((tab) => {
      tab.permissions.forEach((permissionName) => {
        if (!descriptions.has(permissionName)) {
          descriptions.set(permissionName, `${page.label} > ${tab.label} sekmesini görüntüleyebilir`);
        }
      });

      tab.blocks?.forEach((block) => {
        block.permissions.forEach((permissionName) => {
          if (!descriptions.has(permissionName)) {
            descriptions.set(permissionName, `${page.label} > ${tab.label} > ${block.label} alanını görüntüleyebilir`);
          }
        });
      });
    });
  });

  return descriptions;
}

function getTabPermissionNames(tab: PermissionTabDefinition) {
  return [
    ...tab.permissions,
    ...(tab.blocks || []).flatMap((block) => block.permissions),
  ];
}

function getPagePermissionNames(page: PermissionCardItem) {
  return [
    ...page.rootPermissions.map((permission) => permission.name),
    ...(page.tabs || []).flatMap((tab) => getTabPermissionNames(tab)),
  ];
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
  const [selectedPage, setSelectedPage] = useState<PermissionCardItem | null>(null);
  const [selectedTab, setSelectedTab] = useState<{ page: PermissionCardItem; tab: PermissionTabDefinition } | null>(null);

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
      onError: (error: AxiosError<{ error?: { message?: string; code?: string } | string; message?: string; detail?: { message?: string } | string }>) => {
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
      onError: (error: AxiosError<{ error?: { message?: string; code?: string } | string; message?: string; detail?: { message?: string } | string }>) => {
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
      onError: (error: AxiosError<{ error?: { message?: string; code?: string } | string; message?: string; detail?: { message?: string } | string }>) => {
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

    const hiddenLegacyCategories = new Set([
      'patients',
      'patient',
      'sale',
      'sales',
      'appointment',
      'appointments',
      'invoice',
      'invoices',
      'devices',
      'supplier',
      'suppliers',
      'payments',
      'cash_records',
      'activity_logs',
    ]);

    const groups: Record<string, Permission[]> = {};

    allPermissionsData.all.forEach((perm: Permission) => {
      const category = perm.name.split('.')[0];
      if (hiddenLegacyCategories.has(category)) {
        return;
      }
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

  const permissionLookup = useMemo(() => {
    const map = new Map<string, Permission>();
    (allPermissionsData?.all || []).forEach((perm: Permission) => {
      map.set(perm.name, perm);
    });
    return map;
  }, [allPermissionsData]);

  const registryPermissionDescriptions = useMemo(() => buildRegistryPermissionDescriptions(), []);

  const getPermissionsByName = React.useCallback((permissionNames: string[]) => {
    return permissionNames
      .filter(Boolean)
      .map((name) => permissionLookup.get(name) || {
        id: `synthetic:${name}`,
        name,
        description: registryPermissionDescriptions.get(name) || null,
      });
  }, [permissionLookup, registryPermissionDescriptions]);

  const permissionCards = useMemo<PermissionCardItem[]>(() => {
    const usedCategories = new Set<string>();
    const mappedCards = PERMISSION_PAGE_REGISTRY.map((page: PermissionPageDefinition) => {
      usedCategories.add(page.category);
      const pagePermissionNames = new Set<string>(page.permissions);
      page.tabs?.forEach((tab) => {
        tab.permissions.forEach((permission) => pagePermissionNames.add(permission));
        tab.blocks?.forEach((block) => block.permissions.forEach((permission) => pagePermissionNames.add(permission)));
      });

      return {
        key: page.key,
        category: page.category,
        label: page.label,
        description: page.description,
        icon: <page.icon className="w-5 h-5" />,
        rootPermissions: getPermissionsByName(page.permissions),
        permissions: getPermissionsByName(Array.from(pagePermissionNames)),
        tabs: page.tabs,
      };
    });

    const fallbackCards = groupedPermissions
      .filter((group) => !usedCategories.has(group.category))
      .map((group) => ({
        key: group.category,
        category: group.category,
        label: group.label,
        icon: group.icon,
        rootPermissions: group.permissions,
        permissions: group.permissions,
      }));

    return [...mappedCards, ...fallbackCards];
  }, [getPermissionsByName, groupedPermissions]);

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

  const handleSelectAllCurrentRole = () => {
    const allPermissionNames = permissionCards.flatMap((card) => getPagePermissionNames(card));
    setLocalPermissions(new Set(allPermissionNames));
    setHasChanges(true);
  };

  const handleClearAllCurrentRole = () => {
    setLocalPermissions(new Set());
    setHasChanges(true);
  };

  const togglePermissionList = (permissionNames: string[]) => {
    const normalizedPermissions = Array.from(new Set(permissionNames.filter(Boolean)));
    if (normalizedPermissions.length === 0) return;

    const newPermissions = new Set(localPermissions);
    const allSelected = normalizedPermissions.every((name) => localPermissions.has(name));

    if (allSelected) {
      normalizedPermissions.forEach((name) => newPermissions.delete(name));
    } else {
      normalizedPermissions.forEach((name) => newPermissions.add(name));
    }

    setLocalPermissions(newPermissions);
    setHasChanges(true);
  };

  const getSelectionState = (permissionNames: string[]) => {
    const normalizedPermissions = Array.from(new Set(permissionNames.filter(Boolean)));
    const allSelected = normalizedPermissions.length > 0 && normalizedPermissions.every((name) => localPermissions.has(name));
    const someSelected = normalizedPermissions.some((name) => localPermissions.has(name));
    return { allSelected, someSelected, count: normalizedPermissions.length };
  };

  const renderPermissionRows = (permissions: Permission[]) => (
    <div className="divide-y divide-gray-100 dark:divide-gray-700">
      {permissions.map((perm) => {
        const isSelected = localPermissions.has(perm.name);
        return (
          <div
            key={perm.id}
            onClick={() => handlePermissionToggle(perm.name)}
            className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted dark:hover:bg-gray-700/30"
          >
            <div className="flex-1 min-w-0 pr-3">
              <div className="text-sm font-medium text-foreground">
                {perm.description || perm.name}
              </div>
              <div className="text-xs text-muted-foreground break-all mt-1">
                {perm.name}
              </div>
            </div>
            <Checkbox
              checked={isSelected}
              onChange={() => handlePermissionToggle(perm.name)}
            />
          </div>
        );
      })}
    </div>
  );

  return (
    <div>
      <SettingsSectionHeader
        className="mb-6"
        title="Rol İzinleri"
        description="Her rol için izinleri yapılandırın"
        icon={<Shield className="w-6 h-6" />}
        actions={hasChanges ? (
          <>
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
          </>
        ) : null}
      />

      {/* Role Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-border p-4 mb-6">
        <div className="flex justify-between items-center mb-3">
          <label className="block text-sm font-medium text-foreground">Rol Seçin</label>
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
        <div className="flex flex-wrap gap-2 mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSelectAllCurrentRole}
          >
            Tümünü Seç
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearAllCurrentRole}
          >
            Tümünü Kaldır
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
                  ? 'premium-gradient tactile-press text-white'
                  : 'bg-muted text-foreground hover:bg-accent dark:hover:bg-gray-600'
                  }`}
              >
                {ROLE_LABELS[role.name] || role.name}
              </Button>
              <Button
                variant="ghost"
                onClick={(e) => handleEditRole(role, e)}
                className={`px-2 py-2.5 rounded-l-none border-l ${selectedRole === role.name
                  ? 'bg-indigo-700 text-white border-indigo-500 hover:bg-indigo-800'
                  : 'bg-muted text-muted-foreground border-border hover:bg-accent dark:hover:bg-gray-600 hover:text-foreground dark:hover:text-gray-300'
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
            <label className="block text-sm font-medium text-foreground mb-1">Rol Adı</label>
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
            <label className="block text-sm font-medium text-foreground mb-1">Rol Adı</label>
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
          <span className="ml-3 text-muted-foreground">Izinler yukleniyor...</span>
        </div>
      ) : permissionCards.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-border p-8 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Izinler yuklenemedi veya henuz tanimlanmamis.</p>
          <p className="text-sm text-muted-foreground mt-2">Lutfen sayfayi yenileyin veya sistem yoneticinize basvurun.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {permissionCards.map(group => {
            const pagePermissionNames = getPagePermissionNames(group);
            const { allSelected, someSelected } = getSelectionState(pagePermissionNames);

            return (
              <div
                key={group.key}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-border overflow-hidden"
              >
                {/* Category Header */}
                <div className="flex items-start justify-between gap-3 p-4 bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex items-center">
                    <span className="text-indigo-600 dark:text-indigo-400 mr-3">{group.icon}</span>
                    <button
                      data-allow-raw="true"
                      type="button"
                      onClick={() => setSelectedPage(group)}
                      className="text-left"
                    >
                      <span className="font-medium text-gray-900 dark:text-white">{group.label}</span>
                      {group.description && (
                        <p className="mt-1 text-xs text-muted-foreground">{group.description}</p>
                      )}
                    </button>
                  </div>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onChange={() => togglePermissionList(pagePermissionNames)}
                  />
                </div>

                <div className="p-3 space-y-2">
                  {group.tabs && group.tabs.length > 0 ? (
                    group.tabs.map((tab) => {
                      const tabPermissionNames = getTabPermissionNames(tab);
                      const tabState = getSelectionState(tabPermissionNames);
                      return (
                        <div
                          key={tab.key}
                          className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
                        >
                          <button
                            data-allow-raw="true"
                            type="button"
                            onClick={() => setSelectedTab({ page: group, tab })}
                            className="flex-1 text-left hover:text-indigo-600 dark:hover:text-indigo-300"
                          >
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{tab.label}</p>
                            {tab.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{tab.description}</p>
                            )}
                          </button>
                          <Checkbox
                            checked={tabState.allSelected}
                            indeterminate={tabState.someSelected && !tabState.allSelected}
                            onChange={() => togglePermissionList(tabPermissionNames)}
                          />
                        </div>
                      );
                    })
                  ) : (
                    renderPermissionRows(group.permissions.slice(0, 4))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={Boolean(selectedPage)}
        title={selectedPage?.label || 'Sayfa İzinleri'}
        onClose={() => setSelectedPage(null)}
        size="md"
      >
        {selectedPage && (
          <div className="space-y-5">
            {selectedPage.description && (
              <p className="text-sm text-muted-foreground">{selectedPage.description}</p>
            )}

            <div className="rounded-xl border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/40">
                <h4 className="font-medium text-gray-900 dark:text-white">Sayfa Yetkileri</h4>
                <Checkbox
                  checked={getSelectionState(selectedPage.rootPermissions.map((permission) => permission.name)).allSelected}
                  indeterminate={getSelectionState(selectedPage.rootPermissions.map((permission) => permission.name)).someSelected && !getSelectionState(selectedPage.rootPermissions.map((permission) => permission.name)).allSelected}
                  onChange={() => togglePermissionList(selectedPage.rootPermissions.map((permission) => permission.name))}
                />
              </div>
              {renderPermissionRows(selectedPage.rootPermissions)}
            </div>

            {selectedPage.tabs && selectedPage.tabs.length > 0 && (
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/40">
                  <h4 className="font-medium text-gray-900 dark:text-white">Sekmeler</h4>
                </div>
                <div className="p-3 space-y-2">
                  {selectedPage.tabs.map((tab) => {
                    const tabPermissionNames = getTabPermissionNames(tab);
                    const tabState = getSelectionState(tabPermissionNames);
                    return (
                      <div
                        key={tab.key}
                        className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-3"
                      >
                        <button
                          data-allow-raw="true"
                          type="button"
                          onClick={() => setSelectedTab({ page: selectedPage, tab })}
                          className="flex-1 text-left hover:text-indigo-600 dark:hover:text-indigo-300"
                        >
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{tab.label}</p>
                          {tab.description && (
                            <p className="text-xs text-muted-foreground mt-1">{tab.description}</p>
                          )}
                        </button>
                        <Checkbox
                          checked={tabState.allSelected}
                          indeterminate={tabState.someSelected && !tabState.allSelected}
                          onChange={() => togglePermissionList(tabPermissionNames)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(selectedTab)}
        title={selectedTab ? `${selectedTab.page.label} / ${selectedTab.tab.label}` : 'Sekme İzinleri'}
        onClose={() => setSelectedTab(null)}
        size="md"
      >
        {selectedTab && (
          <div className="space-y-5">
            {selectedTab.tab.description && (
              <p className="text-sm text-muted-foreground">{selectedTab.tab.description}</p>
            )}

            <div className="rounded-xl border border-border overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/40">
                <h4 className="font-medium text-gray-900 dark:text-white">Sekme Yetkileri</h4>
                <Checkbox
                  checked={getSelectionState(selectedTab.tab.permissions).allSelected}
                  indeterminate={getSelectionState(selectedTab.tab.permissions).someSelected && !getSelectionState(selectedTab.tab.permissions).allSelected}
                  onChange={() => togglePermissionList(selectedTab.tab.permissions)}
                />
              </div>
              {getPermissionsByName(selectedTab.tab.permissions).length > 0 ? (
                renderPermissionRows(getPermissionsByName(selectedTab.tab.permissions))
              ) : (
                <div className="px-4 py-6 text-sm text-muted-foreground">
                  Bu sekme için henüz ayrı bir izin satırı bulunmuyor.
                </div>
              )}
            </div>

            {selectedTab.tab.blocks && selectedTab.tab.blocks.length > 0 && (
              <div className="grid grid-cols-1 gap-3">
                {selectedTab.tab.blocks.map((block: PermissionBlockDefinition) => {
                  const blockPermissions = getPermissionsByName(block.permissions);
                  const blockState = getSelectionState(block.permissions);
                  return (
                    <div key={block.key} className="rounded-xl border border-border overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/40">
                        <div>
                          <h5 className="font-medium text-gray-900 dark:text-white">{block.label}</h5>
                          {block.description && (
                            <p className="text-xs text-muted-foreground mt-1">{block.description}</p>
                          )}
                        </div>
                        <Checkbox
                          checked={blockState.allSelected}
                          indeterminate={blockState.someSelected && !blockState.allSelected}
                          onChange={() => togglePermissionList(block.permissions)}
                        />
                      </div>
                      {blockPermissions.length > 0 ? (
                        renderPermissionRows(blockPermissions)
                      ) : (
                        <div className="px-4 py-6 text-sm text-muted-foreground">
                          Bu blok için henüz ayrı bir izin satırı bulunmuyor.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-primary/10 border border-blue-200 dark:border-blue-800 rounded-2xl">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-primary mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">İzin Sistemi Hakkında</h4>
            <p className="text-sm text-primary mt-1">
              Tenant Admin rolü tüm izinlere otomatik olarak sahiptir ve düzenlenemez.
              Bu sayfada Yönetici, Odyolog, Odyometrist, Sekreter ve Kullanıcı rollerinin izinlerini yapılandırabilirsiniz.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
