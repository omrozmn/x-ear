/**
 * SuppliersPage Component
 * @fileoverview Main suppliers management page with search, filters, and supplier list
 * @version 1.0.0
 */

import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Modal, Tabs, TabsList, TabsTrigger, TabsContent, Badge, useToastHelpers } from '@x-ear/ui-web';
import { useNavigate } from '@tanstack/react-router';
import { useSuppliers, useCreateSupplier, useDeleteSupplier, useUpdateSupplier, type SupplierFormData } from '../hooks/useSuppliers';
import { useSuggestedSuppliers } from '../hooks/useSupplierInvoices';
import { Users, CheckCircle, Flame, Filter, Search, Plus, RefreshCw, Trash2, Upload } from 'lucide-react';
import { unwrapPaginated, unwrapArray } from '../utils/response-unwrap';
import { SupplierFormModal } from '../components/suppliers/SupplierFormModal';
import { SupplierFilters } from '../components/suppliers/SupplierFilters';
import { SupplierList } from '../components/suppliers/SupplierList';
import { SuggestedSuppliersList } from '../components/suppliers/SuggestedSuppliersList';
import { SupplierFilters as SupplierFiltersType, SupplierExtended } from '../components/suppliers/supplier-search.types';
import { DesktopPageHeader } from '../components/layout/DesktopPageHeader';
import UniversalImporter from '../components/importer/UniversalImporter';
import supplierSchema from '../components/importer/schemas/suppliers';


