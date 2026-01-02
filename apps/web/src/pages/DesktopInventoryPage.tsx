import React, { useState, useEffect } from 'react';
import { useToastHelpers, Card } from '@x-ear/ui-web';
import { Plus, Upload, Download, AlertTriangle, Trash2 } from 'lucide-react';
import { Button, Modal } from '@x-ear/ui-web';
import UniversalImporter, { FieldDef } from '../components/importer/UniversalImporter';
import inventorySchema from '../components/importer/schemas/inventory';
import { InventoryList } from '../components/inventory/InventoryList';
import { InventoryStats } from '../components/inventory/InventoryStats';
import { InventoryForm } from '../components/inventory/InventoryForm';
import { AdvancedFilters, InventoryFilters } from '../components/inventory/AdvancedFilters';
import { InventoryItem } from '../types/inventory';

import { inventoryGetInventoryItems, inventoryDeleteInventoryItem } from '@/api/generated';
import { apiClient } from '../api/orval-mutator';
import { unwrapArray } from '../utils/response-unwrap';



export const DesktopInventoryPage: React.FC = () => {


  // State management
  const [filters, setFilters] = useState<InventoryFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  // Data for filters
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  // Trigger to force child lists to reload from API after mutations
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState<number>(0);

  // Legacy-style modal state (used by the inventory manager modal)
  const [modalItems, setModalItems] = useState<any[]>([]);
  const [modalSearch, setModalSearch] = useState<string>('');
  const [modalCategoryFilter, setModalCategoryFilter] = useState<string>('');
  const [modalSelectedItemId, setModalSelectedItemId] = useState<string | null>(null);
  const [modalSelectedSerial, setModalSelectedSerial] = useState<string | null>(null);

  // Load filter options
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const response = await inventoryGetInventoryItems({
          per_page: 100
        });

        const items = unwrapArray<any>(response);

        // Normalize and extract unique string values safely
        const uniqueCategories = new Set<string>();
        const uniqueBrands = new Set<string>();
        const uniqueSuppliers = new Set<string>();

        items.forEach((item: any) => {
          // category may be string or object
          const rawCategory = item.category;
          if (rawCategory) {
            if (typeof rawCategory === 'string') uniqueCategories.add(rawCategory);
            else if (typeof rawCategory === 'object') {
              const label = rawCategory.label || rawCategory.name || rawCategory.value || rawCategory.title;
              if (label) uniqueCategories.add(String(label));
            }
          }

          if (item.brand) uniqueBrands.add(String(item.brand));
          if (item.supplier) uniqueSuppliers.add(String(item.supplier));
        });

        setCategories(Array.from(uniqueCategories));
        setBrands(Array.from(uniqueBrands));
        setSuppliers(Array.from(uniqueSuppliers));
      } catch (error) {
        console.error('Failed to load filter options:', error);
      }
    };

    loadFilterOptions();
  }, []);

  const { success: showSuccess, error: showError } = useToastHelpers();
  const [importResult, setImportResult] = useState<null | { created: number; updated: number; errors: any[] }>(null);

  // Called after create/update/delete to refresh lists
  const triggerInventoryRefresh = () => setInventoryRefreshKey(k => k + 1);

  const handleFiltersChange = (newFilters: InventoryFilters) => {
    setFilters(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
  };

  const handleItemSave = (item: InventoryItem) => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedItem(null);
    // Ensure lists reload from API
    triggerInventoryRefresh();
    showSuccess && showSuccess('Ürün kaydedildi');
  };

  const handleItemEdit = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  const handleItemDelete = (item: InventoryItem) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      await inventoryDeleteInventoryItem(String(itemToDelete.id));
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      // Reload will happen via subscription
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Silme işlemi başarısız oldu');
    }
  };

  const exportInventory = async () => {
    try {
      const response = await inventoryGetInventoryItems({
        per_page: 1000
      });

      const items = unwrapArray<any>(response);

      const headers = [
        'ID', 'Ürün Adı', 'Marka', 'Model', 'Kategori', 'Stok',
        'Fiyat', 'Barkod', 'Tedarikçi'
      ];

      const csvContent = [
        headers.join(','),
        ...items.map((item: any) => [
          item.id,
          `"${item.name || ''}"`,
          `"${item.brand || ''}"`,
          `"${item.model || ''}"`,
          `"${item.category || ''}"`,
          item.available_inventory || 0,
          item.price || 0,
          `"${item.barcode || ''}"`,
          `"${item.supplier || ''}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `inventory_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Dışa aktarma başarısız oldu');
    }
  };

  const importInventory = () => {
    // Open the UniversalImporter modal from the header import button
    setIsImporterOpen(true);
  };

  // Load items for legacy-style inventory modal when opened
  useEffect(() => {
    if (!isBulkUploadModalOpen) return;
    let mounted = true;
    const load = async () => {
      try {
        const response = await inventoryGetInventoryItems({ per_page: 500 });
        const items = unwrapArray<any>(response);
        if (mounted) setModalItems(items);
      } catch (error) {
        console.error('Failed to load modal inventory items:', error);
      }
    };
    load();
    return () => { mounted = false; };
  }, [isBulkUploadModalOpen]);


  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Envanter Yönetimi</h1>
          <p className="text-gray-600 dark:text-gray-400">İşitme cihazları ve aksesuarlarını yönetin</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={exportInventory}
            icon={<Download className="w-4 h-4" />}
          >
            Dışa Aktar
          </Button>
          <Button
            variant="outline"
            onClick={importInventory}
            icon={<Upload className="w-4 h-4" />}
          >
            İçe Aktar
          </Button>
          {/* Inventory import button removed per request; importer is available from page header elsewhere if needed */}
          <Button
            onClick={() => setIsAddModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Yeni Ürün
          </Button>
        </div>
      </div>

      {/* Stats */}
      <InventoryStats />

      {/* Filters */}
      <AdvancedFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={clearFilters}
        categories={categories}
        brands={brands}
        suppliers={suppliers}
        isExpanded={showFilters}
        onToggleExpanded={() => setShowFilters(!showFilters)}
      />

      {/* Inventory List */}
      <InventoryList
        filters={filters}
        onItemEdit={handleItemEdit}
        onItemDelete={handleItemDelete}
        refreshKey={inventoryRefreshKey}
      />

      <UniversalImporter
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        entityFields={[
          { key: 'id', label: 'ID' },
          { key: 'name', label: 'Ürün Adı' },
          { key: 'brand', label: 'Marka' },
          { key: 'model', label: 'Model' },
          { key: 'category', label: 'Kategori' },
          { key: 'availableInventory', label: 'Stok' },
          { key: 'price', label: 'Fiyat' },
          { key: 'barcode', label: 'Barkod' },
          { key: 'supplier', label: 'Tedarikçi' }
        ] as FieldDef[]}
        zodSchema={inventorySchema}
        uploadEndpoint={'/api/inventory/bulk_upload'}
        modalTitle={'Toplu Envanter Yükleme'}
        sampleDownloadUrl={'/import_samples/inventory_sample.csv'}
        onComplete={(res) => {
          if (res.errors && res.errors.length > 0) {
            showError(`Envanter import tamamlandı — Hatalı satır: ${res.errors.length}`);
          } else {
            showSuccess(`Envanter import tamamlandı — Oluşturulan: ${res.created}`);
          }
          // trigger list refresh and close importer
          setImportResult(res);
          triggerInventoryRefresh();
          setIsImporterOpen(false);
        }}
      />
      {importResult && (
        <div className="mt-4">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm">Oluşturulan: <strong>{importResult.created}</strong></div>
                <div className="text-sm">Güncellenen: <strong>{importResult.updated}</strong></div>
                <div className="text-sm">Hatalı satır: <strong>{importResult.errors?.length || 0}</strong></div>
              </div>
              <div>
                <Button variant="outline" onClick={() => setImportResult(null)}>Kapat</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Add Item Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Yeni Ürün Ekle"
        size="lg"
      >
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto p-6">
            <InventoryForm
              onSave={handleItemSave}
              onCancel={() => setIsAddModalOpen(false)}
            />
          </div>
        </div>
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedItem(null);
        }}
        title="Ürün Düzenle"
        size="lg"
      >
        <InventoryForm
          item={selectedItem || undefined}
          onSave={handleItemSave}
          onCancel={() => {
            setIsEditModalOpen(false);
            setSelectedItem(null);
          }}
        />
      </Modal>

      {/* Legacy-style Inventory Manager Modal (replaces previous Bulk Upload modal) */}
      <Modal
        isOpen={isBulkUploadModalOpen}
        onClose={() => setIsBulkUploadModalOpen(false)}
        title="Envanter Yönetimi"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <input
                type="text"
                placeholder="🔍 Barkod, seri no, marka, model veya isim ile ara..."
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="w-56">
              <select
                value={modalCategoryFilter}
                onChange={(e) => setModalCategoryFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Tüm Kategoriler</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{
                    // show human-friendly label if possible
                    (function (key) {
                      const map: Record<string, string> = {
                        hearing_aid: 'İşitme Cihazı',
                        battery: 'Pil',
                        accessory: 'Aksesuar',
                        ear_mold: 'Kulak Kalıbı',
                        cleaning_supplies: 'Temizlik Malzemesi',
                        amplifiers: 'Amplifikatör'
                      };
                      return map[key] || key;
                    })(c)
                  }</option>
                ))}
              </select>
            </div>
            <div className="ml-3">
              <button
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                onClick={() => setIsAddModalOpen(true)}
              >
                Yeni Envanter Ekle
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
            {modalItems
              .filter((item) => {
                const q = modalSearch.trim().toLowerCase();
                if (modalCategoryFilter && item.category && item.category !== modalCategoryFilter) return false;
                if (!q) return true;
                const haystack = `${item.brand || ''} ${item.model || ''} ${item.name || ''} ${item.serial_number || item.serialNumber || ''} ${item.barcode || ''}`.toLowerCase();
                return haystack.includes(q);
              })
              .map((item) => {
                const available = item.availableInventory ?? item.available_inventory ?? item.inventory ?? 0;
                const price = item.price ?? 0;
                const serials = item.availableSerials || item.available_serials || [];
                const isSelected = modalSelectedItemId === (item.id || item.uniqueId);
                return (
                  <div key={item.id || item.uniqueId} className={`border rounded-lg p-4 ${isSelected ? 'border-blue-500 bg-blue-50 shadow' : 'bg-white'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900">{item.brand} {item.model}</h4>
                        <p className="text-xs text-gray-500">{item.name || ''}</p>
                      </div>
                      <div className="text-right text-sm">
                        <div className="font-medium">₺{Number(price).toLocaleString()}</div>
                        <div className="text-gray-500">Stok: {available}</div>
                      </div>
                    </div>

                    {serials && serials.length > 0 ? (
                      <div className="mb-2">
                        <label className="block text-xs text-gray-600 mb-1">Seri No</label>
                        <select
                          value={modalSelectedItemId === (item.id || item.uniqueId) ? (modalSelectedSerial || '') : ''}
                          onChange={(e) => {
                            setModalSelectedItemId(item.id || item.uniqueId);
                            setModalSelectedSerial(e.target.value || null);
                          }}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value="">Seri seçin (opsiyonel)</option>
                          {serials.map((s: string) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500 mb-2">Seri: <span className="text-red-500">Yok</span></p>
                    )}

                    <div className="flex justify-between items-center mt-3">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            // map raw api item to InventoryForm shape as best-effort
                            const mapped: any = {
                              id: String(item.id || item.uniqueId),
                              name: item.name || item.productName || '',
                              brand: item.brand || '',
                              model: item.model || '',
                              category: item.category || '',
                              available_inventory: item.availableInventory ?? item.available_inventory ?? 0,
                              price: item.price ?? 0,
                              barcode: item.barcode || ''
                            };
                            setSelectedItem(mapped as any);
                            setIsEditModalOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
                            try {
                              await inventoryDeleteInventoryItem(String(item.id || item.uniqueId));
                              setModalItems(prev => prev.filter(i => (i.id || i.uniqueId) !== (item.id || item.uniqueId)));
                              // Refresh main list
                              triggerInventoryRefresh();
                            } catch (e) {
                              console.error('Delete failed', e);
                              alert('Silme işlemi başarısız oldu');
                            }
                          }}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Sil
                        </button>
                      </div>
                      <div>
                        <button
                          onClick={() => {
                            // toggle selection highlight
                            setModalSelectedItemId(prev => prev === (item.id || item.uniqueId) ? null : (item.id || item.uniqueId));
                          }}
                          className="text-sm px-3 py-1 border rounded-md"
                        >
                          {isSelected ? 'Seçili' : 'Seç'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              className="btn btn-secondary mr-3"
              onClick={() => setIsBulkUploadModalOpen(false)}
            >
              Kapat
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                // perform a simple bulk action as placeholder: export selected
                if (modalSelectedItemId) {
                  const selected = modalItems.find(i => (i.id || i.uniqueId) === modalSelectedItemId);
                  if (selected) {
                    const csv = `ID,Name,Brand,Model,Category,Stock,Price\n${selected.id || selected.uniqueId},"${selected.name || selected.productName}","${selected.brand}","${selected.model}","${selected.category}",${selected.availableInventory ?? selected.available_inventory ?? 0},${selected.price ?? 0}`;
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `inventory_item_${selected.id || selected.uniqueId}.csv`;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                  }
                } else {
                  alert('Lütfen bir öğe seçin');
                }
              }}
            >
              Seçili Öğeyi Dışa Aktar
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setItemToDelete(null);
        }}
        title="Ürünü Sil"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Ürünü silmek istediğinizden emin misiniz?
              </h3>
              {itemToDelete && (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    <span className="font-semibold">{itemToDelete.name}</span> ürününü silmek üzeresiniz.
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Bu işlem geri alınamaz. Ürünle ilgili tüm veriler kalıcı olarak silinecektir.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              variant="danger"
              onClick={confirmDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Ürünü Sil
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
