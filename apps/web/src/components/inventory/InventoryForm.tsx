import { Button, Input, Select, Textarea } from '@x-ear/ui-web';
import React, { useState, useEffect } from 'react';
import { Save, X, AlertCircle } from 'lucide-react';
import { 
  InventoryFormData, 
  InventoryCategory, 
  InventoryType, 
  EarDirection,
  InventoryItem,
  CreateInventoryData,
  UpdateInventoryData
} from '../../types/inventory';
import { inventoryService } from '../../services/inventory.service';
import { SupplierAutocomplete } from '../../pages/inventory/components/SupplierAutocomplete';
import { CategoryAutocomplete } from '../../pages/inventory/components/CategoryAutocomplete';
import { BrandAutocomplete } from '../../pages/inventory/components/BrandAutocomplete';

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
  const [formData, setFormData] = useState<InventoryFormData>({
    name: '',
    brand: '',
    model: '',
    category: 'hearing_aid',
    type: undefined,
    barcode: '',
    supplier: '',
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
    location: '',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [featureInput, setFeatureInput] = useState('');
  
  // KDV and calculated fields
  const [kdvRate, setKdvRate] = useState<number>(20); // Default 20%
  const [onTrial, setOnTrial] = useState<number>(0);
  const [priceWithKdv, setPriceWithKdv] = useState<number>(0);
  const [kdvAmount, setKdvAmount] = useState<number>(0);
  const [totalInventoryValue, setTotalInventoryValue] = useState<number>(0);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name,
        brand: item.brand,
        model: item.model || '',
        category: item.category,
        type: item.type,
        barcode: item.barcode || '',
        supplier: item.supplier || '',
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
        location: item.location || '',
        notes: item.notes || ''
      });
    }
  }, [item]);

  // Calculate KDV and total inventory value automatically
  useEffect(() => {
    // Calculate KDV amount and price with KDV
    const kdvMultiplier = 1 + (kdvRate / 100);
    const calculatedPriceWithKdv = formData.price * kdvMultiplier;
    const calculatedKdvAmount = formData.price * (kdvRate / 100);
    
    setPriceWithKdv(calculatedPriceWithKdv);
    setKdvAmount(calculatedKdvAmount);
    
    // Calculate total inventory value
    const totalValue = formData.price * formData.availableInventory;
    setTotalInventoryValue(totalValue);
  }, [formData.price, formData.availableInventory, kdvRate]);

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
      let savedItem: InventoryItem;
      
      if (item) {
        // Update existing item
        const updateData: UpdateInventoryData = {
          id: item.id,
          ...formData
        };
        savedItem = await inventoryService.updateItem(item.id, updateData);
      } else {
        // Create new item
        const createData: CreateInventoryData = formData;
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

  const handleInputChange = (field: keyof InventoryFormData, value: any) => {
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

  const categoryTypes: Record<InventoryCategory, InventoryType[]> = {
    hearing_aid: ['digital_programmable', 'rechargeable_digital'],
    battery: ['zinc_air'],
    accessory: ['maintenance_kit'],
    ear_mold: ['custom_silicone'],
    cleaning_supplies: ['maintenance_kit'],
    amplifiers: ['wireless_amplifier']
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">
          {item ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}
        </h2>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{errors.submit}</p>
              </div>
            </div>
          </div>
        )}

        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ürün Adı *
            </label>
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Barkod numarasını girin"
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tip
            </label>
            <Select
              value={formData.type || ''}
              onChange={(e) => handleInputChange('type', e.target.value as InventoryType || undefined)}
              options={[
                { value: '', label: 'Tip seçin' },
                ...(categoryTypes[formData.category]?.map(type => ({
                  value: type,
                  label: type === 'digital_programmable' ? 'Dijital Programlanabilir' :
                         type === 'rechargeable_digital' ? 'Şarj Edilebilir Dijital' :
                         type === 'zinc_air' ? 'Çinko Hava' :
                         type === 'custom_silicone' ? 'Özel Silikon' :
                         type === 'maintenance_kit' ? 'Bakım Kiti' :
                         type === 'wireless_amplifier' ? 'Kablosuz Amplifikatör' : type
                })) || [])
              ]}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Stock and Pricing */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mevcut Stok *
            </label>
            <Input
              type="number"
              min="0"
              value={formData.availableInventory}
              onChange={(e) => handleInputChange('availableInventory', parseInt(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.availableInventory ? 'border-red-300' : 'border-gray-300'
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
              onChange={(e) => handleInputChange('reorderLevel', parseInt(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.reorderLevel ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.reorderLevel && <p className="mt-1 text-sm text-red-600">{errors.reorderLevel}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Denemede
            </label>
            <Input
              type="number"
              min="0"
              value={onTrial}
              onChange={(e) => setOnTrial(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Denemede olan ürün sayısı"
            />
            <p className="mt-1 text-xs text-gray-500">Müşterilerde deneme aşamasında olan ürün sayısı</p>
          </div>
        </div>

        {/* Pricing Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Satış Fiyatı (₺) *
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.price ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maliyet (₺)
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.cost}
              onChange={(e) => handleInputChange('cost', parseFloat(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.cost ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {errors.cost && <p className="mt-1 text-sm text-red-600">{errors.cost}</p>}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              KDV Dahil Birim Fiyat (₺)
            </label>
            <div className="relative">
              <Input
                type="number"
                value={priceWithKdv.toFixed(2)}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 cursor-not-allowed"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="text-gray-500 text-sm">₺</span>
              </div>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              KDV: ₺{kdvAmount.toFixed(2)} (%{kdvRate})
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Toplam Stok Değeri
            </label>
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <span className="text-xl font-bold text-blue-900">
                ₺{totalInventoryValue.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {formData.availableInventory} adet × ₺{formData.price.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Additional Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <SupplierAutocomplete
              value={formData.supplier || ''}
              onChange={(value) => handleInputChange('supplier', value)}
              placeholder="Tedarikçi adını girin veya seçin"
              label="Tedarikçi"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Konum
            </label>
            <Input
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Depo konumunu girin"
            />
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Garanti (Ay)
              </label>
              <Input
                type="number"
                min="0"
                value={formData.warranty}
                onChange={(e) => handleInputChange('warranty', parseInt(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.warranty ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.warranty && <p className="mt-1 text-sm text-red-600">{errors.warranty}</p>}
            </div>
          </div>
        )}

        {/* SGK Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SGK Kodu
            </label>
            <Input
              type="text"
              value={formData.sgkCode}
              onChange={(e) => handleInputChange('sgkCode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="SGK kodunu girin"
            />
          </div>

          <div className="flex items-center">
            <label className="flex items-center">
              <Input
                type="checkbox"
                checked={formData.isMinistryTracked}
                onChange={(e) => handleInputChange('isMinistryTracked', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Bakanlık takipli</span>
            </label>
          </div>
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
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Özellik ekleyin ve Enter'a basın"
            />
            <Button
              type="button"
              onClick={addFeature}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              variant='default'>
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
                  className="ml-2 text-blue-600 hover:text-blue-800"
                  variant='default'>
                  <X className="h-3 w-3" />
                </Button>
              </span>
            ))}
          </div>
        </div>

        {/* Description and Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Açıklama
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ürün açıklamasını girin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notlar
            </label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ek notlar girin"
            />
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            variant='default'>
            İptal
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            variant='default'>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default InventoryForm;