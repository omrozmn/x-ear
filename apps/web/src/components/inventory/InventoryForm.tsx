import { Button, Input, Select, Textarea } from '@x-ear/ui-web';
import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Save, X, AlertCircle, Package } from 'lucide-react';
import {
  InventoryFormData,
  InventoryCategory,
  EarDirection,
  InventoryItem,
  CreateInventoryData,
  UpdateInventoryData
} from '../../types/inventory';
import { inventoryService } from '../../services/inventory.service';
import { SupplierAutocomplete } from '../../pages/inventory/components/SupplierAutocomplete';
import { CategoryAutocomplete } from '../../pages/inventory/components/CategoryAutocomplete';
import { BrandAutocomplete } from '../../pages/inventory/components/BrandAutocomplete';
import { SerialNumberModal } from './SerialNumberModal';
import {
  INVENTORY_KDV_RATE,
  INVENTORY_PRICE_KDV_INCLUDED,
  INVENTORY_COST_KDV_INCLUDED
} from '../../constants/storage-keys';

interface InventoryFormProps {
  item?: InventoryItem;
  onSave: (item: InventoryItem) => void;
  onCancel: () => void;
  className?: string;
}

export const InventoryForm: React.FC<InventoryFormProps> = ({
  item,
  onSave,
  onCancel,
  className = ''
}) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<InventoryFormData>({
    name: '',
    brand: '',
    model: '',
    category: 'hearing_aid',
    type: undefined,
    barcode: '',
    stockCode: '',
    supplier: '',
    unit: 'adet',
    packageQuantity: undefined,
    description: '',
    availableInventory: 0,
    reorderLevel: 5,
    price: 0,
    cost: 0,
    features: [],
    ear: undefined,
    sgkCode: '',
    isMinistryTracked: false,
    warranty: 12,
    location: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [featureInput, setFeatureInput] = useState('');

  // KDV and calculated fields - Load from localStorage
  const [kdvRate, setKdvRate] = useState<number>(() => {
    const saved = localStorage.getItem(INVENTORY_KDV_RATE);
    return saved ? parseFloat(saved) : 20;
  });
  // Computed values exposed for potential future display
  // const [onTrial, setOnTrial] = useState<number>(0);
  // const [priceWithKdv, setPriceWithKdv] = useState<number>(0);
  // const [kdvAmount, setKdvAmount] = useState<number>(0);
  const [totalInventoryValue, setTotalInventoryValue] = useState<number>(0);

  // KDV Dahil checkboxes - Load from localStorage
  const [isPriceKdvIncluded, setIsPriceKdvIncluded] = useState<boolean>(() => {
    const saved = localStorage.getItem(INVENTORY_PRICE_KDV_INCLUDED);
    return saved === 'true';
  });
  const [isCostKdvIncluded, setIsCostKdvIncluded] = useState<boolean>(() => {
    const saved = localStorage.getItem(INVENTORY_COST_KDV_INCLUDED);
    return saved === 'true';
  });

  // Serial number management
  const [isSerialModalOpen, setIsSerialModalOpen] = useState<boolean>(false);
  const [serials, setSerials] = useState<string[]>([]);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        brand: item.brand,
        model: item.model || '',
        category: item.category,
        type: item.type,
        barcode: item.barcode || '',
        stockCode: item.stockCode || '',
        supplier: item.supplier || '',
        unit: item.unit || 'adet',
        packageQuantity: item.packageQuantity,
        description: item.description || '',
        availableInventory: item.availableInventory,
        reorderLevel: item.reorderLevel,
        price: item.price,
        cost: item.cost || 0,
        features: item.features || [],
        ear: item.ear,
        sgkCode: item.sgkCode || '',
        isMinistryTracked: item.isMinistryTracked || false,
        warranty: item.warranty || 12,
        location: item.location || ''
      });

      // Load serials if item exists
      setSerials(item.availableSerials || []);
    }
  }, [item]);

  // Save KDV preferences to localStorage
  useEffect(() => {
    localStorage.setItem(INVENTORY_KDV_RATE, kdvRate.toString());
  }, [kdvRate]);

  useEffect(() => {
    localStorage.setItem(INVENTORY_PRICE_KDV_INCLUDED, isPriceKdvIncluded.toString());
  }, [isPriceKdvIncluded]);

  useEffect(() => {
    localStorage.setItem(INVENTORY_COST_KDV_INCLUDED, isCostKdvIncluded.toString());
  }, [isCostKdvIncluded]);

  // Calculate KDV and total inventory value automatically
  useEffect(() => {
    // Calculate prices based on KDV inclusion
    const priceExcludingKdv = isPriceKdvIncluded
      ? formData.price / (1 + kdvRate / 100)
      : formData.price;
    // const calculatedPriceWithKdv = isPriceKdvIncluded
    //   ? formData.price
    //   : formData.price * (1 + kdvRate / 100);
    // const calculatedKdvAmount = calculatedPriceWithKdv - priceExcludingKdv;

    // Update state with calculated values - commented out as not displayed
    // setPriceWithKdv(calculatedPriceWithKdv);
    // setKdvAmount(calculatedKdvAmount);

    // Calculate total inventory value (always use price excluding KDV)
    const totalValue = priceExcludingKdv * formData.availableInventory;
    setTotalInventoryValue(totalValue);
  }, [formData.price, formData.availableInventory, kdvRate, isPriceKdvIncluded]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Ürün adı gereklidir';
    }

    if (!formData.brand.trim()) {
      newErrors.brand = 'Marka gereklidir';
    }

    if (formData.availableInventory < 0) {
      newErrors.availableInventory = 'Stok miktarı negatif olamaz';
    }

    if (formData.reorderLevel < 0) {
      newErrors.reorderLevel = 'Yeniden sipariş seviyesi negatif olamaz';
    }

    if (formData.price <= 0) {
      newErrors.price = 'Fiyat sıfırdan büyük olmalıdır';
    }

    if (formData.cost && formData.cost < 0) {
      newErrors.cost = 'Maliyet negatif olamaz';
    }

    if (formData.warranty && formData.warranty < 0) {
      newErrors.warranty = 'Garanti süresi negatif olamaz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Generate stock code if not provided
      const finalFormData = { ...formData };
      if (!finalFormData.stockCode || finalFormData.stockCode.trim() === '') {
        // Generate unique stock code: BRAND-CATEGORY-TIMESTAMP
        const timestamp = Date.now().toString().slice(-6);
        const brandPrefix = finalFormData.brand.substring(0, 3).toUpperCase();
        const categoryPrefix = finalFormData.category.substring(0, 2).toUpperCase();
        finalFormData.stockCode = `${brandPrefix}-${categoryPrefix}-${timestamp}`;
      }

      // Convert empty barcode to null to avoid UNIQUE constraint issues
      if (!finalFormData.barcode || finalFormData.barcode.trim() === '') {
        finalFormData.barcode = undefined;
      }

      let savedItem: InventoryItem;

      if (item) {
        // Update existing item
        const updateData: UpdateInventoryData = {
          id: item.id,
          ...finalFormData,
          availableSerials: serials.filter(s => s.trim() !== '')
        };
        console.log('🔄 UPDATE DATA:', {
          features: updateData.features,
          availableSerials: updateData.availableSerials,
          serialsCount: updateData.availableSerials?.length
        });
        savedItem = await inventoryService.updateItem(item.id, updateData);
      } else {
        // Create new item
        const createData: CreateInventoryData = {
          ...finalFormData,
          availableSerials: serials.filter(s => s.trim() !== '')
        };
        console.log('✨ CREATE DATA:', {
          features: createData.features,
          availableSerials: createData.availableSerials,
          serialsCount: createData.availableSerials?.length
        });
        savedItem = await inventoryService.createItem(createData);
      }

      onSave(savedItem);
    } catch (error) {
      console.error('Save failed:', error);
      setErrors({
        submit: error instanceof Error ? error.message : 'Kaydetme işlemi başarısız oldu'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof InventoryFormData, value: string | number | boolean | string[] | null | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const addFeature = () => {
    if (featureInput.trim() && !formData.features?.includes(featureInput.trim())) {
      setFormData(prev => ({
        ...prev,
        features: [...(prev.features || []), featureInput.trim()]
      }));
      setFeatureInput('');
    }
  };

  const removeFeature = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features?.filter(f => f !== feature) || []
    }));
  };

  const handleSaveSerials = (newSerials: string[]) => {
    // Update local state
    setSerials(newSerials);

    // Also update formData so it gets saved when form is submitted
    setFormData(prev => ({
      ...prev,
      availableSerials: newSerials
    }));

    setIsSerialModalOpen(false);
  };

  // Category-to-type mapping - reserved for potential dynamic type selection
  // const categoryTypes: Record<InventoryCategory, InventoryType[]> = {
  //   hearing_aid: ['digital_programmable', 'rechargeable_digital'],
  //   battery: ['zinc_air'],
  //   accessory: ['maintenance_kit'],
  //   ear_mold: ['custom_silicone'],
  //   cleaning_supplies: ['maintenance_kit'],
  //   amplifiers: ['wireless_amplifier']
  // };

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{errors.submit}</p>
              </div>
            </div>
          </div>
        )}

        {/* TEMEL BİLGİLER */}
        <div className="border-b border-gray-200 pb-2 mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Temel Bilgiler</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ürün Adı *
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
              placeholder="Ürün adını girin"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          <div>
            <BrandAutocomplete
              value={formData.brand}
              onChange={(value) => handleInputChange('brand', value)}
              placeholder="Marka seçin veya yazın"
              label="Marka"
              required
              error={errors.brand}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Model
            </label>
            <Input
              type="text"
              value={formData.model}
              onChange={(e) => handleInputChange('model', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Model adını girin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Barkod
            </label>
            <Input
              type="text"
              value={formData.barcode}
              onChange={(e) => handleInputChange('barcode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Barkod numarasını girin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stok Kodu
            </label>
            <Input
              type="text"
              value={formData.stockCode}
              onChange={(e) => handleInputChange('stockCode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Stok kodunu girin"
            />
          </div>
        </div>

        {/* Category and Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <CategoryAutocomplete
              value={formData.category}
              onChange={(value) => {
                handleInputChange('category', value as InventoryCategory);
                // Reset type when category changes
                handleInputChange('type', undefined);
              }}
              placeholder="Kategori seçin veya yazın"
              label="Kategori"
              required
              error={errors.category}
            />
          </div>

        </div>

        {/* STOK VE FİYATLANDIRMA */}
        <div className="border-b border-gray-200 pb-2 mb-4 mt-8">
          <h3 className="text-lg font-semibold text-gray-900">Stok ve Fiyatlandırma</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mevcut Stok *
            </label>
            <Input
              type="number"
              min="0"
              value={formData.availableInventory || ''}
              onChange={(e) => {
                const val = e.target.value;
                handleInputChange('availableInventory', val === '' ? 0 : parseInt(val) || 0);
              }}
              className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.availableInventory ? 'border-red-300' : 'border-gray-300'
                }`}
            />
            {errors.availableInventory && <p className="mt-1 text-sm text-red-600">{errors.availableInventory}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Yeniden Sipariş Seviyesi *
            </label>
            <Input
              type="number"
              min="0"
              value={formData.reorderLevel}
              onChange={(e) => handleInputChange('reorderLevel', e.target.value === '' ? 0 : parseInt(e.target.value))}
              className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.reorderLevel ? 'border-red-300' : 'border-gray-300'
                }`}
            />
            {errors.reorderLevel && <p className="mt-1 text-sm text-red-600">{errors.reorderLevel}</p>}
          </div>

        </div>

        {/* Pricing Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Satış Fiyatı (₺) *
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  data-allow-raw="true"
                  type="checkbox"
                  checked={isPriceKdvIncluded}
                  onChange={(e) => setIsPriceKdvIncluded(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                <span className="text-sm text-gray-600">KDV Dahil</span>
              </label>
            </div>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.price || ''}
              onChange={(e) => {
                const val = e.target.value;
                handleInputChange('price', val === '' ? 0 : parseFloat(val) || 0);
              }}
              className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.price ? 'border-red-300' : 'border-gray-300'
                }`}
            />
            {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
            {isPriceKdvIncluded ? (
              <p className="mt-1 text-xs text-gray-500">
                KDV Hariç: ₺{(formData.price / (1 + kdvRate / 100)).toFixed(2)}
              </p>
            ) : (
              formData.price > 0 && (
                <p className="mt-1 text-xs text-blue-600 font-medium">
                  KDV Dahil Toplam: ₺{(formData.price * (1 + kdvRate / 100)).toFixed(2)}
                </p>
              )
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Maliyet (₺)
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  data-allow-raw="true"
                  type="checkbox"
                  checked={isCostKdvIncluded}
                  onChange={(e) => setIsCostKdvIncluded(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                />
                <span className="text-sm text-gray-600">KDV Dahil</span>
              </label>
            </div>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.cost || ''}
              onChange={(e) => {
                const val = e.target.value;
                handleInputChange('cost', val === '' ? 0 : parseFloat(val) || 0);
              }}
              className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.cost ? 'border-red-300' : 'border-gray-300'
                }`}
            />
            {errors.cost && <p className="mt-1 text-sm text-red-600">{errors.cost}</p>}
            {isCostKdvIncluded ? (
              (formData.cost || 0) > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                  KDV Hariç: ₺{((formData.cost || 0) / (1 + kdvRate / 100)).toFixed(2)}
                </p>
              )
            ) : (
              (formData.cost || 0) > 0 && (
                <p className="mt-1 text-xs text-blue-600 font-medium">
                  KDV Dahil Toplam: ₺{((formData.cost || 0) * (1 + kdvRate / 100)).toFixed(2)}
                </p>
              )
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Toplam Stok Değeri
            </label>
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-2xl border border-blue-200">
              <span className="text-xl font-bold text-blue-900">
                ₺{totalInventoryValue.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {formData.availableInventory} adet × ₺{formData.price.toFixed(2)}
            </p>
          </div>
        </div>

        {/* TEDARİK VE DETAYLAR */}
        <div className="border-b border-gray-200 pb-2 mb-4 mt-8">
          <h3 className="text-lg font-semibold text-gray-900">Tedarik ve Detaylar</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <SupplierAutocomplete
              value={formData.supplier || ''}
              onChange={(value) => handleInputChange('supplier', value)}
              placeholder="Tedarikçi adını girin veya seçin"
              label="Tedarikçi"
              onSupplierCreated={(_name, id) => {
                if (id) {
                  navigate({ to: '/suppliers/$supplierId', params: { supplierId: id } });
                } else {
                  navigate({ to: '/suppliers' });
                }
              }}
            />
          </div>

        </div>

        {/* Unit and Warranty - All Categories */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Birim
            </label>
            <Select
              value={formData.unit || 'adet'}
              onChange={(e) => handleInputChange('unit', e.target.value)}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Package Quantity - Only shown when unit is 'paket' */}
          {formData.unit === 'paket' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Paket İçi Adet
              </label>
              <Input
                type="number"
                min="1"
                value={formData.packageQuantity || ''}
                onChange={(e) => handleInputChange('packageQuantity', e.target.value === '' ? undefined : parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Örn: 6"
              />
              <p className="mt-1 text-xs text-gray-500">
                Her pakette kaç adet ürün var?
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Garanti (Ay)
            </label>
            <Input
              type="number"
              min="0"
              value={formData.warranty}
              onChange={(e) => handleInputChange('warranty', e.target.value === '' ? 0 : parseInt(e.target.value))}
              className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.warranty ? 'border-red-300' : 'border-gray-300'
                }`}
            />
            {errors.warranty && <p className="mt-1 text-sm text-red-600">{errors.warranty}</p>}
          </div>
        </div>

        {/* Hearing Aid Specific */}
        {formData.category === 'hearing_aid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kulak Yönü
              </label>
              <Select
                value={formData.ear || ''}
                onChange={(e) => handleInputChange('ear', e.target.value as EarDirection || undefined)}
                options={[
                  { value: '', label: 'Seçin' },
                  { value: 'left', label: 'Sol' },
                  { value: 'right', label: 'Sağ' },
                  { value: 'both', label: 'Her İkisi' }
                ]}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* ÖZELLİKLER VE SERİ NUMARALAR */}
        <div className="border-b border-gray-200 pb-2 mb-4 mt-8">
          <h3 className="text-lg font-semibold text-gray-900">Özellikler ve Seri Numaralar</h3>
        </div>

        {/* Features */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Özellikler
          </label>
          <div className="flex space-x-2 mb-2">
            <Input
              type="text"
              value={featureInput}
              onChange={(e) => setFeatureInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Özellik ekleyin ve Enter'a basın"
            />
            <Button
              type="button"
              onClick={addFeature}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              Ekle
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.features?.map((feature, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
              >
                {feature}
                <Button
                  type="button"
                  onClick={() => removeFeature(feature)}
                  variant="ghost"
                  size="sm"
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  <X className="h-3 w-3" />
                </Button>
              </span>
            ))}
          </div>
        </div>

        {/* Serial Numbers */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Seri Numaraları
            </label>
            <Button
              type="button"
              onClick={() => setIsSerialModalOpen(true)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              <Package className="w-4 h-4" />
              Seri No Yönet ({serials.filter(s => s.trim() !== '').length})
            </Button>
          </div>
          <p className="text-sm text-gray-500">
            Mevcut stok: {formData.availableInventory} | Kayıtlı seri no: {serials.filter(s => s.trim() !== '').length}
          </p>
        </div>

        {/* AÇIKLAMA */}
        <div className="border-b border-gray-200 pb-2 mb-4 mt-8">
          <h3 className="text-lg font-semibold text-gray-900">Açıklama</h3>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Açıklama
          </label>
          <Textarea
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ürün açıklamasını girin"
          />
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button
            type="button"
            onClick={onCancel}
            variant="outline"
            className="px-4 py-2 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 transition-colors"
          >
            İptal
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </form>

      {/* Serial Number Modal */}
      <SerialNumberModal
        isOpen={isSerialModalOpen}
        onClose={() => setIsSerialModalOpen(false)}
        productName={formData.name || 'Yeni Ürün'}
        availableCount={formData.availableInventory}
        existingSerials={serials}
        onSave={handleSaveSerials}
      />
    </div>
  );
};

export default InventoryForm;