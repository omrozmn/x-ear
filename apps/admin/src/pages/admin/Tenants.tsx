import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { PlusIcon, MagnifyingGlassIcon, CheckIcon, XMarkIcon, ExclamationTriangleIcon, PencilIcon } from '@heroicons/react/24/outline';
import * as Dialog from '@radix-ui/react-dialog';
import toast from 'react-hot-toast';

import {
  useGetAdminTenants,
  useCreateTenant,
  useUpdateTenant,
  useUpdateTenantStatus,
  Tenant
} from '@/lib/api-client';
import Pagination from '@/components/ui/Pagination';

const Tenants: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [viewingTenant, setViewingTenant] = useState<Tenant | null>(null);
  const [statusToChange, setStatusToChange] = useState<{ id: string, status: string } | null>(null);

  const [editFormData, setEditFormData] = useState({
    name: '',
    slug: '',
    owner_email: ''
  });
  const [createFormData, setCreateFormData] = useState({
    name: '',
    slug: '',
    owner_email: '',
    password: ''
  });
  const queryClient = useQueryClient();

  // Fetch tenants
  // Fetch tenants
  const { data: tenantsData, isLoading, error } = useGetAdminTenants({
    page,
    limit,
    search: searchTerm || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined
  });

  const data = tenantsData?.data;
  const tenants = data?.tenants || [];
  const pagination = data?.pagination;

  // Mutations
  const { mutateAsync: updateTenantStatus } = useUpdateTenantStatus();
  const { mutateAsync: createTenant } = useCreateTenant();
  const { mutateAsync: updateTenant } = useUpdateTenant();

  const handleStatusChangeClick = (tenantId: string, newStatus: string) => {
    setStatusToChange({ id: tenantId, status: newStatus });
    setIsStatusModalOpen(true);
  };

  const confirmStatusChange = async () => {
    if (statusToChange) {
      try {
        await updateTenantStatus({ id: statusToChange.id, data: { status: statusToChange.status } });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/tenants'] });
        toast.success('Tenant status updated successfully');
        setIsStatusModalOpen(false);
      } catch (error: any) {
        toast.error(error.response?.data?.error?.message || 'Failed to update status');
      }
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // @ts-ignore - password field might not be in generated type but backend accepts it
      await createTenant({ data: createFormData });
      toast.success('Kiracı oluşturuldu');
      setIsCreateModalOpen(false);
      setCreateFormData({ name: '', slug: '', owner_email: '', password: '' });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tenants'] });
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Kiracı oluşturulamadı');
    }
  };

  const handleViewTenant = (tenant: Tenant) => {
    setViewingTenant(tenant);
    setIsViewModalOpen(true);
  };

  const handleEditTenant = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setEditFormData({
      name: tenant.name || '',
      slug: tenant.slug || '',
      owner_email: tenant.owner_email || ''
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;

    try {
      await updateTenant({
        id: editingTenant.id!,
        data: {
          name: editFormData.name,
          slug: editFormData.slug,
          owner_email: editFormData.owner_email
        }
      });
      toast.success('Kiracı güncellendi');
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tenants'] });
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Güncelleme başarısız');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      trial: 'bg-blue-100 text-blue-800'
    };

    const statusLabels = {
      active: 'Aktif',
      suspended: 'Askıya Alınmış',
      cancelled: 'İptal Edilmiş',
      trial: 'Deneme'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800'}`}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </span>
    );
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Kiracılar</h1>
            <p className="mt-1 text-sm text-gray-500">
              Kiracı organizasyonlarını ve ayarlarını yönetin
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Kiracı Ekle
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Kiracı ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="active">Aktif</option>
              <option value="trial">Deneme</option>
              <option value="suspended">Askıya Alınmış</option>
              <option value="cancelled">İptal Edilmiş</option>
            </select>

            {/* Results count */}
            <div className="flex items-center text-sm text-gray-500">
              {pagination && (
                <span>
                  {pagination.total} sonuçtan {((page - 1) * limit) + 1}-{Math.min(page * limit, pagination.total || 0)} arası gösteriliyor
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tenants Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-500">Loading tenants...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center">
              <p className="text-red-600">Failed to load tenants</p>
              <button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/tenants'] })}
                className="mt-2 text-sm text-primary-600 hover:text-primary-500"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Organizasyon
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kullanıcılar
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
                  {tenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {tenant.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {tenant.slug}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(tenant.status || 'active')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tenant.current_plan || 'No Plan'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {tenant.current_users || 0} / {tenant.max_users || '∞'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tenant.created_at ? new Date(tenant.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleViewTenant(tenant)}
                            className="text-primary-600 hover:text-primary-900"
                            title="Görüntüle"
                          >
                            <MagnifyingGlassIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditTenant(tenant)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Düzenle"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          {tenant.status === 'active' && (
                            <button
                              onClick={() => handleStatusChangeClick(tenant.id!, 'suspended')}
                              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-yellow-700 bg-yellow-100 hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                              title="Askıya Al"
                            >
                              Pasife Al
                            </button>
                          )}
                          {tenant.status === 'suspended' && (
                            <button
                              onClick={() => handleStatusChangeClick(tenant.id!, 'active')}
                              className="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                              title="Aktifleştir"
                            >
                              Aktifleştir
                            </button>
                          )}
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
      </div>

      <Dialog.Root open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-40" />
          <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none data-[state=open]:animate-contentShow z-50">
            <Dialog.Title className="text-xl font-medium text-gray-900 mb-4">
              Kiracı Düzenle
            </Dialog.Title>
            <form onSubmit={handleUpdateTenant} className="space-y-4">
              <div>
                <label htmlFor="tenant-name" className="block text-sm font-medium text-gray-700">Organizasyon Adı</label>
                <input
                  id="tenant-name"
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="tenant-slug" className="block text-sm font-medium text-gray-700">Slug (URL)</label>
                <input
                  id="tenant-slug"
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                  value={editFormData.slug}
                  onChange={(e) => setEditFormData({ ...editFormData, slug: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="tenant-email" className="block text-sm font-medium text-gray-700">Yönetici Email</label>
                <input
                  id="tenant-email"
                  type="email"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                  value={editFormData.owner_email}
                  onChange={(e) => setEditFormData({ ...editFormData, owner_email: e.target.value })}
                />
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  >
                    İptal
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  Güncelle
                </button>
              </div>
            </form>
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

      {/* Create Tenant Modal */}
      <Dialog.Root open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-40" />
          <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none data-[state=open]:animate-contentShow z-50">
            <Dialog.Title className="text-xl font-medium text-gray-900 mb-4">
              Yeni Kiracı Ekle
            </Dialog.Title>
            <form onSubmit={handleCreateTenant} className="space-y-4">
              <div>
                <label htmlFor="create-name" className="block text-sm font-medium text-gray-700">Organizasyon Adı</label>
                <input
                  id="create-name"
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                  value={createFormData.name}
                  onChange={(e) => setCreateFormData({ ...createFormData, name: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="create-slug" className="block text-sm font-medium text-gray-700">Slug (URL)</label>
                <input
                  id="create-slug"
                  type="text"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                  value={createFormData.slug}
                  onChange={(e) => setCreateFormData({ ...createFormData, slug: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="create-email" className="block text-sm font-medium text-gray-700">Yönetici Email</label>
                <input
                  id="create-email"
                  type="email"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                  value={createFormData.owner_email}
                  onChange={(e) => setCreateFormData({ ...createFormData, owner_email: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="create-password" className="block text-sm font-medium text-gray-700">Yönetici Şifresi</label>
                <input
                  id="create-password"
                  type="password"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border p-2"
                  value={createFormData.password}
                  onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
                />
              </div>
              <div className="mt-6 flex justify-end space-x-3">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  >
                    İptal
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  Oluştur
                </button>
              </div>
            </form>
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

      {/* View Tenant Modal */}
      <Dialog.Root open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-40" />
          <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none data-[state=open]:animate-contentShow z-50">
            <div className="flex items-center justify-between mb-4">
              <Dialog.Title className="text-xl font-medium text-gray-900">
                Kiracı Detayları
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="text-gray-400 hover:text-gray-500">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>
            {viewingTenant && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Organizasyon</label>
                    <div className="mt-1 text-sm text-gray-900">{viewingTenant.name}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Slug</label>
                    <div className="mt-1 text-sm text-gray-900">{viewingTenant.slug}</div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Yönetici Email</label>
                  <div className="mt-1 text-sm text-gray-900">{viewingTenant.owner_email || '-'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Durum</label>
                  <div className="mt-1">
                    {getStatusBadge(viewingTenant.status || 'active')}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Plan</label>
                    <div className="mt-1 text-sm text-gray-900">{viewingTenant.current_plan || 'Yok'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Kullanıcılar</label>
                    <div className="mt-1 text-sm text-gray-900">{viewingTenant.current_users || 0} / {viewingTenant.max_users || '∞'}</div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500">Oluşturulma Tarihi</label>
                  <div className="mt-1 text-sm text-gray-900">
                    {viewingTenant.created_at ? new Date(viewingTenant.created_at).toLocaleString('tr-TR') : '-'}
                  </div>
                </div>
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  Kapat
                </button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Status Confirmation Modal */}
      <Dialog.Root open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
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
              Bu kiracının durumunu <strong>{statusToChange?.status}</strong> olarak değiştirmek istediğinize emin misiniz?
            </div>
            <div className="flex justify-end space-x-3">
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  İptal
                </button>
              </Dialog.Close>
              <button
                onClick={confirmStatusChange}
                className="inline-flex justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Onayla
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
    </>
  );
};

export default Tenants;