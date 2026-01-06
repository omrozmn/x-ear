import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Search,
  UserPlus,
  User,
  X as XMarkIcon,
  AlertTriangle as ExclamationTriangleIcon
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import toast from 'react-hot-toast';

import {
  useGetAllTenantUsers,
  useCreateAdminUser,
  useUpdateAnyTenantUser,
} from '@/lib/api-client';

// Local type definitions (not exported from generated client)
type AdminUserRole = 'super_admin' | 'admin' | 'support' | 'tenant_admin' | 'user' | 'doctor' | 'secretary';
const AdminUserRoleValues = ['super_admin', 'admin', 'support', 'tenant_admin', 'user', 'doctor', 'secretary'];

interface AdminUser {
  id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  is_active?: boolean;
  last_login?: string;
  created_at?: string;
  tenant_id?: string;
  tenant_name?: string;
}
import Pagination from '@/components/ui/Pagination';
import { TenantAutocomplete } from '@/components/ui/TenantAutocomplete';

const Users: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [userToToggle, setUserToToggle] = useState<{ id: string, status: boolean } | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'support',
    password: '',
    user_type: 'admin',
    tenant_id: ''
  });

  const queryClient = useQueryClient();

  // Fetch users (All Tenant Users)
  const { data: usersData, isLoading, error } = useGetAllTenantUsers({
    page,
    limit,
    search: searchTerm || undefined
  });

  const users = (usersData as any)?.data?.users || (usersData as any)?.users || [];
  const pagination = (usersData as any)?.data?.pagination || (usersData as any)?.pagination;

  // Mutations
  const { mutateAsync: updateAnyTenantUser } = useUpdateAnyTenantUser();
  const { mutateAsync: createAdminUser } = useCreateAdminUser();

  const handleStatusToggleClick = (userId: string, currentStatus: boolean | undefined) => {
    setUserToToggle({ id: userId, status: !!currentStatus });
    setConfirmModalOpen(true);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const confirmStatusToggle = async () => {
    if (!userToToggle) return;

    const newStatus = !userToToggle.status;
    setIsSubmitting(true);

    try {
      await updateAnyTenantUser({ userId: userToToggle.id, data: { isActive: newStatus } });
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/users/all'] });
      toast.success('Kullanıcı durumu başarıyla güncellendi');
      setConfirmModalOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Durum güncellenirken hata oluştu');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddUser = () => {
    setFormData({
      email: '',
      first_name: '',
      last_name: '',
      role: 'support',
      password: '',
      user_type: 'admin',
      tenant_id: ''
    });
    setIsAddModalOpen(true);
  };

  const handleEditUser = (user: AdminUser) => {
    setSelectedUser(user);
    setFormData({
      email: user.email || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role: user.role || 'support',
      password: '',
      user_type: (user as any).tenant_id ? 'tenant' : 'admin',
      tenant_id: (user as any).tenant_id || ''
    });
    setIsEditModalOpen(true);
  };

  const handleViewUser = (user: AdminUser) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (formData.user_type === 'tenant' && !formData.tenant_id) {
      toast.error('Lütfen bir abone seçin');
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        ...formData,
        tenant_id: formData.user_type === 'tenant' ? formData.tenant_id : undefined
      };
      // @ts-ignore - payload type mismatch with generated type but backend accepts it
      await createAdminUser({ data: payload });
      toast.success('Kullanıcı oluşturuldu');
      setIsAddModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/users/all'] });
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Kullanıcı oluşturulamadı');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser?.id) return;
    setIsSubmitting(true);
    try {
      const updateData: any = {
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        role: formData.role
      };
      if (formData.password) {
        updateData.password = formData.password;
      }
      await updateAnyTenantUser({ userId: selectedUser.id, data: updateData });
      toast.success('Kullanıcı güncellendi');
      setIsEditModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['/api/admin/users/all'] });
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Kullanıcı güncellenemedi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (role: string | undefined) => {
    if (!role) return null;
    const roleClasses: Record<string, string> = {
      tenant_admin: 'bg-purple-100 text-purple-800',
      admin: 'bg-blue-100 text-blue-800',
      user: 'bg-green-100 text-green-800',
      doctor: 'bg-yellow-100 text-yellow-800',
      secretary: 'bg-pink-100 text-pink-800'
    };

    const roleLabels: Record<string, string> = {
      tenant_admin: 'Tenant Admin',
      admin: 'Yönetici',
      user: 'Kullanıcı',
      doctor: 'Doktor',
      secretary: 'Sekreter'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleClasses[role] || 'bg-gray-100 text-gray-800'}`}>
        {roleLabels[role] || role}
      </span>
    );
  };

  const getStatusBadge = (is_active: boolean | undefined) => {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
        {is_active ? 'Aktif' : 'Pasif'}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Kullanıcılar</h1>
          <p className="mt-1 text-sm text-gray-500">
            Sistem kullanıcılarını ve yetkilerini yönetin
          </p>
        </div>
        <button
          onClick={handleAddUser}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <UserPlus className="-ml-1 mr-2 h-5 w-5" />
          Kullanıcı Ekle
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Kullanıcı ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Tüm Roller</option>
            <option value="tenant_admin">Tenant Admin</option>
            <option value="admin">Yönetici (Şube)</option>
            <option value="user">Kullanıcı</option>
            <option value="doctor">Doktor</option>
            <option value="secretary">Sekreter</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
          </select>

          {/* Results count */}
          <div className="flex items-center text-sm text-gray-500">
            {pagination && (
              <span>
                {pagination.total} sonuçtan {((page - 1) * 10) + 1}-{Math.min(page * 10, pagination.total || 0)} arası gösteriliyor
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Kullanıcılar yükleniyor...</p>
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <p className="text-red-600">Kullanıcılar yüklenirken hata oluştu</p>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['getAdminUsers'] })}
              className="mt-2 text-sm text-blue-600 hover:text-blue-500"
            >
              Tekrar dene
            </button>
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kullanıcı
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Organizasyon
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Durum
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Son Giriş
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Oluşturulma
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <User className="h-6 w-6 text-gray-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {user.first_name && user.last_name
                              ? `${user.first_name} ${user.last_name}`
                              : user.email
                            }
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {(user as any).tenant_name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(user.is_active)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_login
                        ? new Date(user.last_login).toLocaleDateString('tr-TR')
                        : 'Hiç giriş yapmamış'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString('tr-TR') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleViewUser(user)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Görüntüle
                        </button>
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleStatusToggleClick(user.id!, user.is_active)}
                          className={`inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 ${user.is_active
                            ? "text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:ring-yellow-500"
                            : "text-green-700 bg-green-100 hover:bg-green-200 focus:ring-green-500"
                            }`}
                        >
                          {user.is_active ? 'Pasife Al' : 'Aktifleştir'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <Pagination
              currentPage={page}
              totalPages={pagination?.totalPages || 1}
              totalItems={pagination?.total || 0}
              itemsPerPage={limit}
              onPageChange={setPage}
              onItemsPerPageChange={setLimit}
            />
          </>
        )}
      </div>

      {/* Confirmation Modal */}
      <Dialog.Root open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-40" />
          <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none data-[state=open]:animate-contentShow z-50">
            <div className="flex items-center mb-4 text-amber-500">
              <ExclamationTriangleIcon className="h-6 w-6 mr-2" />
              <Dialog.Title className="text-xl font-medium text-gray-900">
                Durum Değişikliği
              </Dialog.Title>
            </div>
            <div className="mb-6 text-sm text-gray-500">
              Bu kullanıcının durumunu <strong>{userToToggle?.status ? 'Pasif' : 'Aktif'}</strong> olarak değiştirmek istediğinize emin misiniz?
            </div>
            <div className="flex justify-end space-x-3">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  İptal
                </button>
              </Dialog.Close>
              <button
                onClick={confirmStatusToggle}
                disabled={isSubmitting}
                className={`inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${userToToggle?.status ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'}`}
              >
                {isSubmitting ? 'Güncelleniyor...' : (userToToggle?.status ? 'Pasifleştir' : 'Aktifleştir')}
              </button>
            </div>
            <Dialog.Close asChild>
              <button
                className="absolute top-[10px] right-[10px] inline-flex h-[25px] w-[25px] appearance-none items-center justify-center rounded-full focus:shadow-[0_0_0_2px] focus:outline-none"
                aria-label="Close"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Add User Modal */}
      <Dialog.Root open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-40" />
          <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none data-[state=open]:animate-contentShow z-50">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-xl font-medium text-gray-900">
                Yeni Kullanıcı Ekle
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-gray-400 hover:text-gray-500">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>
            <form onSubmit={handleCreateUserSubmit} className="space-y-4">

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Kullanıcı Tipi</label>
                <div className="flex space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio text-blue-600"
                      name="user_type"
                      value="admin"
                      checked={formData.user_type === 'admin'}
                      onChange={(e) => setFormData({ ...formData, user_type: e.target.value })}
                    />
                    <span className="ml-2">Admin Personeli</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio text-blue-600"
                      name="user_type"
                      value="tenant"
                      checked={formData.user_type === 'tenant'}
                      onChange={(e) => setFormData({ ...formData, user_type: e.target.value })}
                    />
                    <span className="ml-2">Abone Kullanıcısı</span>
                  </label>
                </div>
              </div>

              {formData.user_type === 'tenant' && (
                <div className="mb-4">
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
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Soyisim</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Rol</label>
                <select
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  {AdminUserRoleValues.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Şifre</label>
                <input
                  type="password"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    İptal
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Oluşturuluyor...' : 'Oluştur'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Edit User Modal */}
      <Dialog.Root open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-40" />
          <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none data-[state=open]:animate-contentShow z-50">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-xl font-medium text-gray-900">
                Kullanıcı Düzenle
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-gray-400 hover:text-gray-500">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>
            <form onSubmit={handleUpdateUserSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">İsim</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Soyisim</label>
                  <input
                    type="text"
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input
                  type="email"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Rol</label>
                <select
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                >
                  {AdminUserRoleValues.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Yeni Şifre (Opsiyonel)</label>
                <input
                  type="password"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Değiştirmek için girin"
                />
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    İptal
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Güncelleniyor...' : 'Güncelle'}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* View User Modal */}
      <Dialog.Root open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-40" />
          <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none data-[state=open]:animate-contentShow z-50">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-xl font-medium text-gray-900">
                Kullanıcı Detayları
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-gray-400 hover:text-gray-500">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>
            {selectedUser && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">İsim</label>
                    <div className="mt-1 text-sm text-gray-900">{selectedUser.first_name} {selectedUser.last_name}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Rol</label>
                    <div className="mt-1 text-sm text-gray-900">{selectedUser.role}</div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Email</label>
                  <div className="mt-1 text-sm text-gray-900">{selectedUser.email}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Durum</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedUser.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {selectedUser.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Son Giriş</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleString('tr-TR') : '-'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Oluşturulma Tarihi</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleString('tr-TR') : '-'}
                  </div>
                </div>
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  Kapat
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
};

export default Users;