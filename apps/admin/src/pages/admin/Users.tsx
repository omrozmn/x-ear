import React, { useState } from 'react';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import {
  Search,
  UserPlus,
  X as XMarkIcon,
  AlertTriangle as ExclamationTriangleIcon,
  Eye,
  EyeOff,
  RefreshCw,
  Edit,
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import toast from 'react-hot-toast';

import {
  useCreateAdminUser,
  useListAdminUsers,
  useListAdminUserAll,
  useUpdateAdminUserAll,
  type AdminUsersAllUser,
  type PaginationMeta,
  type UpdateAdminUserAllPayload,
} from '@/lib/api-client';
import Pagination from '@/components/ui/Pagination';
import { TenantAutocomplete } from '@/components/ui/TenantAutocomplete';
import type { SchemasUsersUserCreate } from '@/api/generated/schemas';
import { useAdminResponsive } from '@/hooks';
import { ResponsiveTable } from '@/components/responsive';
import { PermissionGate } from '@/hooks/PermissionGate';
import { AdminPermissions } from '@/types';

// Local type definitions to handle the mix of generated types and manual needs
const AdminUserRoleValues = ['super_admin', 'admin', 'support', 'tenant_admin', 'user', 'doctor', 'secretary'] as const;
type AdminUserRole = (typeof AdminUserRoleValues)[number];
type UserType = 'admin' | 'tenant';

interface ExtendedUser extends AdminUsersAllUser {
  tenantName?: string;
}

interface UserFormData {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  role: AdminUserRole;
  password: string;
  user_type: UserType;
  tenant_id: string;
}

interface UsersResponseData {
  users: ExtendedUser[];
  pagination?: PaginationMeta;
}

interface ApiErrorPayload {
  response?: {
    data?: {
      error?: {
        message?: string;
      };
    };
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractUsersResponse(value: unknown): UsersResponseData {
  if (!isRecord(value)) {
    return { users: [] };
  }

  const users = Array.isArray(value.users) ? value.users : [];
  const pagination = isRecord(value.pagination) ? value.pagination as unknown as PaginationMeta : undefined;
  return { users, pagination };
}

function isApiError(error: unknown): error is ApiErrorPayload {
  return isRecord(error);
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (isApiError(error)) {
    return error.response?.data?.error?.message ?? fallback;
  }
  return fallback;
}

function getUserTenantId(user: ExtendedUser): string {
  return user.tenantId ?? user.tenant_id ?? '';
}

function getUserFirstName(user: ExtendedUser): string {
  return user.firstName ?? user.first_name ?? '';
}

function getUserLastName(user: ExtendedUser): string {
  return user.lastName ?? user.last_name ?? '';
}

function getUserUsername(user: ExtendedUser): string {
  return user.username ?? '';
}

function getUserLastLogin(user: ExtendedUser): string {
  return user.lastLogin ?? user.last_login ?? '';
}

function getUserCreatedAt(user: ExtendedUser): string {
  return user.createdAt ?? user.created_at ?? '';
}

function getUserTenantName(user: ExtendedUser): string {
  return user.tenantName ?? user.tenant_name ?? '';
}

function getUserIsActive(user: ExtendedUser): boolean {
  return user.isActive ?? user.is_active ?? false;
}

const userCreateSchema = z.object({
  email: z.string().min(1, 'E-posta gerekli').email('Gecerli bir e-posta girin'),
  first_name: z.string().min(1, 'Isim gerekli'),
  last_name: z.string().min(1, 'Soyisim gerekli'),
  password: z.string().min(6, 'Sifre en az 6 karakter olmali'),
  role: z.enum(AdminUserRoleValues, { errorMap: () => ({ message: 'Gecerli bir rol secin' }) }),
});

const userUpdateSchema = z.object({
  email: z.string().min(1, 'E-posta gerekli').email('Gecerli bir e-posta girin'),
  first_name: z.string().min(1, 'Isim gerekli'),
  last_name: z.string().min(1, 'Soyisim gerekli'),
  password: z.string().min(6, 'Sifre en az 6 karakter olmali').or(z.literal('')),
  role: z.enum(AdminUserRoleValues, { errorMap: () => ({ message: 'Gecerli bir rol secin' }) }),
});

function getInitialFormData(userType: UserType, role: AdminUserRole): UserFormData {
  return {
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    role,
    password: '',
    user_type: userType,
    tenant_id: '',
  };
}

export const Users: React.FC = () => {
  const { isMobile } = useAdminResponsive();
  const queryClient = useQueryClient();

  // State
  const [activeTab, setActiveTab] = useState('admin');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Pagination State
  const [adminPage, setAdminPage] = useState(1);
  const [adminLimit, setAdminLimit] = useState(10);
  const [tenantPage, setTenantPage] = useState(1);
  const [tenantLimit, setTenantLimit] = useState(10);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<ExtendedUser | null>(null);
  const [userToToggle, setUserToToggle] = useState<{ id: string, status: boolean } | null>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Data
  const [formData, setFormData] = useState<UserFormData>(getInitialFormData('admin', 'support'));

  // --- Data Fetching ---

  // 1. Fetch System Admins (Paginated on Backend)
  const { data: adminUsersData, isLoading: loadingAdmins, error: adminError } = useListAdminUsers({
    page: adminPage,
    per_page: adminLimit,
    search: searchTerm || undefined
  }, { query: { queryKey: ['admin-users', adminPage, adminLimit, searchTerm], enabled: activeTab === 'admin' } });

  // 2. Fetch All Tenant Users (Paginated on Backend)
  const { data: tenantUsersData, isLoading: loadingTenants, error: tenantError } = useListAdminUserAll({
    page: tenantPage,
    per_page: tenantLimit,
    search: searchTerm || undefined,
    role: roleFilter !== 'all' ? roleFilter : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined
  }, { query: { queryKey: ['tenant-users', tenantPage, tenantLimit, searchTerm, roleFilter, statusFilter], enabled: activeTab === 'tenant' } });

  // --- Derived Data ---

  // Admin Users List
  const { users: adminUsersList, pagination: adminPagination } = extractUsersResponse(adminUsersData);

  // Tenant Users List (Backend-paginated)
  const { users: rawTenantUsers, pagination: tenantPagination } = extractUsersResponse(tenantUsersData);

  // --- Handlers ---

  const generateUsername = () => {
    if (formData.first_name && formData.last_name) {
      // Normalize Turkish characters
      const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c");

      const base = `${normalize(formData.first_name.toLowerCase())}${normalize(formData.last_name.toLowerCase())}`.replace(/[^a-z0-9]/g, '');
      const random = Math.floor(Math.random() * 1000);
      setFormData(prev => ({ ...prev, username: `${base}${random}` }));
    } else {
      toast.error('İsim ve soyisim girilmelidir');
    }
  };

  const handleAddClick = () => {
    setFormData(
      getInitialFormData(
        activeTab === 'tenant' ? 'tenant' : 'admin',
        activeTab === 'admin' ? 'support' : 'user'
      )
    );
    setIsAddModalOpen(true);
  };

  const handleEditClick = (user: ExtendedUser) => {
    setSelectedUser(user);
    const tenantId = getUserTenantId(user);

    setFormData({
      email: user.email || '',
      username: getUserUsername(user),
      first_name: getUserFirstName(user),
      last_name: getUserLastName(user),
      role: (user.role as AdminUserRole | undefined) || 'user',
      password: '',
      user_type: tenantId ? 'tenant' : 'admin',
      tenant_id: tenantId
    });
    setIsEditModalOpen(true);
  };

  const handleViewClick = (user: ExtendedUser) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  };

  const { mutateAsync: createAdminUser } = useCreateAdminUser();
  const { mutateAsync: updateAnyTenantUser } = useUpdateAdminUserAll();

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const validation = userCreateSchema.safeParse(formData);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      setIsSubmitting(false);
      return;
    }

    if (formData.user_type === 'tenant' && !formData.tenant_id) {
      toast.error('Lütfen bir abone seçin');
      setIsSubmitting(false);
      return;
    }

    try {
      const payload: SchemasUsersUserCreate = {
        email: formData.email,
        password: formData.password,
        username: formData.username || undefined,
        firstName: formData.first_name || undefined,
        lastName: formData.last_name || undefined,
        role: formData.role,
        tenantId: formData.user_type === 'tenant' ? formData.tenant_id : '',
        isActive: true,
      };
      await createAdminUser({ data: payload });

      toast.success(`Kullanıcı başarıyla oluşturuldu`);
      setIsAddModalOpen(false);

      // Invalidate both queries to be safe
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-users'] });

    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Kullanıcı oluşturulamadı'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser?.id) return;
    setIsSubmitting(true);

    const validation = userUpdateSchema.safeParse(formData);
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      setIsSubmitting(false);
      return;
    }

    try {
      const payload: UpdateAdminUserAllPayload = {
        email: formData.email,
        username: formData.username,
        first_name: formData.first_name,
        last_name: formData.last_name,
        role: formData.role,
      };

      if (formData.password) {
        payload.password = formData.password;
      }

      await updateAnyTenantUser({
        userId: selectedUser.id!,
        data: payload
      });

      toast.success('Kullanıcı güncellendi');
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-users'] });

    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, 'Güncelleme başarısız'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusToggleClick = (user: ExtendedUser) => {
    setUserToToggle({
      id: user.id!,
      status: getUserIsActive(user)
    });
    setConfirmModalOpen(true);
  };

  const confirmStatusToggle = async () => {
    if (!userToToggle) return;
    setIsSubmitting(true);
    try {
      await updateAnyTenantUser({
        userId: userToToggle.id,
        data: { is_active: !userToToggle.status }
      });
      toast.success(`Kullanıcı ${!userToToggle.status ? 'aktif' : 'pasif'} duruma getirildi`);
      setConfirmModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-users'] });
    } catch (error: unknown) {
      toast.error('Durum değiştirilemedi');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Components ---

  const RoleBadge = ({ role }: { role?: string }) => {
    const colors: Record<string, string> = {
      super_admin: 'bg-red-100 text-red-800',
      admin: 'bg-blue-100 text-blue-800',
      support: 'bg-indigo-100 text-indigo-800',
      tenant_admin: 'bg-purple-100 text-purple-800',
      user: 'bg-green-100 text-green-800'
    };
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[role || ''] || 'bg-gray-100 text-gray-800'}`}>{role}</span>;
  };

  const StatusBadge = ({ active }: { active?: boolean }) => {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
        {active ? 'Aktif' : 'Pasif'}
      </span>
    );
  };

  const getColumns = (isTenantTab: boolean) => [
    {
      key: 'user',
      header: 'Kullanıcı',
      sortable: true,
      sortKey: 'firstName',
      render: (user: ExtendedUser) => {
        const firstName = user.firstName || user.first_name || '';
        const lastName = user.lastName || user.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim() || user.email;
        return (
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-gray-900 dark:text-white">{fullName}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500">{getUserUsername(user)}</div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'role',
      header: 'Rol',
      sortable: true,
      render: (user: ExtendedUser) => <RoleBadge role={user.role as string} />
    },
    ...(isTenantTab ? [{
      key: 'tenant',
      header: 'Tenant',
      mobileHidden: true,
      sortable: true,
      sortKey: 'tenantName',
      render: (user: ExtendedUser) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {getUserTenantName(user) || '-'}
        </span>
      )
    }] : []),
    {
      key: 'status',
      header: 'Durum',
      sortable: true,
      sortKey: 'isActive',
      render: (user: ExtendedUser) => {
        const isActive = getUserIsActive(user);
        return <StatusBadge active={isActive} />;
      }
    },
    {
      key: 'lastLogin',
      header: 'Son Giriş',
      mobileHidden: true,
      sortable: true,
      render: (user: ExtendedUser) => {
        const lastLogin = getUserLastLogin(user);
        return (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {lastLogin ? new Date(lastLogin).toLocaleDateString('tr-TR') : '-'}
          </span>
        );
      }
    },
    {
      key: 'created',
      header: 'Oluşturulma',
      mobileHidden: true,
      sortable: true,
      sortKey: 'createdAt',
      render: (user: ExtendedUser) => {
        const createdAt = getUserCreatedAt(user);
        return (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {createdAt ? new Date(createdAt).toLocaleDateString('tr-TR') : '-'}
          </span>
        );
      }
    },
    {
      key: 'actions',
      header: 'İşlemler',
      render: (user: ExtendedUser) => {
        const isActive = getUserIsActive(user);
        return (
          <div className="flex justify-end space-x-2">
            <button
              onClick={(e) => { e.stopPropagation(); handleViewClick(user); }}
              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 p-1 touch-feedback"
              title="Görüntüle"
            >
              <Eye className="h-4 w-4" />
            </button>
            <PermissionGate permission={AdminPermissions.USERS_MANAGE}>
              <button
                onClick={(e) => { e.stopPropagation(); handleEditClick(user); }}
                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-1 touch-feedback"
                title="Düzenle"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleStatusToggleClick(user); }}
                className={`${isActive ? 'text-red-600 hover:text-red-900 dark:text-red-400' : 'text-green-600 hover:text-green-900 dark:text-green-400'} p-1 touch-feedback`}
                title={isActive ? 'Pasife Al' : 'Aktifleştir'}
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </PermissionGate>
          </div>
        );
      }
    }
  ];

  const renderTable = (users: ExtendedUser[], isTenantTab: boolean) => (
    <ResponsiveTable
      data={users}
      columns={getColumns(isTenantTab)}
      keyExtractor={(user) => user.id!}
      onRowClick={(user) => handleViewClick(user)}
      emptyMessage="Kayıt bulunamadı"
    />
  );

  return (
    <div className={isMobile ? 'p-4 pb-safe space-y-4' : 'space-y-6'}>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Kullanıcı Yönetimi</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Sistem yöneticilerini ve abone kullanıcılarını buradan yönetebilirsiniz.
          </p>
        </div>
        <PermissionGate permission={AdminPermissions.USERS_MANAGE}>
          <button
            onClick={handleAddClick}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white premium-gradient tactile-press focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 touch-feedback"
          >
            <UserPlus className="-ml-1 mr-2 h-5 w-5" />
            Kullanıcı Ekle
          </button>
        </PermissionGate>
      </div>

      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className={`flex border-b border-gray-200 dark:border-gray-700 ${isMobile ? 'mb-4' : 'mb-6'}`}>
          <Tabs.Trigger
            value="admin"
            className={`${isMobile ? 'flex-1 px-3 py-2 text-xs' : 'px-4 py-2 text-sm'} font-medium border-b-2 -mb-px touch-feedback ${activeTab === 'admin' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            {isMobile ? 'Sistem' : 'Sistem Yöneticileri (Admin)'}
          </Tabs.Trigger>
          <Tabs.Trigger
            value="tenant"
            className={`${isMobile ? 'flex-1 px-3 py-2 text-xs' : 'px-4 py-2 text-sm'} font-medium border-b-2 -mb-px touch-feedback ${activeTab === 'tenant' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            {isMobile ? 'Abone' : 'Abone Kullanıcıları (Tenant)'}
          </Tabs.Trigger>
        </Tabs.List>

        <div className={`bg-white dark:bg-gray-800 shadow rounded-2xl ${isMobile ? 'p-4 mb-4' : 'p-6 mb-6'}`}>
          <div className="flex flex-col gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Arama yapın..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl leading-5 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            {activeTab === 'tenant' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-xl"
                >
                  <option value="all">Tüm Roller</option>
                  <option value="tenant_admin">Yönetici</option>
                  <option value="user">Kullanıcı</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-xl"
                >
                  <option value="all">Tüm Durumlar</option>
                  <option value="active">Aktif</option>
                  <option value="inactive">Pasif</option>
                </select>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-2xl overflow-hidden">
          <Tabs.Content value="admin">
            {loadingAdmins ? (
              <div className={`${isMobile ? 'p-8' : 'p-12'} text-center text-gray-500 dark:text-gray-400`}>Yükleniyor...</div>
            ) : adminError ? (
              <div className={`${isMobile ? 'p-8' : 'p-12'} text-center text-red-500 dark:text-red-400`}>Hata oluştu.</div>
            ) : (
              <>
                {renderTable(adminUsersList, false)}
                {adminPagination && (
                  <Pagination
                    currentPage={adminPage}
                    totalPages={adminPagination.totalPages || 1}
                    totalItems={adminPagination.total || 0}
                    itemsPerPage={adminLimit}
                    onPageChange={setAdminPage}
                    onItemsPerPageChange={setAdminLimit}
                  />
                )}
              </>
            )}
          </Tabs.Content>

          <Tabs.Content value="tenant">
            {loadingTenants ? (
              <div className={`${isMobile ? 'p-8' : 'p-12'} text-center text-gray-500 dark:text-gray-400`}>Yükleniyor...</div>
            ) : tenantError ? (
              <div className={`${isMobile ? 'p-8' : 'p-12'} text-center text-red-500 dark:text-red-400`}>Hata oluştu.</div>
            ) : (
              <>
                {renderTable(rawTenantUsers, true)}
                {tenantPagination && (
                  <Pagination
                    currentPage={tenantPage}
                    totalPages={tenantPagination.totalPages || 1}
                    totalItems={tenantPagination.total || 0}
                    itemsPerPage={tenantLimit}
                    onPageChange={setTenantPage}
                    onItemsPerPageChange={setTenantLimit}
                  />
                )}
              </>
            )}
          </Tabs.Content>
        </div>
      </Tabs.Root>

      {/* --- ADD MODAL --- */}
      <Dialog.Root open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white p-6 shadow-xl z-50 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <Dialog.Title className="text-lg font-bold">Yeni Kullanıcı Ekle</Dialog.Title>
              <Dialog.Close className="text-gray-400 hover:text-gray-600"><XMarkIcon className="h-6 w-6" /></Dialog.Close>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* User Type Selection */}
              <div className="bg-gray-50 p-3 rounded-xl">
                <label className="block text-sm font-medium text-gray-700 mb-2">Kullanıcı Tipi</label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="user_type" value="admin" checked={formData.user_type === 'admin'} onChange={() => setFormData({ ...formData, user_type: 'admin' })} className="text-blue-600 focus:ring-blue-500" />
                    <span>Sistem Yöneticisi</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="user_type" value="tenant" checked={formData.user_type === 'tenant'} onChange={() => setFormData({ ...formData, user_type: 'tenant' })} className="text-blue-600 focus:ring-blue-500" />
                    <span>Abone (Tenant) Kullanıcısı</span>
                  </label>
                </div>
              </div>

              {formData.user_type === 'tenant' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Abone Seçimi</label>
                  <TenantAutocomplete
                    onSelect={(tenant) => setFormData({ ...formData, tenant_id: tenant.id })}
                    error={(!formData.tenant_id && isSubmitting) ? 'Abone seçimi zorunludur' : undefined}
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">İsim</label>
                  <input type="text" required value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-xl shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Soyisim</label>
                  <input type="text" required value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-xl shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Kullanıcı Adı</label>
                <div className="mt-1 flex rounded-xl shadow-sm">
                  <input type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 border" placeholder="Otomatik oluşturabilir veya elle girebilirsiniz" />
                  <button type="button" onClick={generateUsername} className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 text-sm hover:bg-gray-100">
                    <RefreshCw className="h-4 w-4 mr-1" /> Oluştur
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">E-posta</label>
                <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-xl shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Şifre</label>
                <div className="mt-1 relative rounded-xl shadow-sm">
                  <input type={showPassword ? "text" : "password"} required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="focus:ring-blue-500 focus:border-blue-500 block w-full pr-10 sm:text-sm border-gray-300 rounded-xl p-2 border" />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Rol</label>
                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as AdminUserRole })} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-xl border">
                  {AdminUserRoleValues.map(role => <option key={role} value={role}>{role}</option>)}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">İptal</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white premium-gradient tactile-press disabled:opacity-50">
                  {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* --- EDIT MODAL --- */}
      <Dialog.Root open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white p-6 shadow-xl z-50 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <Dialog.Title className="text-lg font-bold">Kullanıcı Düzenle</Dialog.Title>
              <Dialog.Close className="text-gray-400 hover:text-gray-600"><XMarkIcon className="h-6 w-6" /></Dialog.Close>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">İsim</label>
                  <input type="text" required value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-xl shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Soyisim</label>
                  <input type="text" required value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-xl shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Kullanıcı Adı</label>
                <input type="text" disabled value={formData.username} className="mt-1 block w-full bg-gray-100 border border-gray-300 rounded-xl shadow-sm p-2 sm:text-sm text-gray-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">E-posta</label>
                <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-xl shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Şifre (Değiştirmek istemiyorsanız boş bırakın)</label>
                <div className="mt-1 relative rounded-xl shadow-sm">
                  <input type={showPassword ? "text" : "password"} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="focus:ring-blue-500 focus:border-blue-500 block w-full pr-10 sm:text-sm border-gray-300 rounded-xl p-2 border" placeholder="Değiştirilmeyecek" />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Rol</label>
                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as AdminUserRole })} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-xl border">
                  {AdminUserRoleValues.map(role => <option key={role} value={role}>{role}</option>)}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">İptal</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white premium-gradient tactile-press disabled:opacity-50">
                  {isSubmitting ? 'Güncelleniyor...' : 'Güncelle'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* --- VIEW MODAL --- */}
      <Dialog.Root open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white p-6 shadow-xl z-50">
            <div className="flex justify-between items-center mb-4">
              <Dialog.Title className="text-lg font-bold">Kullanıcı Detayları</Dialog.Title>
              <Dialog.Close className="text-gray-400 hover:text-gray-600"><XMarkIcon className="h-6 w-6" /></Dialog.Close>
            </div>

            {selectedUser && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-2xl flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold">
                    {(selectedUser.firstName || selectedUser.first_name || selectedUser.email?.[0] || '?').substring(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-lg font-medium text-gray-900">{getUserFirstName(selectedUser)} {getUserLastName(selectedUser)}</div>
                    <div className="text-gray-500">{selectedUser.email}</div>
                    <div className="text-xs text-gray-400 uppercase mt-1">{selectedUser.role}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Kullanıcı Adı</div>
                    <div className="font-medium">{getUserUsername(selectedUser) || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Durum</div>
                    <div className="font-medium"><StatusBadge active={getUserIsActive(selectedUser)} /></div>
                  </div>
                  <div>
                    <div className="text-gray-500">Son Giriş</div>
                    <div className="font-medium">{getUserLastLogin(selectedUser) ? new Date(getUserLastLogin(selectedUser)).toLocaleString('tr-TR') : '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Oluşturulma</div>
                    <div className="font-medium">{getUserCreatedAt(selectedUser) ? new Date(getUserCreatedAt(selectedUser)).toLocaleString('tr-TR') : '-'}</div>
                  </div>
                  {getUserTenantName(selectedUser) && (
                    <div className="col-span-2">
                      <div className="text-gray-500">Abone (Tenant)</div>
                      <div className="font-medium">{getUserTenantName(selectedUser)}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* --- CONFIRM MODAL --- */}
      <Dialog.Root open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40" />
          <Dialog.Content className="fixed left-[50%] top-[50%] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white p-6 shadow-xl z-50">
            <div className="flex items-center mb-4 text-amber-500">
              <ExclamationTriangleIcon className="h-6 w-6 mr-2" />
              <Dialog.Title className="text-xl font-bold text-gray-900">Durum Değişikliği</Dialog.Title>
            </div>
            <div className="mb-6 text-gray-600">
              Kullanıcı durumunu değiştirmek üzeresiniz. Emin misiniz?
            </div>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setConfirmModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50">İptal</button>
              <button onClick={confirmStatusToggle} disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">
                {isSubmitting ? 'İşleniyor...' : 'Onayla'}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

    </div>
  );
};

export default Users;