export function DesktopSuppliersPage() {
  const { t } = useTranslation('suppliers');

  const navigate = useNavigate();

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
  const [showImporter, setShowImporter] = useState(false);
  const { success: showSuccess, error: showError } = useToastHelpers();
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Hooks
  const { data, isLoading, error, refetch } = useSuppliers({
    search: searchValue,
    is_active: filters?.status === 'ACTIVE' ? true : filters?.status === 'INACTIVE' ? false : undefined,
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
      total: Number(paginatedData.meta.total),
      totalPages: Number(paginatedData.meta.totalPages)
    };
  }, [data]);

  const updateSupplierMutation = useUpdateSupplier();
  const createSupplierMutation = useCreateSupplier();
  const deleteSupplierMutation = useDeleteSupplier();

  // Calculate stats - safely handle undefined/null suppliers
  const stats = React.useMemo(() => {
    const supplierArray = suppliers || [];
    return {
      total: Number(pagination?.total || supplierArray.length),
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
    const id = supplier.id || (supplier as unknown as Record<string, unknown>)._id;

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
      await deleteSupplierMutation.mutateAsync(String(supplierToDelete.id));
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
        // Map SupplierExtended to SupplierFormData
        const formData: SupplierFormData = {
          companyName: supplierData.companyName || '',
          companyCode: supplierData.companyCode,
          taxNumber: supplierData.taxNumber,
          taxOffice: supplierData.taxOffice,
          institutionNumber: supplierData.institutionNumber,
          contactPerson: supplierData.contactPerson,
          email: supplierData.email,
          phone: supplierData.phone,
          mobile: supplierData.mobile,
          website: supplierData.website,
          address: supplierData.address,
          city: supplierData.city,
          country: supplierData.country,
          postalCode: supplierData.postalCode,
          paymentTerms: supplierData.paymentTerms,
          currency: supplierData.currency,
          rating: supplierData.rating,
          notes: supplierData.notes,
          isActive: supplierData.isActive,
        };
        await updateSupplierMutation.mutateAsync({
          supplierId: String(editingSupplier.id),
          updates: formData
        });
        setIsEditModalOpen(false);
        setEditingSupplier(null);
      } else {
        await createSupplierMutation.mutateAsync(supplierData as Omit<SupplierExtended, 'id' | 'createdAt' | 'updatedAt' | 'tenantId'>);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredSuppliers, sortBy, sortOrder]);

  const paginatedSuppliers = useMemo(() => {
    return sortedSuppliers;
  }, [sortedSuppliers]);

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-full mx-auto space-y-6">
        {/* Header */}
        <DesktopPageHeader
          title={t('pageTitle', 'Tedarikçiler')}
          description={t('pageDescription', 'Tedarikçi kayıtlarını yönetin ve takip edin')}
          icon={<Users className="h-6 w-6" />}
          eyebrow={{ tr: 'Tedarikçi Masası', en: 'Vendor Desk' }}
          actions={(
            <>
              <Button variant="outline" onClick={handleRefresh} className="bg-white/80 dark:bg-white/10">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('refresh', 'Yenile')}
              </Button>
              <Button variant="outline" onClick={() => setShowImporter(true)} className="bg-white/80 dark:bg-white/10">
                <Upload className="h-4 w-4 mr-2" />
                {t('bulkUpload', 'Toplu Yükle')}
              </Button>
              <Button onClick={handleNewSupplier} className="premium-gradient tactile-press text-white shadow-sm">
                <Plus className="h-4 w-4 mr-2" />
                {t('newSupplier', 'Yeni Tedarikçi')}
              </Button>
            </>
          )}
        />

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-border transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{t('stats.total', 'Toplam Tedarikçi')}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <div className="bg-primary/10 p-3 rounded-2xl">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-border transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{t('stats.active', 'Aktif Tedarikçiler')}</p>
                <p className="text-3xl font-bold text-success">{stats.active}</p>
              </div>
              <div className="bg-success/10 p-3 rounded-2xl">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-border transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{t('stats.inactive', 'Pasif Tedarikçiler')}</p>
                <p className="text-3xl font-bold text-muted-foreground">{stats.inactive}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-2xl">
                <Flame className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-border p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('searchPlaceholder', 'Şirket adı, yetkili kişi, telefon veya email ile ara...')}
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
              {t('filters', 'Filtreler')}
            </Button>
          </div>

          {
            showFilters && (
              <div className="mt-4 pt-4 border-t border-border animate-in fade-in slide-in-from-top-2">
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
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-border">
            <TabsList>
              <TabsTrigger value="all">{t('tabs.suppliers', 'Tedarikçiler')}</TabsTrigger>
              <TabsTrigger value="suggested">
                {t('tabs.suggested', 'Önerilen Tedarikçiler')}
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-border overflow-hidden">
              {
                isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground font-medium">{t('loading', 'Tedarikçiler yükleniyor...')}</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="bg-destructive/10 p-3 rounded-full w-fit mx-auto mb-3">
                        <Flame className="h-6 w-6 text-destructive" />
                      </div>
                      <p className="text-sm text-destructive font-medium mb-2">{t('loadError', 'Veriler yüklenirken bir hata oluştu')}</p>
                      <Button variant="outline" size="sm" onClick={handleRefresh}>
                        {t('retry', 'Tekrar Dene')}
                      </Button>
                    </div>
                  </div>
                ) : sortedSuppliers.length === 0 ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-full w-fit mx-auto mb-3">
                        <Users className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t('noSuppliersFound', 'Tedarikçi Bulunamadı')}</h3>
                      <p className="text-sm text-muted-foreground mt-1 mb-4">Arama kriterlerinize uygun kayıt bulunmuyor.</p>
                      <Button onClick={handleNewSupplier} className="premium-gradient tactile-press text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        {t('addNewSupplier', 'Yeni Tedarikçi Ekle')}
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
                      total: Number(pagination.total),
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
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-border overflow-hidden p-6">
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

        <UniversalImporter
          isOpen={showImporter}
          onClose={() => setShowImporter(false)}
          entityFields={[
            { key: 'companyName', label: 'Şirket Adı' },
            { key: 'companyCode', label: 'Şirket Kodu' },
            { key: 'contactPerson', label: 'Yetkili Kişi' },
            { key: 'phone', label: 'Telefon' },
            { key: 'mobile', label: 'Cep Telefon' },
            { key: 'email', label: 'E-posta' },
            { key: 'taxNumber', label: 'Vergi No' },
            { key: 'taxOffice', label: 'Vergi Dairesi' },
            { key: 'address', label: 'Adres' },
            { key: 'city', label: 'Şehir' },
            { key: 'district', label: 'İlçe' },
            { key: 'country', label: 'Ülke' },
            { key: 'paymentTerms', label: 'Ödeme Vadesi' },
            { key: 'currency', label: 'Para Birimi' },
            { key: 'website', label: 'Web Sitesi' },
            { key: 'notes', label: 'Notlar' },
            { key: 'isActive', label: 'Aktif' },
          ]}
          zodSchema={supplierSchema}
          uploadEndpoint="/api/suppliers/bulk-upload"
          modalTitle="Toplu Tedarikçi Yükleme"
          onComplete={(res) => {
            if (res.errors && res.errors.length > 0) {
              showError(`Tedarikçi import tamamlandı — Hatalı satır: ${res.errors.length}`);
            } else {
              showSuccess(`Tedarikçi import tamamlandı — Oluşturulan: ${res.created}, Güncellenen: ${res.updated}`);
            }
            handleRefresh();
            setShowImporter(false);
          }}
        />

        <Modal
          isOpen={!!supplierToDelete}
          onClose={() => setSupplierToDelete(null)}
          title={t('deleteSupplier', 'Tedarikçiyi Sil')}
          size="md"
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-red-200 rounded-2xl">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-destructive" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-900">
                  Bu tedarikçiyi silmek istediğinizden emin misiniz?
                </h3>
                <p className="mt-1 text-sm text-destructive">
                  {supplierToDelete?.companyName}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
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
