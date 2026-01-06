/**
 * SuppliersPage Component
 * @fileoverview Main suppliers management page with search, filters, and supplier list
 * @version 1.0.0
 */

import React, { useState, useMemo } from 'react';
import { Button, Input, Modal, Pagination, Tabs, TabsList, TabsTrigger, TabsContent, Badge } from '@x-ear/ui-web';
import { useNavigate, Outlet, useParams } from '@tanstack/react-router';
import { useSuppliers, useCreateSupplier, useDeleteSupplier, useUpdateSupplier } from '../hooks/useSuppliers';
import { useSuggestedSuppliers } from '../hooks/useSupplierInvoices';
import { Users, CheckCircle, Flame, Filter, Search, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { unwrapPaginated, unwrapArray } from '../utils/response-unwrap';
import { SupplierFormModal } from '../components/suppliers/SupplierFormModal';
import { SupplierFilters } from '../components/suppliers/SupplierFilters';
import { SupplierList } from '../components/suppliers/SupplierList';
import { SuggestedSuppliersList } from '../components/suppliers/SuggestedSuppliersList';
import { SupplierFilters as SupplierFiltersType, SupplierExtended } from '../components/suppliers/supplier-search.types';


export function DesktopSuppliersPage() {


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
    is_active: (filters?.status as any) === 'active' ? true : (filters?.status as any) === 'inactive' ? false : undefined,
    page: currentPage,
    per_page: itemsPerPage,
  });

  const { suggestedSuppliers, isLoading: suggestedLoading } = useSuggestedSuppliers();

  // Safely extract data from response
  const suppliers = React.useMemo(() => {
    return unwrapArray<SupplierExtended>(data);
  }, [data]);

  const pagination = React.useMemo(() => {
    const paginatedData = unwrapPaginated<SupplierExtended>(data);
    if (!paginatedData || !paginatedData.meta) return undefined;
    return {
      total: paginatedData.meta.total,
      totalPages: paginatedData.meta.totalPages
    };
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
    console.log('Row clicked (handleSupplierClick called):', supplier);
    // Fallback for ID if standard id is missing (e.g. using _id or similar)
    const id = supplier.id || (supplier as any)._id;

    if (id) {
      console.log('Navigating to:', `/suppliers/${id}`);
      navigate({
        to: '/suppliers/$supplierId',
        params: { supplierId: String(id) }
      });
    } else {
      console.error('Supplier ID is missing!', supplier);
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

  const handleSaveSupplier = async (supplierData: Omit<SupplierExtended, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>) => {
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
    let result = suppliers;

    // Client-side filtering for city if API doesn't support it or for immediate feedback
    if (filters.city) {
      const cityLower = filters.city.toLowerCase();
      result = result.filter(s => s.city?.toLowerCase().includes(cityLower));
    }

    return result;
  }, [suppliers, filters.city]);

  const sortedSuppliers = useMemo(() => {
    // Client-side sorting if needed (though API should handle it)
    // For now, we rely on API but if we wanted client side:
    /*
    return [...filteredSuppliers].sort((a, b) => {
      const aVal = a[sortBy as keyof SupplierExtended];
      const bVal = b[sortBy as keyof SupplierExtended];
      if (aVal === bVal) return 0;
      const comparison = aVal > bVal ? 1 : -1;
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    */
    return filteredSuppliers;
  }, [filteredSuppliers, sortBy, sortOrder]);

  const paginatedSuppliers = useMemo(() => {
    return sortedSuppliers;
  }, [sortedSuppliers]);

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="max-w-full mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Tedarikçiler</h1>
            <p className="text-sm text-gray-500 mt-1">Tedarikçi kayıtlarını yönetin ve takip edin</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleRefresh} className="bg-white">
              <RefreshCw className="h-4 w-4 mr-2" />
              Yenile
            </Button>
            <Button onClick={handleNewSupplier} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Yeni Tedarikçi
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Toplam Tedarikçi</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Aktif Tedarikçiler</p>
                <p className="text-3xl font-bold text-green-600">{stats.active}</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Pasif Tedarikçiler</p>
                <p className="text-3xl font-bold text-gray-600">{stats.inactive}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <Flame className="h-6 w-6 text-gray-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Şirket adı, yetkili kişi, telefon veya email ile ara..."
                  value={searchValue}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
            </div>
            <Button
              variant={showFilters ? "default" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "bg-gray-900 text-white" : ""}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtreler
            </Button>
          </div>

          {
            showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-2">
                <SupplierFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  onClearFilters={handleClearFilters}
                />
              </div>
            )
          }
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <TabsList>
              <TabsTrigger value="all">Tedarikçiler</TabsTrigger>
              <TabsTrigger value="suggested">
                Önerilen Tedarikçiler
                {suggestedSuppliers.length > 0 && (
                  <Badge variant="default" className="ml-2">
                    {suggestedSuppliers.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all">
            {/* Supplier List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {
                isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-3" />
                      <p className="text-sm text-gray-600 font-medium">Tedarikçiler yükleniyor...</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="bg-red-50 p-3 rounded-full w-fit mx-auto mb-3">
                        <Flame className="h-6 w-6 text-red-500" />
                      </div>
                      <p className="text-sm text-red-600 font-medium mb-2">Veriler yüklenirken bir hata oluştu</p>
                      <Button variant="outline" size="sm" onClick={handleRefresh}>
                        Tekrar Dene
                      </Button>
                    </div>
                  </div>
                ) : sortedSuppliers.length === 0 ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="bg-gray-50 p-4 rounded-full w-fit mx-auto mb-3">
                        <Users className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900">Tedarikçi Bulunamadı</h3>
                      <p className="text-sm text-gray-500 mt-1 mb-4">Arama kriterlerinize uygun kayıt bulunmuyor.</p>
                      <Button onClick={handleNewSupplier} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Yeni Tedarikçi Ekle
                      </Button>
                    </div>
                  </div>
                ) : (
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
                    pagination={pagination ? {
                      current: currentPage,
                      pageSize: itemsPerPage,
                      total: pagination.total,
                      onChange: (page, size) => {
                        setCurrentPage(page);
                        setItemsPerPage(size);
                      }
                    } : undefined}
                  />
                )
              }
            </div>
          </TabsContent>

          <TabsContent value="suggested">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden p-6">
              <SuggestedSuppliersList
                suppliers={suggestedSuppliers}
                isLoading={suggestedLoading}
                onSupplierAccepted={() => {
                  refetch();
                }}
              />
            </div>
          </TabsContent>
        </Tabs>

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
      </div>
    </div>
  );
}

export default DesktopSuppliersPage;
