import React, { useState } from 'react';
import {
  useListAdminSuppliers,
  useCreateAdminSupplier,
  useUpdateAdminSupplier,
  useDeleteAdminSupplier,
  useListAdminTenants,
  SupplierCreate,
  SupplierListResponse,
  SupplierRead,
  SupplierUpdate,
} from '@/lib/api-client';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminResponsive } from '@/hooks';
import { ResponsiveTable } from '@/components/responsive';

type SupplierFilterStatus = 'active' | 'inactive' | 'all';
type SupplierStatus = Exclude<SupplierFilterStatus, 'all'>;
type UnknownRecord = Record<string, unknown>;

interface TenantOption {
  id: string;
  name: string;
}

interface SupplierFormData {
  tenantId: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  taxNumber: string;
  taxOffice: string;
  status: SupplierStatus;
}

interface SupplierPagination {
  total: number;
  totalPages: number;
}

const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null;

const getString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() !== '' ? value : undefined;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (!isRecord(error)) {
    return fallback;
  }

  const directMessage = getString(error.message);
  if (directMessage) {
    return directMessage;
  }

  const response = isRecord(error.response) ? error.response : undefined;
  const responseData = response && isRecord(response.data) ? response.data : undefined;
  const nestedError = responseData && isRecord(responseData.error) ? responseData.error : undefined;
  const nestedMessage = nestedError ? getString(nestedError.message) : undefined;

  return nestedMessage ?? fallback;
};

const isSupplierFilterStatus = (value: string): value is SupplierFilterStatus =>
  ['active', 'inactive', 'all'].includes(value);

const getTenants = (value: unknown): TenantOption[] => {
  if (!isRecord(value)) {
    return [];
  }

  const candidate = Array.isArray(value.data)
    ? value.data
    : isRecord(value.data) && Array.isArray(value.data.tenants)
      ? value.data.tenants
      : Array.isArray(value.tenants)
        ? value.tenants
        : [];

  return candidate
    .filter(isRecord)
    .map((tenant) => {
      const id = getString(tenant.id);
      const name = getString(tenant.name);

      if (!id || !name) {
        return null;
      }

      return { id, name };
    })
    .filter((tenant): tenant is TenantOption => tenant !== null);
};

const normalizeSupplier = (value: unknown): SupplierRead | null => {
  if (!isRecord(value)) {
    return null;
  }

  const id = value.id;
  const companyName = getString(value.companyName);
  const tenantId = getString(value.tenantId);
  const name = getString(value.name) ?? companyName;

  if ((typeof id !== 'string' && typeof id !== 'number') || !companyName || !tenantId || !name) {
    return null;
  }

  return {
    ...value,
    id,
    companyName,
    tenantId,
    name,
    companyCode: getString(value.companyCode) ?? null,
    contactPerson: getString(value.contactPerson) ?? null,
    email: getString(value.email) ?? null,
    phone: getString(value.phone) ?? null,
    mobile: getString(value.mobile) ?? null,
    fax: getString(value.fax) ?? null,
    website: getString(value.website) ?? null,
    address: getString(value.address) ?? null,
    city: getString(value.city) ?? null,
    country: getString(value.country) ?? null,
    postalCode: getString(value.postalCode) ?? null,
    taxNumber: getString(value.taxNumber) ?? null,
    taxOffice: getString(value.taxOffice) ?? null,
    paymentTerms: getString(value.paymentTerms) ?? null,
    currency: getString(value.currency) ?? null,
    rating: typeof value.rating === 'number' ? value.rating : null,
    isActive: typeof value.isActive === 'boolean' ? value.isActive : undefined,
    notes: getString(value.notes) ?? null,
    createdAt: getString(value.createdAt) ?? null,
    updatedAt: getString(value.updatedAt) ?? null,
    productCount: typeof value.productCount === 'number' ? value.productCount : undefined,
    totalPurchases: typeof value.totalPurchases === 'number' ? value.totalPurchases : undefined,
  };
};

const getSuppliers = (response: SupplierListResponse | undefined): SupplierRead[] => {
  const candidate = Array.isArray(response?.data)
    ? response.data
    : isRecord(response?.data) && Array.isArray(response.data.suppliers)
      ? response.data.suppliers
      : [];

  return candidate
    .map(normalizeSupplier)
    .filter((supplier): supplier is SupplierRead => supplier !== null);
};

