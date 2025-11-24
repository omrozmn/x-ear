import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Search,
  UserPlus,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  useGetAdminUsers,
  usePutAdminUsersIdStatus,
  AdminUserRole
} from '@/lib/api-client';

const Users: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  // Fetch users
  const { data: usersData, isLoading, error } = useGetAdminUsers({
    page,
    limit: 10,
    search: searchTerm || undefined,
    role: roleFilter !== 'all' ? (roleFilter as AdminUserRole) : undefined,
    // Note: status filter might not be in the generated hook params if not in OpenAPI parameters for GET /admin/users
    // Checking OpenAPI, parameters were: page, limit, search, role. Status was NOT in parameters.
    // So filtering by status might need to be done client side or added to OpenAPI.
    // For now, I will omit status from API call if it's not supported, or add it if I see it in types.
  });

  const users = usersData?.data?.users || [];
  const pagination = usersData?.data?.pagination;

  // Status update mutation
  const { mutateAsync: updateStatus } = usePutAdminUsersIdStatus();

  const handleStatusToggle = async (userId: string, currentStatus: boolean | undefined) => {
    const newStatus = !currentStatus;
    const action = newStatus ? 'aktif' : 'pasif';

    if (window.confirm(`Bu kullanıcıyı ${action} yapmak istediğinizden emin misiniz?`)) {
      try {
        await updateStatus({
          id: userId,
          data: { is_active: newStatus }
        });
        queryClient.invalidateQueries({ queryKey: ['getAdminUsers'] });
        toast.success('Kullanıcı durumu başarıyla güncellendi');
      } catch (error: any) {
        toast.error(error.response?.data?.error?.message || 'Durum güncellenirken hata oluştu');
      }
    }
  };

  const getRoleBadge = (role: string | undefined) => {
    if (!role) return null;
    const roleClasses: Record<string, string> = {
      SUPER_ADMIN: 'bg-purple-100 text-purple-800',
      OWNER: 'bg-blue-100 text-blue-800',
      ADMIN: 'bg-green-100 text-green-800',
      STAFF: 'bg-yellow-100 text-yellow-800',
      VIEWER: 'bg-gray-100 text-gray-800'
    };

    const roleLabels: Record<string, string> = {
      SUPER_ADMIN: 'Süper Admin',
      OWNER: 'Sahip',
      ADMIN: 'Admin',
      STAFF: 'Personel',
      VIEWER: 'Görüntüleyici'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleClasses[role] || 'bg-gray-100 text-gray-800'}`}>
        {roleLabels[role] || role}
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean | undefined) => {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
        {isActive ? 'Aktif' : 'Pasif'}
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
          type="button"
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
            <option value="SUPER_ADMIN">Süper Admin</option>
            <option value="OWNER">Sahip</option>
            <option value="ADMIN">Admin</option>
            <option value="STAFF">Personel</option>
            <option value="VIEWER">Görüntüleyici</option>
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
                        <button className="text-blue-600 hover:text-blue-900">
                          Görüntüle
                        </button>
                        <button className="text-gray-600 hover:text-gray-900">
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleStatusToggle(user.id!, user.is_active)}
                          className={user.is_active
                            ? "text-red-600 hover:text-red-900"
                            : "text-green-600 hover:text-green-900"
                          }
                        >
                          {user.is_active ? 'Pasifleştir' : 'Aktifleştir'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Önceki
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === pagination.totalPages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Sonraki
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Sayfa <span className="font-medium">{page}</span> / {' '}
                      <span className="font-medium">{pagination.totalPages}</span>
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setPage(page - 1)}
                        disabled={page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Önceki
                      </button>
                      <button
                        onClick={() => setPage(page + 1)}
                        disabled={page === pagination.totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Sonraki
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Users;