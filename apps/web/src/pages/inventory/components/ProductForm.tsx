import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Textarea, Checkbox, Radio } from '@x-ear/ui-web';
import { InventoryFormData, InventoryCategory, InventoryType, EarDirection, InventoryItem } from '../../../types/inventory';

import { FeatureTagInput } from './FeatureTagInput';
import { SupplierAutocomplete } from './SupplierAutocomplete';
import { BrandAutocomplete } from './BrandAutocomplete';

interface ProductFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InventoryFormData) => Promise<void>;
  initialData?: InventoryItem | null;
  mode: 'create' | 'edit';
}

const _BRANDS = [
  'Phonak', 'Oticon', 'Widex', 'Signia', 'ReSound',
  'Starkey', 'Unitron', 'Bernafon', 'Hansaton', 'Sonic'
];

const CATEGORIES: { value: InventoryCategory; label: string; icon: string }[] = [
  { value: 'hearing_aid', label: 'İşitme Cihazı', icon: '🦻' },
  { value: 'battery', label: 'Pil', icon: '🔋' },
  { value: 'accessory', label: 'Aksesuar', icon: '🔌' },
  { value: 'ear_mold', label: 'Kulak Kalıbı', icon: '👂' },
  { value: 'cleaning_supplies', label: 'Temizlik Malzemesi', icon: '🧽' },
  { value: 'amplifiers', label: 'Amplifikatör', icon: '📢' }
];

const _TYPES: { value: InventoryType; label: string }[] = [
  { value: 'digital_programmable', label: 'Dijital Programlanabilir' },
  { value: 'rechargeable_digital', label: 'Şarjlı Dijital' },
  { value: 'zinc_air', label: 'Çinko Hava' },
  { value: 'custom_silicone', label: 'Özel Silikon' },
  { value: 'maintenance_kit', label: 'Bakım Kiti' },
  { value: 'wireless_amplifier', label: 'Kablosuz Amplifikatör' }
];

const EAR_DIRECTIONS: { value: EarDirection; label: string }[] = [
  { value: 'left', label: 'Sol' },
  { value: 'right', label: 'Sağ' },
  { value: 'both', label: 'Her İki Kulak' }
];

const VAT_RATES = [
  { value: '0', label: '%0' },
  { value: '1', label: '%1' },
  { value: '8', label: '%8' },
  { value: '18', label: '%18' },
  { value: '20', label: '%20' }
];

