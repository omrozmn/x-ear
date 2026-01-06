import React, { useState } from 'react';
import {
    useGetAdminSuppliers,
    useCreateAdminSupplier,
    useUpdateAdminSupplier,
    useDeleteAdminSupplier,
    SupplierRead,
    SupplierCreate
} from '@/lib/api-client';

// Local type aliases
type Supplier = SupplierRead;
type SupplierInput = SupplierCreate;
import {
    PlusIcon,
    MagnifyingGlassIcon,
    PencilIcon,
    TrashIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

const AdminSuppliersPage: React.FC = () => {
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('all');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

    // Queries
    const { data: suppliersData, isLoading } = useGetAdminSuppliers({
        page,
        limit,
        search: search || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined
    });

    // Mutations
    const createMutation = useCreateAdminSupplier({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['/admin/suppliers'] });
                toast.success('Tedarikçi başarıyla oluşturuldu');
                handleCloseModal();
            },
            onError: (error: any) => {
                toast.error(`Hata: ${error.message}`);
            }
        }
    });

    const updateMutation = useUpdateAdminSupplier({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['/admin/suppliers'] });
                toast.success('Tedarikçi güncellendi');
                handleCloseModal();
            },
            onError: (error: any) => {
                toast.error(`Hata: ${error.message}`);
            }
        }
    });

    const deleteMutation = useDeleteAdminSupplier({
        mutation: {
            onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ['/admin/suppliers'] });
                toast.success('Tedarikçi silindi');
            },
            onError: (error: any) => {
                toast.error(`Hata: ${error.message}`);
            }
        }
    });

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingSupplier(null);
    };

    const handleEdit = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('Bu tedarikçiyi silmek istediğinizden emin misiniz?')) {
            deleteMutation.mutate({ supplierId: id });
        }
    };

    const suppliers = (suppliersData as any)?.data?.suppliers || [];
    const pagination = (suppliersData as any)?.data?.pagination;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold text-gray-900">Tedarikçi Yönetimi</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
                >
                    <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                    Yeni Tedarikçi
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow sm:flex sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                <div className="flex-1 min-w-0 max-w-lg">
                    <div className="relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md py-2"
                            placeholder="Tedarikçi ara..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="sm:ml-4">
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as any)}
                        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                    >
                        <option value="all">Tüm Durumlar</option>
                        <option value="active">Aktif</option>
                        <option value="inactive">Pasif</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                {isLoading ? (
                    <div className="p-4 text-center text-gray-500">Yükleniyor...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Firma Adı</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">İletişim</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-posta / Telefon</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Durum</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">İşlemler</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {suppliers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                                            Kayıt bulunamadı.
                                        </td>
                                    </tr>
                                ) : (
                                    suppliers.map((supplier) => (
                                        <tr key={supplier.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{(supplier as any).companyName}</div>
                                                <div className="text-sm text-gray-500">{(supplier as any).taxId ? `VN: ${(supplier as any).taxId}` : ''}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {(supplier as any).contactName || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <div>{supplier.email}</div>
                                                <div>{supplier.phone}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${supplier.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {supplier.status === 'active' ? 'Aktif' : 'Pasif'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleEdit(supplier)}
                                                    className="text-indigo-600 hover:text-indigo-900 mr-4"
                                                >
                                                    <PencilIcon className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(supplier.id!)}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pagination && (pagination.totalPages || 0) > 1 && (
                    <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                Önceki
                            </button>
                            <button
                                onClick={() => setPage((p) => Math.min(pagination?.totalPages || 1, p + 1))}
                                disabled={page === (pagination?.totalPages || 1)}
                                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                Sonraki
                            </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Toplam <span className="font-medium">{pagination?.total || 0}</span> kayıttan <span className="font-medium">{(page - 1) * limit + 1}</span> - <span className="font-medium">{Math.min(page * limit, pagination?.total || 0)}</span> arası gösteriliyor
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    {Array.from({ length: pagination?.totalPages || 1 }).map((_, i) => (
                                        <button
                                            key={i}
                                            onClick={() => setPage(i + 1)}
                                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${page === i + 1
                                                ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                                                }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <SupplierModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    initialData={editingSupplier}
                    onSubmit={(data) => {
                        if (editingSupplier) {
                            updateMutation.mutate({ supplierId: parseInt(editingSupplier.id!), data });
                        } else {
                            createMutation.mutate({ data });
                        }
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
    initialData: Supplier | null;
    onSubmit: (data: SupplierInput) => void;
    isLoading: boolean;
}

const SupplierModal: React.FC<SupplierModalProps> = ({
    isOpen,
    onClose,
    initialData,
    onSubmit,
    isLoading
}) => {
    const [formData, setFormData] = useState<any>({
        companyName: (initialData as any)?.companyName || '',
        contactName: (initialData as any)?.contactName || '',
        email: initialData?.email || '',
        phone: initialData?.phone || '',
        address: initialData?.address || '',
        taxId: (initialData as any)?.taxId || '',
        taxOffice: (initialData as any)?.taxOffice || '',
        status: (initialData as any)?.status || 'active'
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
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
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Firma Adı *</label>
                            <input
                                type="text"
                                required
                                value={formData.companyName}
                                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">İletişim Kişisi</label>
                            <input
                                type="text"
                                value={formData.contactName || ''}
                                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">E-posta</label>
                            <input
                                type="email"
                                value={formData.email || ''}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Telefon</label>
                            <input
                                type="text"
                                value={formData.phone || ''}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Adres</label>
                        <textarea
                            rows={3}
                            value={formData.address || ''}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Vergi No</label>
                            <input
                                type="text"
                                value={formData.taxId || ''}
                                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Vergi Dairesi</label>
                            <input
                                type="text"
                                value={formData.taxOffice || ''}
                                onChange={(e) => setFormData({ ...formData, taxOffice: e.target.value })}
                                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Durum</label>
                        <select
                            value={formData.status || 'active'}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
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
