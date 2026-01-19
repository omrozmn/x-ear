import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  getInventory,
  deleteInventory,
  updateInventory,
  createInventorySerials
} from '@/api/client/inventory.client';
import { ArrowLeft, Edit, X, Trash2, Package, Save, AlertTriangle } from 'lucide-react';
import { Button, Modal } from '@x-ear/ui-web';
import { InventoryItem, InventoryCategory } from '../types/inventory';
import { SerialNumberModal } from '../components/inventory/SerialNumberModal';
import { ProductInfoSection } from './inventory/components/ProductInfoSection';
import { StockInfoSection } from './inventory/components/StockInfoSection';
import { PricingInfoSection } from './inventory/components/PricingInfoSection';
import { WarrantyInfoSection } from './inventory/components/WarrantyInfoSection';
import { InventoryMovementsTable } from '../components/party/InventoryMovementsTable';
import { unwrapObject } from '../utils/response-unwrap';

interface InventoryDetailPageProps {
  id: string;
}

export const InventoryDetailPage: React.FC<InventoryDetailPageProps> = ({ id }) => {
  const navigate = useNavigate();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedItem, setEditedItem] = useState<Partial<InventoryItem>>({});

  // KDV and calculated fields - Load from localStorage
  const [kdvRate, setKdvRate] = useState<number>(() => {
    const saved = localStorage.getItem('inventory_kdv_rate');
    return saved ? parseFloat(saved) : 20;
  });
  const [isPriceKdvIncluded, setIsPriceKdvIncluded] = useState<boolean>(() => {
    const saved = localStorage.getItem('inventory_price_kdv_included');
    return saved === 'true';
  });
  const [isCostKdvIncluded, setIsCostKdvIncluded] = useState<boolean>(() => {
    const saved = localStorage.getItem('inventory_cost_kdv_included');
    return saved === 'true';
  });

  // Serial modal state
  const [isSerialModalOpen, setIsSerialModalOpen] = useState(false);

  // Delete confirmation modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Save KDV preferences to localStorage
  useEffect(() => {
    localStorage.setItem('inventory_kdv_rate', kdvRate.toString());
  }, [kdvRate]);

  useEffect(() => {
    localStorage.setItem('inventory_price_kdv_included', isPriceKdvIncluded.toString());
  }, [isPriceKdvIncluded]);

  useEffect(() => {
    localStorage.setItem('inventory_cost_kdv_included', isCostKdvIncluded.toString());
  }, [isCostKdvIncluded]);

  useEffect(() => {
    loadItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadItem = async () => {
    try {
      setLoading(true);
      const response = await getInventory(id);
      // unwrapObject returns T, and response.data is T (InventoryItemRead)
      const apiItem = response.data;

      if (apiItem) {

        // Handle features
        let featuresArray: string[] = [];
        const featuresValue = apiItem.features as unknown;
        if (featuresValue) {
          if (typeof featuresValue === 'string') {
            featuresArray = (featuresValue as string).split(',').map((f: string) => f.trim()).filter(Boolean);
          } else if (Array.isArray(featuresValue)) {
            featuresArray = featuresValue as string[];
          }
        }

        // Handle serial numbers
        let serialsArray: string[] = [];
        if (apiItem.availableSerials) {
          if (typeof apiItem.availableSerials === 'string') {
            try {
              serialsArray = JSON.parse(apiItem.availableSerials);
            } catch {
              serialsArray = [];
            }
          } else if (Array.isArray(apiItem.availableSerials)) {
            serialsArray = apiItem.availableSerials;
          }
        }

        const mappedItem: InventoryItem = {
          id: String(apiItem.id),
          name: apiItem.name || '',
          brand: apiItem.brand || '',
          model: apiItem.model || '',
          category: (apiItem.category || 'hearing_aid') as InventoryCategory,
          availableInventory: apiItem.availableInventory || 0,
          totalInventory: apiItem.totalInventory || 0,
          usedInventory: apiItem.usedInventory || 0,
          reorderLevel: apiItem.reorderLevel || 5,
          price: Number(apiItem.price) || 0,
          vatIncludedPrice: Number(apiItem.price) * 1.18 || 0,
          totalValue: (apiItem.availableInventory || 0) * Number(apiItem.price) || 0,
          cost: Number(apiItem.cost) || 0,
          barcode: apiItem.barcode || '',
          supplier: apiItem.supplier || '',
          description: apiItem.description || '',
          status: (apiItem.availableInventory || 0) > 0 ? 'available' : 'out_of_stock',
          features: featuresArray,
          availableSerials: serialsArray,
          warranty: apiItem.warranty,
          // include item's tax rate for use by UI components
          taxRate: (apiItem.vatRate || (apiItem.kdv as unknown as number)) as number | undefined,
          // preserve flags sent by backend so UI edit mode can read them
          priceIncludesKdv: apiItem.priceIncludesKdv,
          costIncludesKdv: apiItem.costIncludesKdv,
          stockCode: typeof apiItem.stockCode === 'string' ? apiItem.stockCode : String(apiItem.stockCode || ''),
          unit: apiItem.unit || 'adet',
          createdAt: typeof apiItem.createdAt === 'string' ? apiItem.createdAt : String(apiItem.createdAt || ''),
          lastUpdated: typeof apiItem.updatedAt === 'string' ? apiItem.updatedAt : String(apiItem.updatedAt || '')
        };

        setItem(mappedItem);
        // Ensure KDV selector reflects the product's stored tax rate when available
        if ((apiItem.kdv || apiItem.vatRate) !== undefined) {
          setKdvRate(Number(apiItem.kdv ?? apiItem.vatRate));
        }

        // Load whether price and cost already include KDV from API if provided
        if (apiItem.priceIncludesKdv !== undefined) {
          setIsPriceKdvIncluded(Boolean(apiItem.priceIncludesKdv));
        }

        if (apiItem.costIncludesKdv !== undefined) {
          setIsCostKdvIncluded(Boolean(apiItem.costIncludesKdv));
        }
      }
      setError(null);
    } catch (err) {
      console.error('Failed to load item:', err);
      setError(err instanceof Error ? err.message : 'Ürün yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!item) return;

    try {
      await deleteInventory(id);
      setIsDeleteModalOpen(false);
      navigate({ to: '/inventory' });
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Silme işlemi başarısız oldu');
    }
  };

  const handleEdit = () => {
    if (item) {
      setEditedItem({
        name: item.name,
        brand: item.brand,
        model: item.model,
        category: item.category,
        price: item.price,
        cost: item.cost,
        barcode: item.barcode,
        stockCode: item.stockCode,
        supplier: item.supplier,
        description: item.description,
        reorderLevel: item.reorderLevel,
        availableInventory: item.availableInventory,
        unit: item.unit,
      });
      setIsEditMode(true);
      // When entering edit mode, ensure toggles reflect persisted flags
      setIsPriceKdvIncluded(Boolean(item.priceIncludesKdv ?? false));
      setIsCostKdvIncluded(Boolean(item.costIncludesKdv ?? false));
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedItem({});
    // Revert any flag changes to last persisted values (from item)
    if (item) {
      setIsPriceKdvIncluded(Boolean(item.priceIncludesKdv ?? false));
      setIsCostKdvIncluded(Boolean(item.costIncludesKdv ?? false));
    }
  };

  const handleSave = async () => {
    if (!item) return;

    try {
      // include kdv in the payload so backend can persist kdv_rate
      const payload = {
        name: editedItem.name ?? item.name,
        brand: editedItem.brand ?? item.brand,
        model: editedItem.model,
        category: editedItem.category ?? item.category,
        price: editedItem.price ?? item.price,
        cost: editedItem.cost,
        barcode: editedItem.barcode,
        stockCode: editedItem.stockCode,
        supplier: editedItem.supplier,
        description: editedItem.description,
        minInventory: editedItem.reorderLevel,
        availableInventory: editedItem.availableInventory,
        unit: editedItem.unit,
        kdv: kdvRate,
        priceIncludesKdv: isPriceKdvIncluded,
        costIncludesKdv: isCostKdvIncluded,
      };

      const response = await updateInventory(id, payload);

      // Response is direct data from Orval
      if (response) {
        await loadItem();
        setIsEditMode(false);
        setEditedItem({});
      }
    } catch (err) {
      console.error('Save failed:', err);
      alert('Kaydetme işlemi başarısız oldu');
    }
  };

  const handleSaveSerials = async (serials: string[]) => {
    if (!item) return;

    try {
      console.log('💾 SAVING SERIALS:', {
        itemId: id,
        serials,
        count: serials.length
      });

      const response = await createInventorySerials(id, { serials });

      // If inventoryAddSerialNumbers returns void, remove the success check and just reload
      await loadItem();
    } catch (err) {
      console.error('Save serials failed:', err);
      alert('Seri numaraları kaydetme işlemi başarısız oldu');
    }
  };

  const handleFeaturesChange = async (features: string[]) => {
    if (!item) return;

    try {
      console.log('🏷️ SAVING FEATURES:', {
        itemId: id,
        features,
        count: features.length
      });

      // Update payload requires partial features
      const response = await updateInventory(id, { features } as unknown as any);

      if (response && response.data) {
        await loadItem();
      }
    } catch (err) {
      console.error('Save features failed:', err);
      alert('Özellikler kaydetme işlemi başarısız oldu');
    }
  };

  const handleEditChange = (updates: Partial<InventoryItem>) => {
    setEditedItem({ ...editedItem, ...updates });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-300">
            {error || 'Ürün bulunamadı'}
          </h3>
        </div>
        <Button onClick={() => navigate({ to: '/inventory' })} className="mt-4">
          Geri Dön
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => navigate({ to: '/inventory' })}
            icon={<ArrowLeft className="w-4 h-4" />}
          >
            Geri
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <Package className="w-6 h-6 mr-2" />
              {item.name}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">{item.brand} - {item.model}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {!isEditMode ? (
            <>
              <Button
                variant="outline"
                onClick={handleEdit}
                icon={<Edit className="w-4 h-4" />}
              >
                Düzenle
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                icon={<Trash2 className="w-4 h-4" />}
              >
                Sil
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleCancelEdit}
                icon={<X className="w-4 h-4" />}
              >
                İptal
              </Button>
              <Button
                onClick={handleSave}
                icon={<Save className="w-4 h-4" />}
              >
                Kaydet
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Content - 2 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN - Product Information & Stock */}
        <div className="space-y-6">
          <ProductInfoSection
            item={item}
            isEditMode={isEditMode}
            editedItem={editedItem}
            onEditChange={handleEditChange}
            onFeaturesChange={handleFeaturesChange}
          />

          <StockInfoSection
            item={item}
            isEditMode={isEditMode}
            editedItem={editedItem}
            onEditChange={handleEditChange}
            onSerialModalOpen={() => setIsSerialModalOpen(true)}
          />
        </div>

        {/* RIGHT COLUMN - Pricing & Warranty */}
        <div className="space-y-6">
          <PricingInfoSection
            item={item}
            isEditMode={isEditMode}
            editedItem={editedItem}
            onEditChange={handleEditChange}
            kdvRate={kdvRate}
            onKdvRateChange={setKdvRate}
            isPriceKdvIncluded={isPriceKdvIncluded}
            onPriceKdvIncludedChange={setIsPriceKdvIncluded}
            isCostKdvIncluded={isCostKdvIncluded}
            onCostKdvIncludedChange={setIsCostKdvIncluded}
          />

          <WarrantyInfoSection item={item} />
        </div>
      </div>

      {/* Inventory Movements Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Ürün Hareketleri</h2>
        <InventoryMovementsTable inventoryId={id} />
      </div>

      {/* Serial Number Modal */}
      <SerialNumberModal
        isOpen={isSerialModalOpen}
        onClose={() => setIsSerialModalOpen(false)}
        productName={item.name}
        availableCount={item.availableInventory}
        existingSerials={item.availableSerials || []}
        onSave={handleSaveSerials}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
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
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span className="font-semibold">{item.name}</span> ürününü silmek üzeresiniz.
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Bu işlem geri alınamaz. Ürünle ilgili tüm veriler kalıcı olarak silinecektir.
              </p>
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
