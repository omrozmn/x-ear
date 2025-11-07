/**
 * SuppliersPage Component
 * @fileoverview Main suppliers management page with search, filters, and supplier list
 * @version 1.0.0
 */

import React, { useState, useMemo } from 'react';
import { Button, Input, Modal, Pagination } from '@x-ear/ui-web';
import { useNavigate, Outlet, useParams } from '@tanstack/react-router';
import { useSuppliers, useCreateSupplier, useDeleteSupplier, useUpdateSupplier } from '../hooks/useSuppliers';
import { Users, CheckCircle, Flame, Filter, Search, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { SupplierFormModal } from '../components/suppliers/SupplierFormModal';
import { SupplierFilters } from '../components/suppliers/SupplierFilters';
import { SupplierList } from '../components/suppliers/SupplierList';
import { SupplierFilters as SupplierFiltersType, SupplierExtended } from '../components/suppliers/supplier-search.types';

export function SuppliersPage() {
  const navigate = useNavigate();
  const { supplierId } = useParams({ strict: false }) as { supplierId?: string };

  // State
  const [searchValue, setSearchValue] = useState('');
  const [showNewSupplierModal, setShowNewSupplierModal] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierExtended | null>(null);
  const [filters, setFilters] = useState<SupplierFiltersType>({});
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [supplierToDelete, setSupplierToDelete] = useState<SupplierExtended | null>(null);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Hooks
  const { data, isLoading, error, refetch } = useSuppliers({
    search: searchValue,
    status: filters?.status as any,
    page: currentPage,
    per_page: itemsPerPage,
  });

  // Safely extract data from response
  const suppliers = React.useMemo(() => {
    if (!data) {
      console.log('No data received');
      return [];
    }
    console.log('API Response:', data);

    // Handle different response structures
    if (data.data) {
      // Axios response: data.data contains the actual response
      if (Array.isArray(data.data)) {
        return data.data as SupplierExtended[];
      }
      if (data.data.data && Array.isArray(data.data.data)) {
        return data.data.data as SupplierExtended[];
      }
    }

    return [];
  }, [data]);

  const pagination = React.useMemo(() => {
    if (!data?.data) return undefined;

    // Check for meta in different locations
    const meta = data.data.meta || data.data;

    if (meta.total !== undefined) {
      return {
        total: meta.total || 0,
        totalPages: meta.totalPages || meta.pages || 1,
      };
    }

    return undefined;
  }, [data]);

  const updateSupplierMutation = useUpdateSupplier();
  const createSupplierMutation = useCreateSupplier();
  const deleteSupplierMutation = useDeleteSupplier();

  // Calculate stats - safely handle undefined/null suppliers
  const stats = React.useMemo(() => {
    const supplierArray = suppliers || [];
    return {
      total: pagination?.total || supplierArray.length,
      active: supplierArray.filter(s => s?.isActive).length,
      inactive: supplierArray.filter(s => !s?.isActive).length,
    };
  }, [suppliers, pagination]);

  // Handlers
  const handleSearch = (value: string) => {
    setSearchValue(value);
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleNewSupplier = () => {
    setShowNewSupplierModal(true);
  };

  const handleEditSupplier = (supplier: SupplierExtended) => {
    setEditingSupplier(supplier);
    setIsEditModalOpen(true);
  };

  const handleSupplierClick = (supplier: SupplierExtended) => {
    if (supplier.id) {
      navigate({
        to: '/suppliers/$supplierId',
        params: { supplierId: String(supplier.id) }
      });
    } else {
      console.error('Supplier ID is missing!');
    }
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchValue('');
    setCurrentPage(1);
  };

  const handleDeleteSupplier = (supplier: SupplierExtended) => {
    setSupplierToDelete(supplier);
  };

  const confirmDelete = async () => {
    if (!supplierToDelete?.id) return;
    try {
      await deleteSupplierMutation.mutateAsync(supplierToDelete.id);
      setSupplierToDelete(null);
    } catch (error) {
      console.error('Failed to delete supplier:', error);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleSaveSupplier = async (supplierData: Omit<SupplierExtended, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingSupplier && editingSupplier.id) {
        await updateSupplierMutation.mutateAsync({
          supplierId: String(editingSupplier.id),
          updates: supplierData as any
        });
        setIsEditModalOpen(false);
        setEditingSupplier(null);
      } else {
        await createSupplierMutation.mutateAsync(supplierData as any);
        setShowNewSupplierModal(false);
      }
      refetch();
    } catch (error) {
      console.error('Failed to save supplier:', error);
    }
  };

  const filteredSuppliers = useMemo(() => {
    // Filtering is now done on the server side
    return suppliers;
  }, [suppliers]);

  const sortedSuppliers = useMemo(() => {
    // Sorting is now done on the server side
    return filteredSuppliers;
  }, [filteredSuppliers]);

  const paginatedSuppliers = useMemo(() => {
    return sortedSuppliers;
  }, [sortedSuppliers]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {supplierId ? (
        <Outlet />
      ) : (
        <>
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Tedarikçiler</h1>
                <p className="text-sm text-gray-500 mt-2">Tedarikçi kayıtlarını yönetin ve takip edin</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleRefresh}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Yenile
                </Button>
                <Button onClick={handleNewSupplier} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Tedarikçi
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-xl shadow-sm border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600 mb-1">Toplam Tedarikçi</p>
                    <p className="text-3xl font-bold text-blue-900">{stats.total}</p>
                  </div>
                  <div className="bg-blue-500 p-3 rounded-lg">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-6 rounded-xl shadow-sm border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600 mb-1">Aktif</p>
                    <p className="text-3xl font-bold text-green-900">{stats.active}</p>
                  </div>
                  <div className="bg-green-500 p-3 rounded-lg">
                    <CheckCircle className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">Pasif</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.inactive}</p>
                  </div>
                  <div className="bg-gray-400 p-3 rounded-lg">
                    <Flame className="h-8 w-8 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Şirket adı, yetkili kişi, telefon veya email ile ara..."
                    value={searchValue}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button
                variant={showFilters ? "default" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtreler
              </Button>
            </div>

            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <SupplierFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  onClearFilters={handleClearFilters}
                />
              </div>
            )}
          </div>

          {/* Supplier List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Yükleniyor...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <p className="text-sm text-red-600">Bir hata oluştu</p>
                  <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2">
                    Tekrar Dene
                  </Button>
                </div>
              </div>
            ) : sortedSuppliers.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Tedarikçi bulunamadı</p>
                  <Button variant="outline" size="sm" onClick={handleNewSupplier} className="mt-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Yeni Tedarikçi Ekle
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <SupplierList
                  suppliers={paginatedSuppliers}
                  isLoading={isLoading}
                  error={error as Error | null}
                  onSupplierClick={handleSupplierClick}
                  onEditSupplier={handleEditSupplier}
                  onDeleteSupplier={handleDeleteSupplier}
                  onSort={handleSort}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                />
                {pagination && (
                  <div className="border-t border-gray-200 p-4">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={pagination.totalPages}
                      onPageChange={setCurrentPage}
                      itemsPerPage={itemsPerPage}
                      onItemsPerPageChange={(newSize) => {
                        setItemsPerPage(newSize);
                        setCurrentPage(1);
                      }}
                      totalItems={pagination.total}
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Modals */}
          <SupplierFormModal
            isOpen={showNewSupplierModal || isEditModalOpen}
            onClose={() => {
              setShowNewSupplierModal(false);
              setIsEditModalOpen(false);
              setEditingSupplier(null);
            }}
            onSave={handleSaveSupplier}
            supplier={editingSupplier}
            isLoading={createSupplierMutation.isPending || updateSupplierMutation.isPending}
          />

          <Modal
            isOpen={!!supplierToDelete}
            onClose={() => setSupplierToDelete(null)}
            title="Tedarikçiyi Sil"
            size="md"
          >
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                    <Trash2 className="h-5 w-5 text-red-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-900">
                    Bu tedarikçiyi silmek istediğinizden emin misiniz?
                  </h3>
                  <p className="mt-1 text-sm text-red-700">
                    {supplierToDelete?.companyName}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600">
                Bu işlem geri alınamaz. Tedarikçi kaydı ve tüm ilişkili veriler silinecektir.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setSupplierToDelete(null)}>İptal</Button>
                <Button variant="danger" onClick={confirmDelete} disabled={deleteSupplierMutation.isPending}>
                  {deleteSupplierMutation.isPending ? 'Siliniyor...' : 'Sil'}
                </Button>
              </div>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
}

export default SuppliersPage;