export const ProductForm: React.FC<ProductFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  mode
}) => {
  const [formData, setFormData] = useState<InventoryFormData>({
    name: '',
    brand: '',
    model: '',
    category: 'hearing_aid',
    type: 'digital_programmable',
    supplier: '',
    description: '',
    availableInventory: 0,
    reorderLevel: 5,
    price: 0,
    cost: 0,
    features: [],
    ear: 'both',
    sgkCode: '',
    isMinistryTracked: false,
    warranty: 12,
    location: '',
    notes: '',
    barcode: ''
  });

  const [extendedData, setExtendedData] = useState({
    serialNumbers: [] as string[],
    onTrialQuantity: 0,
    vatRate: '18',
    priceWithVat: 0,
    totalInventoryValue: 0
  });

  // Calculate price with VAT
  useEffect(() => {
    const vatMultiplier = 1 + (parseFloat(extendedData.vatRate) / 100);
    setExtendedData(prev => ({
      ...prev,
      priceWithVat: formData.price * vatMultiplier
    }));
  }, [formData.price, extendedData.vatRate]);

  // Calculate total inventory value
  useEffect(() => {
    setExtendedData(prev => ({
      ...prev,
      totalInventoryValue: extendedData.priceWithVat * formData.availableInventory
    }));
  }, [extendedData.priceWithVat, formData.availableInventory]);

  // Initialize form data when modal opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData && mode === 'edit') {
        setFormData({
          name: initialData.name || '',
          brand: initialData.brand || '',
          model: initialData.model || '',
          category: initialData.category || 'hearing_aid',
          type: initialData.type || 'digital_programmable',
          supplier: initialData.supplier || '',
          description: initialData.description || '',
          availableInventory: initialData.availableInventory || 0,
          reorderLevel: initialData.reorderLevel || 5,
          price: initialData.price || 0,
          cost: initialData.cost || 0,
          features: initialData.features || [],
          ear: initialData.ear || 'both',
          sgkCode: initialData.sgkCode || '',
          isMinistryTracked: initialData.isMinistryTracked || false,
          warranty: initialData.warranty || 12,
          location: initialData.location || '',
          notes: initialData.notes || '',
          barcode: initialData.barcode || ''
        });
        setExtendedData({
          serialNumbers: [],
          onTrialQuantity: 0,
          vatRate: '18',
          priceWithVat: 0,
          totalInventoryValue: 0
        });
      } else {
        // Reset form for create mode
        setFormData({
          name: '',
          brand: '',
          model: '',
          category: 'hearing_aid',
          type: 'digital_programmable',
          supplier: '',
          description: '',
          availableInventory: 0,
          reorderLevel: 5,
          price: 0,
          cost: 0,
          features: [],
          ear: 'both',
          sgkCode: '',
          isMinistryTracked: false,
          warranty: 12,
          location: '',
          notes: '',
          barcode: ''
        });
        setExtendedData({
          serialNumbers: [],
          onTrialQuantity: 0,
          vatRate: '18',
          priceWithVat: 0,
          totalInventoryValue: 0
        });
      }
    }
  }, [isOpen, initialData, mode]);

  const handleInputChange = (field: keyof InventoryFormData, value: any) => {
    setFormData(prev => {
      // Eğer değer değişmemişse state'i güncelleme
      if (prev[field] === value) {
        return prev;
      }
      return {
        ...prev,
        [field]: value
      };
    });
  };

  const handleExtendedChange = (field: string, value: any) => {
    setExtendedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFeaturesChange = (features: string[]) => {
    setFormData(prev => ({
      ...prev,
      features
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      alert('Ürün adı gereklidir');
      return false;
    }
    if (!formData.brand.trim()) {
      alert('Marka gereklidir');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Form submission error:', error);
      alert('Kayıt sırasında hata oluştu');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {mode === 'create' ? 'Yeni Ürün Ekle' : 'Ürün Düzenle'}
          </h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Temel Bilgiler */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
              Temel Bilgiler
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Select
                  label="Kategori"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value as InventoryCategory)}
                  options={CATEGORIES.map(cat => ({ value: cat.value, label: `${cat.icon} ${cat.label}` }))}
                  required
                  className="w-full bg-white dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ürün Adı *
                </label>
                <Input
                  key="product-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Ürün adını girin"
                  className="w-full dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  required
                />
              </div>

              <div>
                <BrandAutocomplete
                  value={formData.brand}
                  onChange={(v) => handleInputChange('brand', v)}
                  placeholder="Marka seçin veya yazın"
                  label="Marka"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Model
                </label>
                <Input
                  key="product-model"
                  type="text"
                  value={formData.model}
                  onChange={(e) => handleInputChange('model', e.target.value)}
                  placeholder="Model adını girin"
                  className="w-full dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Barkod No
                </label>
                <Input
                  key="product-barcode"
                  type="text"
                  value={formData.barcode}
                  onChange={(e) => handleInputChange('barcode', e.target.value)}
                  placeholder="Barkod numarasını girin"
                  className="w-full dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Cihaz Yönü
                </label>
                <div className="flex gap-4">
                  {EAR_DIRECTIONS.map(direction => (
                    <Radio
                      key={direction.value}
                      name="ear"
                      value={direction.value}
                      checked={formData.ear === direction.value}
                      onChange={(e) => handleInputChange('ear', e.target.value as EarDirection)}
                      label={direction.label}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Özellikler ve Tedarikçi */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
              Ek Bilgiler
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Özellikler
                </label>
                <FeatureTagInput
                  value={formData.features || []}
                  onChange={handleFeaturesChange}
                  placeholder="Özellik ekleyin ve Enter'a basın"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tedarikçi
                </label>
                <SupplierAutocomplete
                  value={formData.supplier || ''}
                  onChange={(value) => handleInputChange('supplier', value)}
                  placeholder="Tedarikçi seçin veya ekleyin"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Seri Numaraları
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    placeholder="Seri numaraları buraya eklenecek"
                    className="flex-1 dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    disabled
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      // Open serial numbers modal
                      console.log('Open serial numbers modal');
                    }}
                  >
                    Liste Aç
                  </Button>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Açıklama
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Ürün açıklamasını girin"
                  rows={3}
                  className="w-full dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>
            </div>
          </div>

          {/* Stok Bilgileri */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
              Stok Bilgileri
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mevcut Stok
                </label>
                <Input
                  key="available-inventory"
                  type="number"
                  value={formData.availableInventory}
                  onChange={(e) => handleInputChange('availableInventory', parseInt(e.target.value) || 0)}
                  min="0"
                  className="w-full dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Minimum Stok
                </label>
                <Input
                  key="reorder-level"
                  type="number"
                  value={formData.reorderLevel}
                  onChange={(e) => handleInputChange('reorderLevel', parseInt(e.target.value) || 0)}
                  min="0"
                  className="w-full dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Denemede
                </label>
                <Input
                  key="on-trial-quantity"
                  type="number"
                  value={extendedData.onTrialQuantity}
                  onChange={(e) => handleExtendedChange('onTrialQuantity', parseInt(e.target.value) || 0)}
                  min="0"
                  className="w-full dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>
            </div>
          </div>

          {/* Fiyat Bilgileri */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
              Fiyat Bilgileri
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Birim Fiyat (₺)
                </label>
                <Input
                  key="unit-price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  className="w-full dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>

              <div>
                <Select
                  label="KDV Oranı"
                  value={extendedData.vatRate}
                  onChange={(e) => handleExtendedChange('vatRate', e.target.value)}
                  options={VAT_RATES.map(rate => ({ value: rate.value, label: rate.label }))}
                  className="w-full dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  KDV Dahil Birim Fiyat (₺)
                </label>
                <Input
                  type="number"
                  value={extendedData.priceWithVat.toFixed(2)}
                  disabled
                  className="w-full bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Toplam Stok Değeri (₺)
                </label>
                <Input
                  type="number"
                  value={extendedData.totalInventoryValue.toFixed(2)}
                  disabled
                  className="w-full bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600"
                />
              </div>
            </div>
          </div>

          {/* Garanti Bilgileri */}
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2">
              Garanti Bilgileri
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Garanti Süresi (Ay)
                </label>
                <Input
                  key="warranty-period"
                  type="number"
                  value={formData.warranty}
                  onChange={(e) => handleInputChange('warranty', parseInt(e.target.value) || 0)}
                  min="0"
                  max="120"
                  className="w-full dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  SGK Kodu
                </label>
                <Input
                  key="sgk-code"
                  type="text"
                  value={formData.sgkCode}
                  onChange={(e) => handleInputChange('sgkCode', e.target.value)}
                  placeholder="SGK kodunu girin"
                  className="w-full dark:bg-gray-700 dark:text-white dark:border-gray-600"
                />
              </div>
            </div>

            <div className="flex items-center">
              <Checkbox
                id="isMinistryTracked"
                checked={formData.isMinistryTracked}
                onChange={(e) => handleInputChange('isMinistryTracked', e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="isMinistryTracked" className="text-sm text-gray-700 dark:text-gray-300">
                Bakanlık takipli ürün
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
            >
              İptal
            </Button>
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {mode === 'create' ? 'Kaydet' : 'Güncelle'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};