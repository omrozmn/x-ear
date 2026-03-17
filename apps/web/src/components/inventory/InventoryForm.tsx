import { Button, Input, Select, Textarea, FieldWrapper, VStack } from '@x-ear/ui-web';
import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Save, X, AlertCircle, Package } from 'lucide-react';
import { BarcodeInput } from '../barcode';
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
    name: '', brand: '', model: '', category: 'hearing_aid', type: undefined,
    barcode: '', stockCode: '', supplier: '', unit: 'adet', packageQuantity: undefined,
    description: '', availableInventory: 0, reorderLevel: 5, price: 0, cost: 0,
    features: [], ear: undefined, sgkCode: '', isMinistryTracked: false, warranty: 12, location: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [featureInput, setFeatureInput] = useState('');
  const [kdvRate, setKdvRate] = useState<number>(() => {
    const saved = localStorage.getItem(INVENTORY_KDV_RATE);
    return saved ? parseFloat(saved) : 20;
  });
  const [totalInventoryValue, setTotalInventoryValue] = useState<number>(0);
  const [isPriceKdvIncluded, setIsPriceKdvIncluded] = useState<boolean>(() => localStorage.getItem(INVENTORY_PRICE_KDV_INCLUDED) === 'true');
  const [isCostKdvIncluded, setIsCostKdvIncluded] = useState<boolean>(() => localStorage.getItem(INVENTORY_COST_KDV_INCLUDED) === 'true');
  const [isSerialModalOpen, setIsSerialModalOpen] = useState<boolean>(false);
  const [serials, setSerials] = useState<string[]>([]);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name, brand: item.brand, model: item.model || '', category: item.category,
        type: item.type, barcode: item.barcode || '', stockCode: item.stockCode || '',
        supplier: item.supplier || '', unit: item.unit || 'adet', packageQuantity: item.packageQuantity,
        description: item.description || '', availableInventory: item.availableInventory,
        reorderLevel: item.reorderLevel, price: item.price, cost: item.cost || 0,
        features: item.features || [], ear: item.ear, sgkCode: item.sgkCode || '',
        isMinistryTracked: item.isMinistryTracked || false, warranty: item.warranty || 12, location: item.location || ''
      });
      setSerials(item.availableSerials || []);
    }
  }, [item]);

  useEffect(() => { localStorage.setItem(INVENTORY_KDV_RATE, kdvRate.toString()); }, [kdvRate]);
  useEffect(() => { localStorage.setItem(INVENTORY_PRICE_KDV_INCLUDED, isPriceKdvIncluded.toString()); }, [isPriceKdvIncluded]);
  useEffect(() => { localStorage.setItem(INVENTORY_COST_KDV_INCLUDED, isCostKdvIncluded.toString()); }, [isCostKdvIncluded]);

  useEffect(() => {
    const priceExcl = isPriceKdvIncluded ? formData.price / (1 + kdvRate / 100) : formData.price;
    setTotalInventoryValue(priceExcl * formData.availableInventory);
  }, [formData.price, formData.availableInventory, kdvRate, isPriceKdvIncluded]);

  const validateForm = (): boolean => {
    const e: Record<string, string> = {};
    if (!formData.name.trim()) e.name = 'Urun adi gereklidir';
    if (!formData.brand.trim()) e.brand = 'Marka gereklidir';
    if (formData.availableInventory < 0) e.availableInventory = 'Stok miktari negatif olamaz';
    if (formData.reorderLevel < 0) e.reorderLevel = 'Yeniden siparis seviyesi negatif olamaz';
    if (formData.price <= 0) e.price = 'Fiyat sifirdan buyuk olmalidir';
    if (formData.cost && formData.cost < 0) e.cost = 'Maliyet negatif olamaz';
    if (formData.warranty && formData.warranty < 0) e.warranty = 'Garanti suresi negatif olamaz';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      const fd = { ...formData };
      if (!fd.stockCode?.trim()) {
        fd.stockCode = `${fd.brand.substring(0, 3).toUpperCase()}-${fd.category.substring(0, 2).toUpperCase()}-${Date.now().toString().slice(-6)}`;
      }
      if (!fd.barcode?.trim()) fd.barcode = undefined;
      let savedItem: InventoryItem;
      if (item) {
        const updateData: UpdateInventoryData = { id: item.id, ...fd, availableSerials: serials.filter(s => s.trim()) };
        savedItem = await inventoryService.updateItem(item.id, updateData);
      } else {
        const createData: CreateInventoryData = { ...fd, availableSerials: serials.filter(s => s.trim()) };
        savedItem = await inventoryService.createItem(createData);
      }
      onSave(savedItem);
    } catch (error) {
      setErrors({ submit: error instanceof Error ? error.message : 'Kaydetme islemi basarisiz oldu' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof InventoryFormData, value: string | number | boolean | string[] | null | undefined) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const addFeature = () => {
    if (featureInput.trim() && !formData.features?.includes(featureInput.trim())) {
      setFormData(prev => ({ ...prev, features: [...(prev.features || []), featureInput.trim()] }));
      setFeatureInput('');
    }
  };

  const removeFeature = (f: string) => {
    setFormData(prev => ({ ...prev, features: prev.features?.filter(x => x !== f) || [] }));
  };

  // === SECTION HEADER ===
  const SectionHeader = ({ title }: { title: string }) => (
    <div className="border-b border-border pb-2 pt-4">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
    </div>
  );

  // === PRICE FIELD with KDV toggle ===
  const PriceField = ({ label, field, kdvIncluded, setKdvIncluded, required = false }: {
    label: string; field: 'price' | 'cost'; kdvIncluded: boolean; setKdvIncluded: (v: boolean) => void; required?: boolean;
  }) => {
    const val = formData[field] || 0;
    return (
      <FieldWrapper label={label} required={required} error={errors[field]}
        hint={
          kdvIncluded
            ? `KDV Haric: ${String.fromCharCode(8378)}${(val / (1 + kdvRate / 100)).toFixed(2)}`
            : val > 0 ? `KDV Dahil: ${String.fromCharCode(8378)}${(val * (1 + kdvRate / 100)).toFixed(2)}` : undefined
        }
      >
        <div className="flex items-center gap-2">
          <Input
            type="number" min="0" step="0.01"
            value={val || ''}
            onChange={(e) => handleChange(field, e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
            className={`flex-1 ${errors[field] ? 'border-destructive' : ''}`}
          />
          <label className="flex items-center gap-1.5 cursor-pointer whitespace-nowrap text-xs text-muted-foreground">
            <input data-allow-raw="true" type="checkbox" checked={kdvIncluded}
              onChange={(e) => setKdvIncluded(e.target.checked)}
              className="rounded border-border text-primary focus:ring-ring" />
            KDV Dahil
          </label>
        </div>
      </FieldWrapper>
    );
  };

  return (
    <div className={className}>
      <form onSubmit={handleSubmit}>
        <VStack spacing={6}>
          {/* Submit error */}
          {errors.submit && (
            <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/20 rounded-xl p-4">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{errors.submit}</p>
            </div>
          )}

          {/* ── TEMEL BILGILER ── */}
          <SectionHeader title="Temel Bilgiler" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FieldWrapper label="Urun Adi" required error={errors.name}>
              <Input value={formData.name} onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Urun adini girin" className={errors.name ? 'border-destructive' : ''} />
            </FieldWrapper>

            <BrandAutocomplete value={formData.brand} onChange={(v) => handleChange('brand', v)}
              placeholder="Marka secin veya yazin" label="Marka" required error={errors.brand} />

            <FieldWrapper label="Model">
              <Input value={formData.model} onChange={(e) => handleChange('model', e.target.value)} placeholder="Model adini girin" />
            </FieldWrapper>

            <FieldWrapper label="Barkod">
              <BarcodeInput value={formData.barcode || ''} onChange={(v) => handleChange('barcode', v)}
                showScanButton showGenerateButton placeholder="Barkod numarasini girin" />
            </FieldWrapper>

            <FieldWrapper label="Stok Kodu" hint="Bos birakilirsa otomatik olusturulur">
              <Input value={formData.stockCode} onChange={(e) => handleChange('stockCode', e.target.value)} placeholder="Stok kodunu girin" />
            </FieldWrapper>

            <CategoryAutocomplete value={formData.category}
              onChange={(v) => { handleChange('category', v as InventoryCategory); handleChange('type', undefined); }}
              placeholder="Kategori secin veya yazin" label="Kategori" required error={errors.category} />
          </div>

          {/* ── STOK VE FIYATLANDIRMA ── */}
          <SectionHeader title="Stok ve Fiyatlandirma" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FieldWrapper label="Mevcut Stok" required error={errors.availableInventory}>
              <Input type="number" min="0" value={formData.availableInventory || ''}
                onChange={(e) => handleChange('availableInventory', e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
                className={errors.availableInventory ? 'border-destructive' : ''} />
            </FieldWrapper>

            <FieldWrapper label="Yeniden Siparis Seviyesi" required error={errors.reorderLevel}>
              <Input type="number" min="0" value={formData.reorderLevel}
                onChange={(e) => handleChange('reorderLevel', e.target.value === '' ? 0 : parseInt(e.target.value))}
                className={errors.reorderLevel ? 'border-destructive' : ''} />
            </FieldWrapper>

            <PriceField label="Satis Fiyati" field="price" required kdvIncluded={isPriceKdvIncluded} setKdvIncluded={setIsPriceKdvIncluded} />
            <PriceField label="Maliyet" field="cost" kdvIncluded={isCostKdvIncluded} setKdvIncluded={setIsCostKdvIncluded} />

            <FieldWrapper label="KDV Orani">
              <Select value={kdvRate.toString()} onChange={(e) => setKdvRate(parseFloat(e.target.value))}
                options={[{ value: '0', label: '%0' }, { value: '1', label: '%1' }, { value: '10', label: '%10' }, { value: '20', label: '%20' }]} />
            </FieldWrapper>

            <FieldWrapper label="Toplam Stok Degeri">
              <div className="bg-primary/10 p-3 rounded-xl border border-primary/20 text-center">
                <span className="text-lg font-bold text-primary">
                  {String.fromCharCode(8378)}{totalInventoryValue.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </FieldWrapper>
          </div>

          {/* ── TEDARIK VE DETAYLAR ── */}
          <SectionHeader title="Tedarik ve Detaylar" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <SupplierAutocomplete value={formData.supplier || ''} onChange={(v) => handleChange('supplier', v)}
              placeholder="Tedarikci adini girin veya secin" label="Tedarikci"
              onSupplierCreated={(_name, id) => { navigate({ to: id ? '/suppliers/$supplierId' : '/suppliers', params: id ? { supplierId: id } : undefined }); }} />

            <FieldWrapper label="Birim">
              <Select value={formData.unit || 'adet'} onChange={(e) => handleChange('unit', e.target.value)}
                options={[
                  { value: 'adet', label: 'Adet' }, { value: 'kutu', label: 'Kutu' },
                  { value: 'paket', label: 'Paket' }, { value: 'set', label: 'Set' },
                  { value: 'metre', label: 'Metre' }, { value: 'litre', label: 'Litre' },
                  { value: 'kilogram', label: 'Kilogram' }, { value: 'cift', label: 'Cift' },
                ]} />
            </FieldWrapper>

            {formData.unit === 'paket' && (
              <FieldWrapper label="Paket Ici Adet" hint="Her pakette kac adet urun var?">
                <Input type="number" min="1" value={formData.packageQuantity || ''}
                  onChange={(e) => handleChange('packageQuantity', e.target.value === '' ? undefined : parseInt(e.target.value))}
                  placeholder="Orn: 6" />
              </FieldWrapper>
            )}

            <FieldWrapper label="Garanti (Ay)" error={errors.warranty}>
              <Input type="number" min="0" value={formData.warranty}
                onChange={(e) => handleChange('warranty', e.target.value === '' ? 0 : parseInt(e.target.value))}
                className={errors.warranty ? 'border-destructive' : ''} />
            </FieldWrapper>
          </div>

          {/* Hearing Aid Specific */}
          {formData.category === 'hearing_aid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FieldWrapper label="Kulak Yonu">
                <Select value={formData.ear || ''} onChange={(e) => handleChange('ear', e.target.value as EarDirection || undefined)}
                  options={[{ value: '', label: 'Secin' }, { value: 'left', label: 'Sol' }, { value: 'right', label: 'Sag' }, { value: 'both', label: 'Her Ikisi' }]} />
              </FieldWrapper>
            </div>
          )}

          {/* ── OZELLIKLER VE SERI NUMARALAR ── */}
          <SectionHeader title="Ozellikler ve Seri Numaralar" />

          <FieldWrapper label="Ozellikler" hint="Ozellik yazin ve Enter'a basin">
            <div className="flex gap-2 mb-2">
              <Input value={featureInput} onChange={(e) => setFeatureInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                className="flex-1" placeholder="Ozellik ekleyin" />
              <Button type="button" onClick={addFeature} variant="primary" size="sm">Ekle</Button>
            </div>
            {(formData.features?.length ?? 0) > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.features?.map((f, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-primary/10 text-primary">
                    {f}
                    <button data-allow-raw="true" type="button" onClick={() => removeFeature(f)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </FieldWrapper>

          <div className="flex items-center justify-between">
            <FieldWrapper label="Seri Numaralari" hint={`Mevcut stok: ${formData.availableInventory} | Kayitli seri no: ${serials.filter(s => s.trim()).length}`}>
              <Button type="button" onClick={() => setIsSerialModalOpen(true)} variant="outline" icon={<Package className="w-4 h-4" />}>
                Seri No Yonet ({serials.filter(s => s.trim()).length})
              </Button>
            </FieldWrapper>
          </div>

          {/* ── ACIKLAMA ── */}
          <SectionHeader title="Aciklama" />
          <FieldWrapper label="Aciklama">
            <Textarea value={formData.description} onChange={(e) => handleChange('description', e.target.value)}
              rows={4} placeholder="Urun aciklamasini girin" className="w-full" />
          </FieldWrapper>

          {/* ── FORM ACTIONS ── */}
          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <Button type="button" onClick={onCancel} variant="outline">Iptal</Button>
            <Button type="submit" disabled={loading} variant="primary" icon={<Save className="h-4 w-4" />}>
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </VStack>
      </form>

      <SerialNumberModal
        isOpen={isSerialModalOpen}
        onClose={() => setIsSerialModalOpen(false)}
        productName={formData.name || 'Yeni Urun'}
        availableCount={formData.availableInventory}
        existingSerials={serials}
        onSave={(newSerials) => { setSerials(newSerials); setFormData(prev => ({ ...prev, availableSerials: newSerials })); setIsSerialModalOpen(false); }}
      />
    </div>
  );
};

export default InventoryForm;