const getPagination = (response: SupplierListResponse | undefined): SupplierPagination | null => {
  const responseMeta = response?.meta;
  const nestedPagination =
    isRecord(response?.data) && isRecord(response.data.pagination) ? response.data.pagination : undefined;
  const source = nestedPagination ?? responseMeta;

  if (!source || !isRecord(source)) {
    return null;
  }

  const total = typeof source.total === 'number' ? source.total : 0;
  const totalPages = typeof source.totalPages === 'number' ? source.totalPages : 1;

  return { total, totalPages };
};

const emptyToNull = (value: string): string | null => {
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const buildSupplierPayload = (data: SupplierFormData): SupplierCreate => ({
  tenantId: data.tenantId,
  companyName: data.companyName.trim(),
  contactPerson: emptyToNull(data.contactName),
  email: emptyToNull(data.email),
  phone: emptyToNull(data.phone),
  address: emptyToNull(data.address),
  taxNumber: emptyToNull(data.taxNumber),
  taxOffice: emptyToNull(data.taxOffice),
  isActive: data.status === 'active',
});

const buildSupplierUpdatePayload = (data: SupplierFormData): SupplierUpdate => ({
  tenantId: data.tenantId,
  companyName: data.companyName.trim(),
  contactPerson: emptyToNull(data.contactName),
  email: emptyToNull(data.email),
  phone: emptyToNull(data.phone),
  address: emptyToNull(data.address),
  taxNumber: emptyToNull(data.taxNumber),
  taxOffice: emptyToNull(data.taxOffice),
  isActive: data.status === 'active',
});

const getInitialFormData = (supplier: SupplierRead | null): SupplierFormData => ({
  tenantId: supplier?.tenantId ?? '',
  companyName: supplier?.companyName ?? '',
  contactName: supplier?.contactPerson ?? '',
  email: supplier?.email ?? '',
  phone: supplier?.phone ?? '',
  address: supplier?.address ?? '',
  taxNumber: supplier?.taxNumber ?? '',
  taxOffice: supplier?.taxOffice ?? '',
  status: supplier?.isActive === false ? 'inactive' : 'active',
});

const AdminSuppliersPage: React.FC = () => {
  const { isMobile } = useAdminResponsive();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SupplierFilterStatus>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierRead | null>(null);

  const { data: tenantsData } = useListAdminTenants({ page: 1, limit: 100 });
  const { data: suppliersData, isLoading } = useListAdminSuppliers({
    page,
    limit,
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const tenants = getTenants(tenantsData);
  const suppliers = getSuppliers(suppliersData);
  const pagination = getPagination(suppliersData);

  const invalidateSuppliers = async () => {
    await queryClient.invalidateQueries({ queryKey: ['/api/admin/suppliers'] });
  };

  const createMutation = useCreateAdminSupplier({
    mutation: {
      onSuccess: async () => {
        await invalidateSuppliers();
        toast.success('Tedarikçi başarıyla oluşturuldu');
        handleCloseModal();
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Tedarikçi oluşturulurken hata oluştu'));
      },
    },
  });

  const updateMutation = useUpdateAdminSupplier({
    mutation: {
      onSuccess: async () => {
        await invalidateSuppliers();
        toast.success('Tedarikçi güncellendi');
        handleCloseModal();
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Tedarikçi güncellenirken hata oluştu'));
      },
    },
  });

  const deleteMutation = useDeleteAdminSupplier({
    mutation: {
      onSuccess: async () => {
        await invalidateSuppliers();
        toast.success('Tedarikçi silindi');
      },
      onError: (error) => {
        toast.error(getErrorMessage(error, 'Tedarikçi silinirken hata oluştu'));
      },
    },
  });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  const handleEdit = (supplier: SupplierRead) => {
    setEditingSupplier(supplier);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string | number) => {
    if (window.confirm('Bu tedarikçiyi silmek istediğinizden emin misiniz?')) {
      deleteMutation.mutate({ supplierId: Number(id) });
    }
  };

  const columns = [
    {
      key: 'company',
      header: 'Firma Adı',
      render: (supplier: SupplierRead) => (
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">{supplier.companyName}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {supplier.taxNumber ? `VN: ${supplier.taxNumber}` : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'İletişim',
      mobileHidden: true,
      render: (supplier: SupplierRead) => (
        <span className="text-sm text-gray-500 dark:text-gray-400">{supplier.contactPerson || '-'}</span>
      ),
    },
    {
      key: 'email_phone',
      header: 'E-posta / Telefon',
      render: (supplier: SupplierRead) => (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <div>{supplier.email || '-'}</div>
          <div>{supplier.phone || '-'}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Durum',
      render: (supplier: SupplierRead) => (
        <span
          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
            supplier.isActive !== false
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
          }`}
        >
          {supplier.isActive !== false ? 'Aktif' : 'Pasif'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'İşlemler',
      render: (supplier: SupplierRead) => (
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => handleEdit(supplier)}
            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 touch-feedback"
          >
            <PencilIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => handleDelete(supplier.id)}
            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 touch-feedback"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className={isMobile ? 'p-4 pb-safe space-y-6' : 'space-y-6'}>
      <div className="flex justify-between items-center">
        <h1 className={`font-semibold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>
          Tedarikçi Yönetimi
        </h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-800 touch-feedback"
        >
          <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
          {!isMobile && 'Yeni Tedarikçi'}
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow sm:flex sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div className="flex-1 min-w-0 max-w-lg">
          <div className="relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md py-2"
              placeholder="Tedarikçi ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="sm:ml-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              if (isSupplierFilterStatus(e.target.value)) {
                setStatusFilter(e.target.value);
              }
            }}
            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">Yükleniyor...</div>
        ) : (
          <ResponsiveTable
            data={suppliers}
            columns={columns}
            keyExtractor={(supplier: SupplierRead) => String(supplier.id)}
            emptyMessage="Kayıt bulunamadı."
          />
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Önceki
              </button>
              <button
                onClick={() => setPage((currentPage) => Math.min(pagination.totalPages, currentPage + 1))}
                disabled={page === pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Sonraki
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Toplam <span className="font-medium">{pagination.total}</span> kayıttan{' '}
                  <span className="font-medium">{(page - 1) * limit + 1}</span> -{' '}
                  <span className="font-medium">{Math.min(page * limit, pagination.total)}</span> arası
                  gösteriliyor
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  {Array.from({ length: pagination.totalPages }).map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setPage(index + 1)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === index + 1
                          ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <SupplierModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          initialData={editingSupplier}
          tenants={tenants}
          onSubmit={(data) => {
            if (editingSupplier) {
              updateMutation.mutate({
                supplierId: Number(editingSupplier.id),
                data: buildSupplierUpdatePayload(data),
              });
              return;
            }

            createMutation.mutate({ data: buildSupplierPayload(data) });
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}
    </div>
  );
};

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: SupplierRead | null;
  tenants: TenantOption[];
  onSubmit: (data: SupplierFormData) => void;
  isLoading: boolean;
}

const SupplierModal: React.FC<SupplierModalProps> = ({
  isOpen,
  onClose,
  initialData,
  tenants,
  onSubmit,
  isLoading,
}) => {
  const [formData, setFormData] = useState<SupplierFormData>(() => getInitialFormData(initialData));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(formData);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" role="dialog" aria-modal="true">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {initialData ? 'Tedarikçi Düzenle' : 'Yeni Tedarikçi Ekle'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Abone (Tenant) *</label>
            <select
              required
              value={formData.tenantId}
              onChange={(e) => setFormData((current) => ({ ...current, tenantId: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              disabled={!!initialData}
            >
              <option value="">Seçiniz</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Firma Adı *</label>
              <input
                type="text"
                required
                value={formData.companyName}
                onChange={(e) => setFormData((current) => ({ ...current, companyName: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">İletişim Kişisi</label>
              <input
                type="text"
                value={formData.contactName}
                onChange={(e) => setFormData((current) => ({ ...current, contactName: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">E-posta</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((current) => ({ ...current, email: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Telefon</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData((current) => ({ ...current, phone: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Adres</label>
            <textarea
              rows={3}
              value={formData.address}
              onChange={(e) => setFormData((current) => ({ ...current, address: e.target.value }))}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Vergi No</label>
              <input
                type="text"
                value={formData.taxNumber}
                onChange={(e) => setFormData((current) => ({ ...current, taxNumber: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Vergi Dairesi</label>
              <input
                type="text"
                value={formData.taxOffice}
                onChange={(e) => setFormData((current) => ({ ...current, taxOffice: e.target.value }))}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Durum</label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData((current) => ({
                  ...current,
                  status: e.target.value === 'inactive' ? 'inactive' : 'active',
                }))
              }
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
            </select>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50"
            >
              {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminSuppliersPage;
