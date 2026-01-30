import React, { useState, useEffect } from 'react';
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
  Trash2
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import toast from 'react-hot-toast';

import {
  useListAdminUserAll,
  useCreateAdminUsers,
  useUpdateAdminUserAll,
  useListAdminUsers, // System admins
} from '@/lib/api-client';
import Pagination from '@/components/ui/Pagination';
import { TenantAutocomplete } from '@/components/ui/TenantAutocomplete';
import { UserRead } from '@/api/generated/schemas';

// Local type definitions to handle the mix of generated types and manual needs
type AdminUserRole = 'super_admin' | 'admin' | 'support' | 'tenant_admin' | 'user' | 'doctor' | 'secretary';
const AdminUserRoleValues = ['super_admin', 'admin', 'support', 'tenant_admin', 'user', 'doctor', 'secretary'];

interface ExtendedUser extends UserRead {
  // Add compatible fields for display
  tenantName?: string;
  tenant_name?: string;
  // Allow for snake_case variants if they come from raw API
  first_name?: string;
  last_name?: string;
  last_login?: string;
  created_at?: string;
}

export const Users: React.FC = () => {
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
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    first_name: '',
    last_name: '',
    role: 'support',
    password: '',
    user_type: 'admin', // 'admin' | 'tenant'
    tenant_id: ''
  });

  // --- Data Fetching ---

  // 1. Fetch System Admins (Paginated on Backend)
  const { data: adminUsersData, isLoading: loadingAdmins, error: adminError } = useListAdminUsers({
    page: adminPage,
    limit: adminLimit,
    search: searchTerm || undefined
  }, { query: { enabled: activeTab === 'admin' } });

  // 2. Fetch All Tenant Users (Not Paginated on Backend, Client-side pagination needed)
  const { data: tenantUsersData, isLoading: loadingTenants, error: tenantError } = useListAdminUserAll({
    search: searchTerm || undefined
  }, { query: { enabled: activeTab === 'tenant' } });

  // --- Derived Data ---

  // Admin Users List
  const adminUsersList = ((adminUsersData as any)?.users || (adminUsersData as any)?.data?.users || []) as ExtendedUser[];
  const adminPagination = (adminUsersData as any)?.pagination || (adminUsersData as any)?.data?.pagination;

  // Tenant Users List (Client-side filtering & pagination)
  const rawTenantUsers = ((tenantUsersData as any)?.users || (tenantUsersData as any)?.data?.users || []) as ExtendedUser[];

  // Filter Tenant Users (Role/Status)
  const filteredTenantUsers = rawTenantUsers.filter(user => {
    if (roleFilter !== 'all' && user.role !== roleFilter) return false;
    if (statusFilter !== 'all') {
      const isActive = user.isActive ?? (user as any).is_active;
      if (statusFilter === 'active' && !isActive) return false;
      if (statusFilter === 'inactive' && isActive) return false;
    }
    return true;
  });

  // Client-Side Pagination for Tenant Users
  const tenantTotalItems = filteredTenantUsers.length;
  const tenantTotalPages = Math.ceil(tenantTotalItems / tenantLimit);
  const paginatedTenantUsers = filteredTenantUsers.slice(
    (tenantPage - 1) * tenantLimit,
    tenantPage * tenantLimit
  );

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
    setFormData({
      email: '',
      username: '',
      first_name: '',
      last_name: '',
      role: activeTab === 'admin' ? 'support' : 'user',
      password: '',
      user_type: activeTab === 'tenant' ? 'tenant' : 'admin',
      tenant_id: ''
    });
    setIsAddModalOpen(true);
  };

  const handleEditClick = (user: ExtendedUser) => {
    setSelectedUser(user);
    const tenantId = user.tenantId || (user as any).tenant_id || '';

    setFormData({
      email: user.email || '',
      username: (user as any).username || '',
      first_name: user.firstName || user.first_name || '',
      last_name: user.lastName || user.last_name || '',
      role: user.role || 'user',
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

  const { mutateAsync: createAdminUser } = useCreateAdminUsers();
  const { mutateAsync: updateAnyTenantUser } = useUpdateAdminUserAll();

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (formData.user_type === 'tenant' && !formData.tenant_id) {
      toast.error('Lütfen bir abone seçin');
      setIsSubmitting(false);
      return;
    }

    try {
      // Construct payload with explicit snake_case keys
      const payload: any = {
        email: formData.email,
        password: formData.password,
        username: formData.username,
        first_name: formData.first_name,
        last_name: formData.last_name,
        role: formData.role,
        is_active: true
      };

      if (formData.user_type === 'tenant') {
        payload.tenant_id = formData.tenant_id;
      }

      // @ts-ignore: generated type might vary
      await createAdminUser({ data: payload });

      toast.success(`Kullanıcı başarıyla oluşturuldu`);
      setIsAddModalOpen(false);

      // Invalidate both queries to be safe
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/all'] });

    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Kullanıcı oluşturulamadı');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser?.id) return;
    setIsSubmitting(true);

    try {
      const payload: any = {
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
        userId: selectedUser.id,
        data: payload
      });

      toast.success('Kullanıcı güncellendi');
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/all'] });

    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Güncelleme başarısız');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusToggleClick = (user: ExtendedUser) => {
    setUserToToggle({
      id: user.id!,
      status: !!(user.isActive ?? (user as any).is_active)
    });
    setConfirmModalOpen(true);
  };

  const confirmStatusToggle = async () => {
    if (!userToToggle) return;
    setIsSubmitting(true);
    try {
      await updateAnyTenantUser({
        userId: userToToggle.id,
        data: { is_active: !userToToggle.status } as any
      });
      toast.success(`Kullanıcı ${!userToToggle.status ? 'aktif' : 'pasif'} duruma getirildi`);
      setConfirmModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/all'] });
    } catch (err: any) {
      toast.error('Durum değiştirilemedi');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Components ---

  const RoleBadge = ({ role }: { role?: string }) => {
    const colors: any = {
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

  const renderTable = (users: ExtendedUser[], isTenantTab: boolean) => (
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kullanıcı</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
          {isTenantTab && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>}
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Son Giriş</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Oluşturulma</th>
          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {users.length === 0 ? (
          <tr><td colSpan={7} className="px-6 py-4 text-center text-gray-500">Kayıt bulunamadı</td></tr>
        ) : users.map(user => {
          const firstName = user.firstName || user.first_name || '';
          const lastName = user.lastName || user.last_name || '';
          const fullName = `${firstName} ${lastName}`.trim() || user.email;
          const isActive = user.isActive ?? (user as any).is_active;
          const lastLogin = user.lastLogin || (user as any).last_login;
          const createdAt = user.createdAt || (user as any).created_at;

          return (
            <tr key={user.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold">
                    {fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">{fullName}</div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                    <div className="text-xs text-gray-400">{(user as any).username}</div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap"><RoleBadge role={user.role as string} /></td>
              {isTenantTab && <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.tenantName || (user as any).tenant_name || '-'}</td>}
              <td className="px-6 py-4 whitespace-nowrap"><StatusBadge active={isActive} /></td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{lastLogin ? new Date(lastLogin).toLocaleDateString('tr-TR') : '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{createdAt ? new Date(createdAt).toLocaleDateString('tr-TR') : '-'}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end space-x-2">
                  <button onClick={() => handleViewClick(user)} className="text-blue-600 hover:text-blue-900 p-1" title="Görüntüle"><Eye className="h-4 w-4" /></button>
                  <button onClick={() => handleEditClick(user)} className="text-indigo-600 hover:text-indigo-900 p-1" title="Düzenle"><Edit className="h-4 w-4" /></button>
                  <button onClick={() => handleStatusToggleClick(user)} className={`${isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'} p-1`} title={isActive ? 'Pasife Al' : 'Aktifleştir'}>
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Kullanıcı Yönetimi</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sistem yöneticilerini ve abone kullanıcılarını buradan yönetebilirsiniz.
          </p>
        </div>
        <button
          onClick={handleAddClick}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <UserPlus className="-ml-1 mr-2 h-5 w-5" />
          Kullanıcı Ekle
        </button>
      </div>

      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="flex border-b border-gray-200 mb-6">
          <Tabs.Trigger value="admin" className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === 'admin' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            Sistem Yöneticileri (Admin)
          </Tabs.Trigger>
          <Tabs.Trigger value="tenant" className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === 'tenant' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            Abone Kullanıcıları (Tenant)
          </Tabs.Trigger>
        </Tabs.List>

        {/* Filters Area */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-5 w-5 text-gray-400" /></div>
              <input
                type="text"
                placeholder="Arama yapın..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            {activeTab === 'tenant' && (
              <>
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="block w-full pl-3 pr-10 py-2 border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                  <option value="all">Tüm Roller</option>
                  <option value="tenant_admin">Yönetici</option>
                  <option value="user">Kullanıcı</option>
                </select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="block w-full pl-3 pr-10 py-2 border border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                  <option value="all">Tüm Durumlar</option>
                  <option value="active">Aktif</option>
                  <option value="inactive">Pasif</option>
                </select>
              </>
            )}
          </div>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <Tabs.Content value="admin">
            {loadingAdmins ? (
              <div className="p-12 text-center text-gray-500">Yükleniyor...</div>
            ) : adminError ? (
              <div className="p-12 text-center text-red-500">Hata oluştu.</div>
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
              <div className="p-12 text-center text-gray-500">Yükleniyor...</div>
            ) : tenantError ? (
              <div className="p-12 text-center text-red-500">Hata oluştu.</div>
            ) : (
              <>
                {renderTable(paginatedTenantUsers, true)}
                {tenantTotalItems > 0 && (
                  <Pagination
                    currentPage={tenantPage}
                    totalPages={tenantTotalPages}
                    totalItems={tenantTotalItems}
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
          <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-6 shadow-xl z-50 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <Dialog.Title className="text-lg font-bold">Yeni Kullanıcı Ekle</Dialog.Title>
              <Dialog.Close className="text-gray-400 hover:text-gray-600"><XMarkIcon className="h-6 w-6" /></Dialog.Close>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              {/* User Type Selection */}
              <div className="bg-gray-50 p-3 rounded-md">
                <label className="block text-sm font-medium text-gray-700 mb-2">Kullanıcı Tipi</label>
                <div className="flex space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="user_type" value="admin" checked={formData.user_type === 'admin'} onChange={e => setFormData({ ...formData, user_type: e.target.value })} className="text-blue-600 focus:ring-blue-500" />
                    <span>Sistem Yöneticisi</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" name="user_type" value="tenant" checked={formData.user_type === 'tenant'} onChange={e => setFormData({ ...formData, user_type: e.target.value })} className="text-blue-600 focus:ring-blue-500" />
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
                  <input type="text" required value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Soyisim</label>
                  <input type="text" required value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Kullanıcı Adı</label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input type="text" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-l-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 border" placeholder="Otomatik oluşturabilir veya elle girebilirsiniz" />
                  <button type="button" onClick={generateUsername} className="inline-flex items-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-500 text-sm hover:bg-gray-100">
                    <RefreshCw className="h-4 w-4 mr-1" /> Oluştur
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">E-posta</label>
                <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Şifre</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input type={showPassword ? "text" : "password"} required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="focus:ring-blue-500 focus:border-blue-500 block w-full pr-10 sm:text-sm border-gray-300 rounded-md p-2 border" />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Rol</label>
                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border">
                  {AdminUserRoleValues.map(role => <option key={role} value={role}>{role}</option>)}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">İptal</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
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
          <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[600px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-6 shadow-xl z-50 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <Dialog.Title className="text-lg font-bold">Kullanıcı Düzenle</Dialog.Title>
              <Dialog.Close className="text-gray-400 hover:text-gray-600"><XMarkIcon className="h-6 w-6" /></Dialog.Close>
            </div>

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">İsim</label>
                  <input type="text" required value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Soyisim</label>
                  <input type="text" required value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Kullanıcı Adı</label>
                <input type="text" disabled value={formData.username} className="mt-1 block w-full bg-gray-100 border border-gray-300 rounded-md shadow-sm p-2 sm:text-sm text-gray-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">E-posta</label>
                <input type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Şifre (Değiştirmek istemiyorsanız boş bırakın)</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input type={showPassword ? "text" : "password"} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="focus:ring-blue-500 focus:border-blue-500 block w-full pr-10 sm:text-sm border-gray-300 rounded-md p-2 border" placeholder="Değiştirilmeyecek" />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4 text-gray-400" /> : <Eye className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Rol</label>
                <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border">
                  {AdminUserRoleValues.map(role => <option key={role} value={role}>{role}</option>)}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t mt-4">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">İptal</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
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
          <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-6 shadow-xl z-50">
            <div className="flex justify-between items-center mb-4">
              <Dialog.Title className="text-lg font-bold">Kullanıcı Detayları</Dialog.Title>
              <Dialog.Close className="text-gray-400 hover:text-gray-600"><XMarkIcon className="h-6 w-6" /></Dialog.Close>
            </div>

            {selectedUser && (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg flex items-center space-x-4">
                  <div className="h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold">
                    {(selectedUser.firstName || selectedUser.first_name || selectedUser.email?.[0] || '?').substring(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-lg font-medium text-gray-900">{selectedUser.firstName || selectedUser.first_name} {selectedUser.lastName || selectedUser.last_name}</div>
                    <div className="text-gray-500">{selectedUser.email}</div>
                    <div className="text-xs text-gray-400 uppercase mt-1">{selectedUser.role}</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Kullanıcı Adı</div>
                    <div className="font-medium">{(selectedUser as any).username || '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Durum</div>
                    <div className="font-medium"><StatusBadge active={selectedUser.isActive ?? (selectedUser as any).is_active} /></div>
                  </div>
                  <div>
                    <div className="text-gray-500">Son Giriş</div>
                    <div className="font-medium">{(selectedUser.lastLogin || (selectedUser as any).last_login) ? new Date(selectedUser.lastLogin || (selectedUser as any).last_login).toLocaleString('tr-TR') : '-'}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Oluşturulma</div>
                    <div className="font-medium">{(selectedUser.createdAt || (selectedUser as any).created_at) ? new Date(selectedUser.createdAt || (selectedUser as any).created_at).toLocaleString('tr-TR') : '-'}</div>
                  </div>
                  {(selectedUser.tenantName || (selectedUser as any).tenant_name) && (
                    <div className="col-span-2">
                      <div className="text-gray-500">Abone (Tenant)</div>
                      <div className="font-medium">{selectedUser.tenantName || (selectedUser as any).tenant_name}</div>
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
          <Dialog.Content className="fixed left-[50%] top-[50%] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white p-6 shadow-xl z-50">
            <div className="flex items-center mb-4 text-amber-500">
              <ExclamationTriangleIcon className="h-6 w-6 mr-2" />
              <Dialog.Title className="text-xl font-bold text-gray-900">Durum Değişikliği</Dialog.Title>
            </div>
            <div className="mb-6 text-gray-600">
              Kullanıcı durumunu değiştirmek üzeresiniz. Emin misiniz?
            </div>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setConfirmModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">İptal</button>
              <button onClick={confirmStatusToggle} disabled={isSubmitting} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
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