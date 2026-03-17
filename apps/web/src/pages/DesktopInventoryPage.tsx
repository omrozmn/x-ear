import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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

import { listInventory, deleteInventory } from '@/api/client/inventory.client';
import { unwrapArray } from '../utils/response-unwrap';
import { DesktopPageHeader } from '../components/layout/DesktopPageHeader';
import { PermissionGate } from '@/components/PermissionGate';
import toast from 'react-hot-toast';



export const DesktopInventoryPage: React.FC = () => {
  const { t } = useTranslation('inventory');

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
  const [modalItems, setModalItems] = useState<InventoryItem[]>([]);
  const [modalSearch, setModalSearch] = useState<string>('');
  const [modalCategoryFilter, setModalCategoryFilter] = useState<string>('');
  const [modalSelectedItemId, setModalSelectedItemId] = useState<string | null>(null);
  const [modalSelectedSerial, setModalSelectedSerial] = useState<string | null>(null);

  // Load filter options
  useEffect(() => {
    const loadFilterOptions = async () => {
      try {
        const response = await listInventory({
          per_page: 100
        });

        const items = unwrapArray<InventoryItem>(response);

        // Normalize and extract unique string values safely
        const uniqueCategories = new Set<string>();
        const uniqueBrands = new Set<string>();
        const uniqueSuppliers = new Set<string>();

        items.forEach((item: InventoryItem) => {
          // category may be string or object
          const itemData = item as unknown as Record<string, unknown>;
          const rawCategory = itemData.category;
          if (rawCategory) {
            if (typeof rawCategory === 'string') {
              uniqueCategories.add(rawCategory);
            } else if (typeof rawCategory === 'object' && rawCategory !== null) {
              // Type guard for object with potential label properties
              const categoryObj = rawCategory as Record<string, unknown>;
              const label = categoryObj.label || categoryObj.name || categoryObj.value || categoryObj.title;
              if (label) uniqueCategories.add(String(label));
            }
          }

          if (item.brand) uniqueBrands.add(String(item.brand));
          if (itemData.supplier) uniqueSuppliers.add(String(itemData.supplier));
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
  const [importResult, setImportResult] = useState<null | { created: number; updated: number; errors: Array<{ row: number; issues: string[] }> }>(null);

  // Called after create/update/delete to refresh lists
  const triggerInventoryRefresh = () => setInventoryRefreshKey(k => k + 1);

  const handleFiltersChange = (newFilters: InventoryFilters) => {
    setFilters(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
  };

  const handleItemSave = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedItem(null);
    // Ensure lists reload from API
    triggerInventoryRefresh();
    if (showSuccess) showSuccess(t('messages.product_updated'));
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
      await deleteInventory(String(itemToDelete.id));
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
      // Reload will happen via subscription
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error(t('delete.failed'));
    }
  };

  const exportInventory = async () => {
    try {
      const response = await listInventory({
        per_page: 1000
      });

      const items = unwrapArray<InventoryItem>(response);

      const headers = [
        'ID', t('columns.product_name'), t('columns.brand'), 'Model', t('columns.category'), t('columns.stock'),
        t('columns.sale_price'), t('columns.barcode'), t('form.description')
      ];

      const csvContent = [
        headers.join(','),
        ...items.map((item: InventoryItem) => {
          const itemData = item as unknown as Record<string, unknown>;
          return [
            itemData.id,
            `"${itemData.name || ''}"`,
            `"${item.brand || ''}"`,
            `"${item.model || ''}"`,
            `"${itemData.category || ''}"`,
            item.availableInventory || 0,
            item.price || 0,
            `"${item.barcode || ''}"`,
            `"${itemData.supplier || ''}"`
          ].join(',');
        })
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
      toast.error(t('messages.load_failed'));
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
        const response = await listInventory({ per_page: 500 });
        const items = unwrapArray<InventoryItem>(response);
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
      <DesktopPageHeader
        title={t('stock.title')}
        description={t('products.description')}
        eyebrow={{ tr: 'Envanter', en: 'Inventory' }}
        actions={(
          <>
            <PermissionGate permission="inventory.view">
              <Button
                variant="outline"
                onClick={exportInventory}
                icon={<Download className="w-4 h-4" />}
              >
                {t('actions.export')}
              </Button>
            </PermissionGate>
            <PermissionGate permission="inventory.manage">
              <Button
                variant="outline"
                onClick={importInventory}
                icon={<Upload className="w-4 h-4" />}
              >
                {t('actions.import')}
              </Button>
            </PermissionGate>
            <PermissionGate permission="inventory.manage">
              <Button
                onClick={() => setIsAddModalOpen(true)}
                icon={<Plus className="w-4 h-4" />}
              >
                {t('form.add_product')}
              </Button>
            </PermissionGate>
          </>
        )}
      />

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
          { key: 'name', label: t('form.product_name') },
          { key: 'brand', label: t('form.brand') },
          { key: 'model', label: 'Model' },
          { key: 'category', label: t('form.category') },
          { key: 'barcode', label: t('form.barcode') },
          { key: 'stockCode', label: t('form.product_code') },
          { key: 'supplier', label: t('form.description') },
          { key: 'availableInventory', label: t('stock.current_stock') },
          { key: 'price', label: t('pricing.sale_price') },
          { key: 'cost', label: t('pricing.purchase_price') },
          { key: 'kdvRate', label: t('form.vat_rate') },
          { key: 'unit', label: t('form.unit') },
          { key: 'reorderLevel', label: t('stock.min_stock') },
          { key: 'warranty', label: t('form.description') },
          { key: 'description', label: t('form.description') },
          { key: 'direction', label: t('form.description') },
          { key: 'maxGain', label: 'Max Gain (dB)' },
          { key: 'fittingRangeMin', label: 'Fitting Min (dB)' },
          { key: 'fittingRangeMax', label: 'Fitting Max (dB)' },
        ] as FieldDef[]}
        zodSchema={inventorySchema}
        uploadEndpoint={'/api/inventory/bulk-upload'}
        modalTitle={t('import_export.import_title')}
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
                <div className="text-sm">{t('import_export.import_completed')}: <strong>{importResult.created}</strong></div>
                <div className="text-sm">{t('messages.product_updated')}: <strong>{importResult.updated}</strong></div>
                <div className="text-sm">{t('import_export.import_failed')}: <strong>{importResult.errors?.length || 0}</strong></div>
              </div>
              <div>
                <Button variant="outline" onClick={() => setImportResult(null)}>{t('form.cancel')}</Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Add Item Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={t('form.add_product')}
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
        title={t('form.edit_product')}
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
        title={t('stock.title')}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 pr-4">
              <input data-allow-raw="true"
                type="text"
                placeholder={t('products.search_placeholder')}
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                className="w-full border border-border rounded-xl px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="w-56">
              <select data-allow-raw="true"
                value={modalCategoryFilter}
                onChange={(e) => setModalCategoryFilter(e.target.value)}
                className="w-full border border-border rounded-xl px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">{t('filters.all_categories')}</option>
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
              <button data-allow-raw="true"
                className="bg-green-600 text-white px-4 py-2 rounded-xl hover:bg-green-700"
                onClick={() => setIsAddModalOpen(true)}
              >
                {t('form.add_product')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto">
            {modalItems
              .filter((item) => {
                const q = modalSearch.trim().toLowerCase();
                if (modalCategoryFilter && item.category && item.category !== modalCategoryFilter) return false;
                if (!q) return true;
                const haystack = `${item.brand || ''} ${item.model || ''} ${item.name || ''} ${item.barcode || ''}`.toLowerCase();
                return haystack.includes(q);
              })
              .map((item) => {
                const available = item.availableInventory ?? 0;
                const price = item.price ?? 0;
                const serials = item.availableSerials || [];
                const isSelected = modalSelectedItemId === item.id;
                return (
                  <div key={item.id} className={`border rounded-2xl p-4 ${isSelected ? 'border-blue-500 bg-primary/10 shadow' : 'bg-white dark:bg-gray-800 border-border'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100">{item.brand} {item.model}</h4>
                        <p className="text-xs text-muted-foreground">{item.name || ''}</p>
                      </div>
                      <div className="text-right text-sm">
                        <div className="font-medium text-gray-900 dark:text-gray-100">₺{Number(price).toLocaleString()}</div>
                        <div className="text-muted-foreground">{t('columns.stock')}: {available}</div>
                      </div>
                    </div>

                    {serials && serials.length > 0 ? (
                      <div className="mb-2">
                        <label className="block text-xs text-muted-foreground mb-1">{t('form.barcode')}</label>
                        <select data-allow-raw="true"
                          value={modalSelectedItemId === item.id ? (modalSelectedSerial || '') : ''}
                          onChange={(e) => {
                            setModalSelectedItemId(item.id);
                            setModalSelectedSerial(e.target.value || null);
                          }}
                          className="w-full border border-border rounded-xl px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        >
                          <option value="">Seri seçin (opsiyonel)</option>
                          {serials.map((s: string) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground mb-2">Seri: <span className="text-destructive">Yok</span></p>
                    )}

                    <div className="flex justify-between items-center mt-3">
                      <div className="flex space-x-2">
                        <button data-allow-raw="true"
                          onClick={() => {
                            // map raw api item to InventoryForm shape as best-effort
                            const mapped: Partial<InventoryItem> = {
                              id: String(item.id),
                              name: item.name || '',
                              brand: item.brand || '',
                              model: item.model || '',
                              category: item.category || '',
                              availableInventory: item.availableInventory ?? 0,
                              price: item.price ?? 0,
                              barcode: item.barcode || ''
                            };
                            setSelectedItem(mapped as InventoryItem);
                            setIsEditModalOpen(true);
                          }}
                          className="text-primary hover:text-blue-800 text-sm"
                        >
                          {t('actions.edit')}
                        </button>
                        <button data-allow-raw="true"
                          onClick={async () => {
                            if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
                            try {
                              await deleteInventory(String(item.id));
                              setModalItems(prev => prev.filter(i => i.id !== item.id));
                              // Refresh main list
                              triggerInventoryRefresh();
                            } catch (e) {
                              console.error('Delete failed', e);
                              toast.error(t('delete.failed'));
                            }
                          }}
                          className="text-destructive hover:text-red-800 text-sm"
                        >
                          {t('actions.delete')}
                        </button>
                      </div>
                      <div>
                        <button data-allow-raw="true"
                          onClick={() => {
                            // toggle selection highlight
                            setModalSelectedItemId(prev => prev === item.id ? null : item.id);
                          }}
                          className="text-sm px-3 py-1 border rounded-xl"
                        >
                          {isSelected ? t('bulk_operations.deselect_all') : t('bulk_operations.select_all')}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          <div className="flex justify-end pt-4 border-t border-border">
            <button data-allow-raw="true"
              className="btn btn-secondary mr-3"
              onClick={() => setIsBulkUploadModalOpen(false)}
            >
              {t('form.cancel')}
            </button>
            <button data-allow-raw="true"
              className="btn btn-primary"
              onClick={() => {
                // perform a simple bulk action as placeholder: export selected
                if (modalSelectedItemId) {
                  const selected = modalItems.find(i => i.id === modalSelectedItemId);
                  if (selected) {
                    const csv = `ID,Name,Brand,Model,Category,Stock,Price\n${selected.id},"${selected.name}","${selected.brand}","${selected.model}","${selected.category}",${selected.availableInventory ?? 0},${selected.price ?? 0}`;
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `inventory_item_${selected.id}.csv`;
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                  }
                } else {
                  toast(t('bulk_operations.select_all'));
                }
              }}
            >
              {t('actions.export')}
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
        title={t('delete.title')}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {t('delete.confirm')}
              </h3>
              {itemToDelete && (
                <>
                  <p className="text-sm text-muted-foreground mb-2">
                    <span className="font-semibold">{itemToDelete.name}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t('delete.warning')}
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
              {t('delete.title')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
