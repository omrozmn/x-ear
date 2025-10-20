import React, { useState } from 'react';
import { InventoryItem, InventoryCategory, InventoryType, EarDirection } from '../../../types/inventory';
import Button from '../../../components/ui/Button';

interface InventoryFormProps {
  item?: InventoryItem | null;
  onSubmit: (data: Partial<InventoryItem>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const InventoryForm: React.FC<InventoryFormProps> = ({
  item,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    brand: item?.brand || '',
    model: item?.model || '',
    category: item?.category || 'hearing_aid' as InventoryCategory,
    type: item?.type || 'digital_programmable' as InventoryType,
    barcode: item?.barcode || '',
    supplier: item?.supplier || '',
    description: item?.description || '',
    availableInventory: item?.availableInventory || 0,
    totalInventory: item?.totalInventory || 0,
    reorderLevel: item?.reorderLevel || 5,
    price: item?.price || 0,
    cost: item?.cost || 0,
    wholesalePrice: item?.wholesalePrice || 0,
    retailPrice: item?.retailPrice || 0,
    features: item?.features?.join(', ') || '',
    ear: item?.ear || 'both' as EarDirection,
    sgkCode: item?.sgkCode || '',
    isMinistryTracked: item?.isMinistryTracked || false,
    warranty: item?.warranty || 24,
    location: item?.location || '',
    notes: item?.notes || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Ürün adı zorunludur';
    }
    if (!formData.brand.trim()) {
      newErrors.brand = 'Marka zorunludur';
    }
    if (!formData.category) {
      newErrors.category = 'Kategori seçimi zorunludur';
    }
    if (formData.price <= 0) {
      newErrors.price = 'Fiyat 0\'dan büyük olmalıdır';
    }
    if (formData.availableInventory < 0) {
      newErrors.availableInventory = 'Stok miktarı negatif olamaz';
    }
    if (formData.reorderLevel < 0) {
      newErrors.reorderLevel = 'Minimum stok seviyesi negatif olamaz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData = {
      ...formData,
      features: formData.features ? formData.features.split(',').map(f => f.trim()).filter(f => f) : [],
      totalInventory: Math.max(formData.totalInventory, formData.availableInventory),
      usedInventory: Math.max(0, formData.totalInventory - formData.availableInventory),
    };

    onSubmit(submitData);
  };

  const categoryOptions = [
    { value: 'hearing_aid', label: 'İşitme Cihazı' },
    { value: 'battery', label: 'Pil' },
    { value: 'accessory', label: 'Aksesuar' },
    { value: 'ear_mold', label: 'Kulak Kalıbı' },
    { value: 'cleaning_supplies', label: 'Temizlik Malzemeleri' },
    { value: 'amplifiers', label: 'Amplifikatör' },
  ];

  const typeOptions = [
    { value: 'digital_programmable', label: 'Dijital Programlanabilir' },
    { value: 'rechargeable_digital', label: 'Şarj Edilebilir Dijital' },
    { value: 'zinc_air', label: 'Çinko Hava' },
    { value: 'custom_silicone', label: 'Özel Silikon' },
    { value: 'maintenance_kit', label: 'Bakım Kiti' },
    { value: 'wireless_amplifier', label: 'Kablosuz Amplifikatör' },
  ];

  const earOptions = [
    { value: 'left', label: 'Sol' },
    { value: 'right', label: 'Sağ' },
    { value: 'both', label: 'Her İkisi' },
  ];

  const brandOptions = [
    'Phonak', 'Oticon', 'Widex', 'Signia', 'ReSound', 'Starkey', 'Unitron', 'Bernafon'
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Temel Bilgiler</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ürün Adı *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ürün adını girin"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Marka *
            </label>
            <select
              value={formData.brand}
              onChange={(e) => handleChange('brand', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.brand ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Marka seçin</option>
              {brandOptions.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
            {errors.brand && <p className="text-red-500 text-sm mt-1">{errors.brand}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model
            </label>
            <input
              type="text"
              value={formData.model}
              onChange={(e) => handleChange('model', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Model adını girin"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kategori *
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.category ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              {categoryOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {errors.category && <p className="text-red-500 text-sm mt-1">{errors.category}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tip
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {typeOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kulak
            </label>
            <select
              value={formData.ear}
              onChange={(e) => handleChange('ear', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {earOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Stok Bilgileri</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mevcut Stok *
            </label>
            <input
              type="number"
              min="0"
              value={formData.availableInventory}
              onChange={(e) => handleChange('availableInventory', parseInt(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.availableInventory ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.availableInventory && <p className="text-red-500 text-sm mt-1">{errors.availableInventory}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Toplam Stok
            </label>
            <input
              type="number"
              min="0"
              value={formData.totalInventory}
              onChange={(e) => handleChange('totalInventory', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Stok Seviyesi *
            </label>
            <input
              type="number"
              min="0"
              value={formData.reorderLevel}
              onChange={(e) => handleChange('reorderLevel', parseInt(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.reorderLevel ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.reorderLevel && <p className="text-red-500 text-sm mt-1">{errors.reorderLevel}</p>}
          </div>
        </div>
      </div>

      {/* Pricing Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Fiyat Bilgileri</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Satış Fiyatı (₺) *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) => handleChange('price', parseFloat(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                errors.price ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Maliyet (₺)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.cost}
              onChange={(e) => handleChange('cost', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Toptan Fiyat (₺)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.wholesalePrice}
              onChange={(e) => handleChange('wholesalePrice', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Perakende Fiyat (₺)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.retailPrice}
              onChange={(e) => handleChange('retailPrice', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Ek Bilgiler</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Barkod
            </label>
            <input
              type="text"
              value={formData.barcode}
              onChange={(e) => handleChange('barcode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Barkod numarası"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tedarikçi
            </label>
            <input
              type="text"
              value={formData.supplier}
              onChange={(e) => handleChange('supplier', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Tedarikçi adı"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SGK Kodu
            </label>
            <input
              type="text"
              value={formData.sgkCode}
              onChange={(e) => handleChange('sgkCode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="SGK kodu"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Garanti (Ay)
            </label>
            <input
              type="number"
              min="0"
              value={formData.warranty}
              onChange={(e) => handleChange('warranty', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Konum
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => handleChange('location', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Depo konumu"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isMinistryTracked"
              checked={formData.isMinistryTracked}
              onChange={(e) => handleChange('isMinistryTracked', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isMinistryTracked" className="ml-2 block text-sm text-gray-900">
              Bakanlık takipli
            </label>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Özellikler
          </label>
          <input
            type="text"
            value={formData.features}
            onChange={(e) => handleChange('features', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Özellikleri virgülle ayırın (örn: Bluetooth, Su geçirmez, Şarj edilebilir)"
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Açıklama
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ürün açıklaması"
          />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notlar
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Ek notlar"
          />
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          İptal
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
        >
          {isLoading ? 'Kaydediliyor...' : (item ? 'Güncelle' : 'Kaydet')}
        </Button>
      </div>
    </form>
  );
};

export default InventoryForm;