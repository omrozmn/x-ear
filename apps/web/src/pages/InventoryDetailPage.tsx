import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import axios from 'axios';
import { ArrowLeft, Edit, X, Trash2, Package, Save, Shield, Tag, AlertTriangle } from 'lucide-react';
import { Button, Input, Select, Textarea, Card, Modal } from '@x-ear/ui-web';
import { InventoryItem } from '../types/inventory';
import { CategoryAutocomplete } from './inventory/components/CategoryAutocomplete';
import { BrandAutocomplete } from './inventory/components/BrandAutocomplete';
import { SupplierAutocomplete } from './inventory/components/SupplierAutocomplete';
import { SerialNumberModal } from '../components/inventory/SerialNumberModal';
import { FeaturesTagManager } from '../components/inventory/FeaturesTagManager';

const api = axios.create({
  baseURL: 'http://localhost:5003'
});

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
  
  // KDV and calculated fields
  const [kdvRate, setKdvRate] = useState<number>(20);
  const [isPriceKdvIncluded, setIsPriceKdvIncluded] = useState<boolean>(false);
  const [isCostKdvIncluded, setIsCostKdvIncluded] = useState<boolean>(false);
  
  // Serial modal state
  const [isSerialModalOpen, setIsSerialModalOpen] = useState(false);
  
  // Delete confirmation modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Calculated values - use editedItem.price in edit mode for real-time updates
  const currentPrice = isEditMode && editedItem.price !== undefined ? editedItem.price : (item?.price || 0);
  const currentStock = isEditMode && editedItem.availableInventory !== undefined ? editedItem.availableInventory : (item?.availableInventory || 0);
  const priceWithKdv = currentPrice * (1 + kdvRate / 100);
  const kdvAmount = currentPrice * (kdvRate / 100);
  const totalInventoryValue = currentPrice * currentStock;
  const profitMargin = item && item.cost ? ((currentPrice - item.cost) / item.cost) * 100 : 0;

  useEffect(() => {
    loadItem();
  }, [id]);

  const loadItem = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/inventory/${id}`);
      
      if (response.data.success && response.data.data) {
        const apiItem = response.data.data;
        
        // Handle features
        let featuresArray: string[] = [];
        if (apiItem.features) {
          if (typeof apiItem.features === 'string') {
            featuresArray = apiItem.features.split(',').map((f: string) => f.trim()).filter(Boolean);
          } else if (Array.isArray(apiItem.features)) {
            featuresArray = apiItem.features;
          }
        }
        
        const mappedItem: InventoryItem = {
          id: String(apiItem.id),
          name: apiItem.name || '',
          brand: apiItem.brand || '',
          model: apiItem.model || '',
          category: apiItem.category || '',
          availableInventory: apiItem.availableInventory || apiItem.available_inventory || 0,
          totalInventory: apiItem.totalInventory || apiItem.total_inventory || 0,
          usedInventory: apiItem.usedInventory || apiItem.used_inventory || 0,
          reorderLevel: apiItem.reorderLevel || apiItem.minInventory || apiItem.min_inventory || 5,
          price: parseFloat(apiItem.price) || 0,
          vatIncludedPrice: parseFloat(apiItem.price) * 1.18 || 0,
          totalValue: (apiItem.availableInventory || apiItem.available_inventory || 0) * parseFloat(apiItem.price) || 0,
          cost: parseFloat(apiItem.cost) || 0,
          barcode: apiItem.barcode || '',
          supplier: apiItem.supplier || '',
          description: apiItem.description || '',
          status: (apiItem.availableInventory || apiItem.available_inventory || 0) > 0 ? 'available' : 'out_of_stock',
          features: featuresArray,
          warranty: apiItem.warranty,
          createdAt: apiItem.createdAt || apiItem.created_at || '',
          lastUpdated: apiItem.updatedAt || apiItem.updated_at || ''
        };
        
        setItem(mappedItem);
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
      await api.delete(`/api/inventory/${id}`);
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
        barcode: item.barcode,
        supplier: item.supplier,
        description: item.description,
        reorderLevel: item.reorderLevel,
        availableInventory: item.availableInventory,
      });
      setIsEditMode(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedItem({});
  };

  const handleSave = async () => {
    if (!item) return;
    
    try {
      const response = await api.put(`/api/inventory/${id}`, {
        name: editedItem.name,
        brand: editedItem.brand,
        model: editedItem.model,
        category: editedItem.category,
        price: editedItem.price,
        barcode: editedItem.barcode,
        supplier: editedItem.supplier,
        description: editedItem.description,
        minInventory: editedItem.reorderLevel,
        availableInventory: editedItem.availableInventory,
      });
      
      if (response.data.success) {
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
      const response = await api.put(`/api/inventory/${id}`, {
        availableSerials: serials,
      });
      
      if (response.data.success) {
        await loadItem();
      }
    } catch (err) {
      console.error('Save serials failed:', err);
      alert('Seri numaraları kaydetme işlemi başarısız oldu');
    }
  };

  const handleFeaturesChange = async (features: string[]) => {
    if (!item) return;
    
    try {
      const response = await api.put(`/api/inventory/${id}`, {
        features: features,
      });
      
      if (response.data.success) {
        await loadItem();
      }
    } catch (err) {
      console.error('Save features failed:', err);
      alert('Özellikler kaydetme işlemi başarısız oldu');
    }
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

      {/* Content - 2 Column Layout like Legacy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN - Product Information */}
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Ürün Bilgileri
              </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ürün Adı
                </label>
                {isEditMode ? (
                  <Input
                    value={editedItem.name || ''}
                    onChange={(e) => setEditedItem({ ...editedItem, name: e.target.value })}
                    fullWidth
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{item.name}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  {isEditMode ? (
                    <BrandAutocomplete
                      value={editedItem.brand || ''}
                      onChange={(value) => setEditedItem({ ...editedItem, brand: value })}
                      label="Marka"
                    />
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Marka
                      </label>
                      <p className="text-gray-900 dark:text-white">{item.brand}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Model
                  </label>
                  {isEditMode ? (
                    <Input
                      value={editedItem.model || ''}
                      onChange={(e) => setEditedItem({ ...editedItem, model: e.target.value })}
                      fullWidth
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{item.model}</p>
                  )}
                </div>
              </div>

              <div>
                {isEditMode ? (
                  <CategoryAutocomplete
                    value={editedItem.category || ''}
                    onChange={(value) => setEditedItem({ ...editedItem, category: value })}
                    label="Kategori"
                  />
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Kategori
                    </label>
                    <p className="text-gray-900 dark:text-white">{item.category}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Barkod
                  </label>
                  {isEditMode ? (
                    <Input
                      value={editedItem.barcode || ''}
                      onChange={(e) => setEditedItem({ ...editedItem, barcode: e.target.value })}
                      fullWidth
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white font-mono">{item.barcode || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Stok Kodu
                  </label>
                  {isEditMode ? (
                    <Input
                      value={editedItem.stockCode || ''}
                      onChange={(e) => setEditedItem({ ...editedItem, stockCode: e.target.value })}
                      fullWidth
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white font-mono">{item.stockCode || '-'}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  {isEditMode ? (
                    <SupplierAutocomplete
                      value={editedItem.supplier || ''}
                      onChange={(value) => setEditedItem({ ...editedItem, supplier: value })}
                      label="Tedarikçi"
                    />
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Tedarikçi
                      </label>
                      <p className="text-gray-900 dark:text-white">{item.supplier || '-'}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Birim
                  </label>
                  {isEditMode ? (
                    <Select
                      value={editedItem.unit || 'adet'}
                      onChange={(e) => setEditedItem({ ...editedItem, unit: e.target.value })}
                      options={[
                        { value: 'adet', label: 'Adet' },
                        { value: 'kutu', label: 'Kutu' },
                        { value: 'paket', label: 'Paket' },
                        { value: 'set', label: 'Set' },
                        { value: 'metre', label: 'Metre' },
                        { value: 'santimetre', label: 'Santimetre' },
                        { value: 'litre', label: 'Litre' },
                        { value: 'mililitre', label: 'Mililitre' },
                        { value: 'kilogram', label: 'Kilogram' },
                        { value: 'gram', label: 'Gram' },
                        { value: 'dakika', label: 'Dakika' },
                        { value: 'saat', label: 'Saat' },
                        { value: 'gün', label: 'Gün' },
                        { value: 'ay', label: 'Ay' },
                        { value: 'yıl', label: 'Yıl' },
                        { value: 'çift', label: 'Çift' },
                      ]}
                      fullWidth
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white capitalize">{item.unit || 'adet'}</p>
                  )}
                </div>
              </div>

              {item.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Açıklama
                  </label>
                  {isEditMode ? (
                    <Textarea
                      value={editedItem.description || ''}
                      onChange={(e) => setEditedItem({ ...editedItem, description: e.target.value })}
                      rows={3}
                      fullWidth
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">{item.description}</p>
                  )}
                </div>
              )}

              {/* Features Tag Manager */}
              <FeaturesTagManager
                features={item.features || []}
                onChange={handleFeaturesChange}
                isEditMode={isEditMode}
              />

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Oluşturulma: {item.createdAt ? new Date(item.createdAt).toLocaleDateString('tr-TR') : '-'}
                </p>
                {item.lastUpdated && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Son Güncelleme: {new Date(item.lastUpdated).toLocaleDateString('tr-TR')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card>
        </div>

        {/* RIGHT COLUMN - Stock, Pricing, Warranty */}
        <div className="space-y-6">

          {/* Stock Information Card */}
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Stok Bilgileri
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Mevcut Stok
                  </label>
                  {isEditMode ? (
                    <Input
                      type="number"
                      min="0"
                      value={editedItem.availableInventory ?? item.availableInventory}
                      onChange={(e) => setEditedItem({ ...editedItem, availableInventory: parseInt(e.target.value) || 0 })}
                      fullWidth
                    />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {item.availableInventory} adet
                    </p>
                  )}
                </div>

                {/* Min Stock Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Min. Stok Seviyesi
                  </label>
                  {isEditMode ? (
                    <Input
                      type="number"
                      min="0"
                      value={editedItem.reorderLevel || item.reorderLevel}
                      onChange={(e) => setEditedItem({ ...editedItem, reorderLevel: parseInt(e.target.value) || 0 })}
                      fullWidth
                    />
                  ) : (
                    <p className="text-lg text-gray-900 dark:text-white">
                      {item.reorderLevel} adet
                    </p>
                  )}
                </div>

                {/* Serial Number Button */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Button
                    variant="outline"
                    onClick={() => setIsSerialModalOpen(true)}
                    disabled={!item.availableInventory || item.availableInventory === 0}
                    fullWidth
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Seri No Listesi ({item.availableInventory || 0} adet)
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Pricing Information Card */}
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Fiyat Bilgileri
              </h2>
              
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Satış Fiyatı
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isPriceKdvIncluded}
                        onChange={(e) => setIsPriceKdvIncluded(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">KDV Dahil</span>
                    </label>
                  </div>
                  {isEditMode ? (
                    <>
                      <Input
                        type="number"
                        step="0.01"
                        value={editedItem.price || ''}
                        onChange={(e) => setEditedItem({ ...editedItem, price: parseFloat(e.target.value) })}
                        fullWidth
                      />
                      {isPriceKdvIncluded ? (
                        editedItem.price && editedItem.price > 0 && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            KDV Hariç: ₺{(editedItem.price / (1 + kdvRate / 100)).toFixed(2)}
                          </p>
                        )
                      ) : (
                        editedItem.price && editedItem.price > 0 && (
                          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                            KDV Dahil Toplam: ₺{(editedItem.price * (1 + kdvRate / 100)).toFixed(2)}
                          </p>
                        )
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-gray-900 dark:text-white">₺{item.price.toFixed(2)}</p>
                      {isPriceKdvIncluded ? (
                        item.price > 0 && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            KDV Hariç: ₺{(item.price / (1 + kdvRate / 100)).toFixed(2)}
                          </p>
                        )
                      ) : (
                        item.price > 0 && (
                          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                            KDV Dahil Toplam: ₺{(item.price * (1 + kdvRate / 100)).toFixed(2)}
                          </p>
                        )
                      )}
                    </>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Maliyet
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isCostKdvIncluded}
                        onChange={(e) => setIsCostKdvIncluded(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">KDV Dahil</span>
                    </label>
                  </div>
                  {isEditMode ? (
                    <>
                      <Input
                        type="number"
                        step="0.01"
                        value={editedItem.cost || ''}
                        onChange={(e) => setEditedItem({ ...editedItem, cost: parseFloat(e.target.value) || 0 })}
                        fullWidth
                      />
                      {isCostKdvIncluded ? (
                        editedItem.cost && editedItem.cost > 0 && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            KDV Hariç: ₺{(editedItem.cost / (1 + kdvRate / 100)).toFixed(2)}
                          </p>
                        )
                      ) : (
                        editedItem.cost && editedItem.cost > 0 && (
                          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                            KDV Dahil Toplam: ₺{(editedItem.cost * (1 + kdvRate / 100)).toFixed(2)}
                          </p>
                        )
                      )}
                    </>
                  ) : (
                    <>
                      <p className="text-gray-900 dark:text-white">₺{item.cost?.toFixed(2) || '0.00'}</p>
                      {isCostKdvIncluded ? (
                        item.cost && item.cost > 0 && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            KDV Hariç: ₺{(item.cost / (1 + kdvRate / 100)).toFixed(2)}
                          </p>
                        )
                      ) : (
                        item.cost && item.cost > 0 && (
                          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400 font-medium">
                            KDV Dahil Toplam: ₺{(item.cost * (1 + kdvRate / 100)).toFixed(2)}
                          </p>
                        )
                      )}
                    </>
                  )}
                  {item.cost && item.cost > 0 && (
                    <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                      Kar Marjı: %{profitMargin.toFixed(1)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    KDV Oranı
                  </label>
                  <Select
                    value={kdvRate.toString()}
                    onChange={(e) => setKdvRate(parseFloat(e.target.value))}
                    options={[
                      { value: '0', label: '%0' },
                      { value: '1', label: '%1' },
                      { value: '10', label: '%10' },
                      { value: '20', label: '%20' }
                    ]}
                    fullWidth
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    KDV Dahil Birim Fiyat
                  </label>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                      ₺{priceWithKdv.toFixed(2)}
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      KDV: ₺{kdvAmount.toFixed(2)} (%{kdvRate})
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Toplam Stok Değeri
                  </label>
                  <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-3 rounded-lg">
                    <p className="text-lg font-bold text-green-900 dark:text-green-100">
                      ₺{totalInventoryValue.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      {item.availableInventory} adet × ₺{item.price.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Warranty Information Card */}
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Garanti Bilgileri
              </h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                  <Shield className="w-4 h-4 mr-2" />
                  Garanti Süresi
                </label>
                <p className="text-gray-900 dark:text-white">
                  {item.warranty ? `${item.warranty} ay` : 'Belirtilmemiş'}
                </p>
              </div>
            </div>
          </Card>
        </div>
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
