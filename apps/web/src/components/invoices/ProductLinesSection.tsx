import { Input, Select, Button } from '@x-ear/ui-web';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Info, AlertTriangle, Copy, Trash2, BarChart3, DollarSign, RefreshCw, Pill, CheckCircle } from 'lucide-react';
import { UnitSelector } from './UnitSelector';
import ProductSearchModal from './ProductSearchModal';
import { GTIPCodeInput } from './GTIPCodeInput';
import LineWithholdingModal from './LineWithholdingModal';
import SpecialBaseModal, { SpecialBaseData } from './SpecialBaseModal';
import MedicalDeviceModal from './MedicalDeviceModal';
// import { SearchableSelect } from '../ui/SearchableSelect';
import type { MedicalDeviceData, LineWithholdingData } from '../../types/invoice';
import type { InventoryItem as LocalInventoryItem, InventoryCategory } from '../../types/inventory';
import {
  inventoryGetInventoryItems,
  inventoryGetInventoryItem,
  inventoryCreateInventoryItem,
} from '@/api/generated';
// Import generated API type from schemas file (direct path)
import type { InventoryItem as ApiInventoryItem } from '@/api/generated/schemas/inventoryItem';
import { AUTH_TOKEN } from '../../constants/storage-keys';

interface ProductLine {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount?: number;
  discountType?: 'amount' | 'percentage';
  taxRate: number;
  taxAmount: number;
  total: number;
  productServiceCode?: string;
  gtipCode?: string;
  aliciStokKodu?: string; // KRİTİK EKSİK ALAN
  withholdingData?: LineWithholdingData;
  specialBaseData?: SpecialBaseData;
  medicalDeviceData?: MedicalDeviceData;
}

interface ProductLinesSectionProps {
  lines: ProductLine[];
  onChange: (lines: ProductLine[]) => void;
  invoiceType?: string;
  scenario?: string;
  currency?: string;
  onCurrencyChange?: (currency: string) => void;
  generalDiscount?: number | string;
  onGeneralDiscountChange?: (v: number | string) => void;
  onRequestLineEditor?: (type: 'withholding' | 'special' | 'medical', index: number) => void;
  errors?: Record<string, string>;
}

export function ProductLinesSection({
  lines,
  onChange,
  invoiceType = '0',
  scenario = '',
  currency = 'TRY',
  onCurrencyChange,
  generalDiscount = undefined,
  onGeneralDiscountChange = undefined,
  onRequestLineEditor = undefined,
  errors = {}
}: ProductLinesSectionProps) {
  // Normalize API category strings to local InventoryCategory union
  const normalizeCategory = (cat?: string): InventoryCategory => {
    const c = (cat || '').toLowerCase();
    switch (c) {
      case 'hearing_aid':
        return 'hearing_aid';
      case 'battery':
        return 'battery';
      case 'accessory':
        return 'accessory';
      case 'ear_mold':
        return 'ear_mold';
      case 'cleaning_supplies':
        return 'cleaning_supplies';
      case 'amplifiers':
        return 'amplifiers';
      default:
        return 'accessory';
    }
  };

  // Compose display label for product option and default line name
  const formatProductLabel = (product: LocalInventoryItem) => {
    const modelPart = product.model ? ` ${product.model}` : '';
    return `${product.name} - ${product.brand}${modelPart}`.trim();
  };

  // Normalize VAT/KDV value to percentage; accepts 18, '18', 0.18
  const normalizeVatRate = (raw: unknown): number => {
    if (raw === null || raw === undefined) return 18;
    const parsed = parseFloat(String(raw).replace(/[^0-9.,-]/g, '').replace(',', '.'));
    if (!Number.isFinite(parsed)) return 18;
    const value = parsed > 0 && parsed < 1 ? parsed * 100 : parsed; // convert ratio to percent
    return Math.max(0, Math.round(value));
  };

  // Parse a typed label into name/brand/model (best-effort)
  const parseNameBrandModel = (value: string) => {
    const [left, right] = value.split(' - ');
    const name = (left || '').trim();
    const rightTrim = (right || '').trim();
    if (!rightTrim) {
      return { name, brand: '', model: '' };
    }
    const tokens = rightTrim.split(/\s+/);
    const brand = tokens.shift() || '';
    const model = tokens.join(' ');
    return { name, brand, model };
  };

  // Filter products by typed query against label or fields
  const filterProductsByQuery = (query: string) => {
    const q = query.toLowerCase();
    return allProducts.filter(p => {
      const label = formatProductLabel(p).toLowerCase();
      return (
        label.includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        (p.model || '').toLowerCase().includes(q)
      );
    });
  };
  // Modal states
  const [withholdingModalOpen, setWithholdingModalOpen] = useState(false);
  const [specialBaseModalOpen, setSpecialBaseModalOpen] = useState(false);
  const [medicalModalOpen, setMedicalModalOpen] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(0);
  const [productSearchModalOpen, setProductSearchModalOpen] = useState(false);

  // Product search states
  const [allProducts, setAllProducts] = useState<LocalInventoryItem[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [focusedLineIndex, setFocusedLineIndex] = useState<number | null>(null);

  // Koşullu görünürlük
  const isWithholdingType = ['11', '18', '24', '32'].includes(invoiceType);
  const isSpecialBaseType = ['12', '19', '25', '33'].includes(invoiceType);
  const isReturnWithholdingType = ['15', '49'].includes(invoiceType);
  const isReturnType = ['15', '49', '50'].includes(invoiceType);
  const isMedicalScenario = scenario === '45' || scenario === 'medical';
  const isExportScenario = scenario === '5' || scenario === 'export';

  // Tevkifat İade için KDV otomatik 0
  useEffect(() => {
    if (isReturnWithholdingType) {
      const updatedLines = lines.map(line => ({
        ...line,
        taxRate: 0,
        taxAmount: 0
      }));

      // Sadece değişiklik varsa güncelle
      const hasChanges = lines.some(line => line.taxRate !== 0);
      if (hasChanges) {
        onChange(updatedLines);
      }
    }
  }, [isReturnWithholdingType, invoiceType]);

  // KDV oranları
  const taxRates = [
    { value: '0', label: '%0' },
    { value: '1', label: '%1' },
    { value: '8', label: '%8' },
    { value: '10', label: '%10' },
    { value: '18', label: '%18' },
    { value: '20', label: '%20' }
  ];

  // Load all products on mount (via generated API client)
  useEffect(() => {
    const loadProducts = async () => {
      console.log('🔄 Starting to load products (API)...');
      setIsLoadingProducts(true);
      try {
        const params = {}; // Define empty params
        const resp = await inventoryGetInventoryItems(params);
        const apiItems: ApiInventoryItem[] = (resp as any)?.data?.data ?? [];
        console.log('✅ API inventory response', { status: (resp as any)?.status, itemsCount: apiItems.length });

        const nowIso = new Date().toISOString();
        const mapped: LocalInventoryItem[] = apiItems.map((item) => ({
          id: String(item.id ?? ''),
          name: item.name,
          brand: item.brand,
          model: item.model,
          category: normalizeCategory(item.category),
          barcode: item.barcode,
          stockCode: undefined,
          supplier: item.supplier,
          unit: undefined,
          description: item.description,
          availableInventory: item.availableInventory ?? (item as any).inventory ?? item.stock ?? 0,
          totalInventory: item.totalInventory ?? 0,
          usedInventory: item.usedInventory ?? 0,
          onTrial: item.onTrial,
          reorderLevel: item.reorderLevel ?? (item as any).minInventory ?? 0,
          availableSerials: item.availableSerials,
          availableBarcodes: undefined,
          price: item.price,
          taxRate: Number(item.vatRate ?? item.kdv ?? 18),
          cost: undefined,
          wholesalePrice: undefined,
          retailPrice: undefined,
          vatIncludedPrice: item.vatIncludedPrice,
          totalValue: undefined,
          features: item.features,
          ear: (item as any).ear,
          direction: (item as any).direction,
          sgkCode: undefined,
          isMinistryTracked: undefined,
          warranty: item.warranty,
          // Ensure required audit fields exist on local type
          createdAt: item.createdAt ?? nowIso,
          lastUpdated: (item as any).updatedAt ?? item.createdAt ?? nowIso,
        }));

        console.log('🧭 Mapped products to local shape', { count: mapped.length });
        setAllProducts(mapped);
      } catch (error) {
        console.error('❌ Error loading products (API):', error);
        setAllProducts([]);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    loadProducts();
  }, []);

  const handleLineChange = (index: number, field: keyof ProductLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    // Otomatik hesaplamalar (tüm sayısal alanlar geçici olarak boş olabilir)
    if (['quantity', 'unitPrice', 'discount', 'discountType', 'taxRate'].includes(field)) {
      const line = newLines[index];
      const qty = safeForCompute(line.quantity);
      const price = safeForCompute(line.unitPrice);
      const subtotal = qty * price;

      let discountAmount = 0;
      const disc = (line.discount as any) === '' ? 0 : safeForCompute(line.discount);
      if (disc) {
        discountAmount = (line.discountType === 'percentage')
          ? (subtotal * disc) / 100
          : disc;
      }

      const taxBase = subtotal - discountAmount;
      const taxRateVal = safeForCompute(line.taxRate);
      const taxAmount = (taxBase * taxRateVal) / 100;
      const total = taxBase + taxAmount;

      newLines[index].taxAmount = taxAmount;
      newLines[index].total = total;
    }

    // İade faturası için KDV'yi otomatik 0 yap
    if (isReturnType && field === 'taxRate' && value !== 0) {
      newLines[index].taxRate = 0;
      newLines[index].taxAmount = 0;
      newLines[index].total = newLines[index].quantity * newLines[index].unitPrice;
    }

    onChange(newLines);
  };

  // Ürün seçimi
  // Accept either a product ID (string) or a product object (when used with ProductSearchModal)
  const handleProductSelect = useCallback(async (index: number, productIdOrObject: string | LocalInventoryItem) => {
    console.log('🎯 Product selected:', productIdOrObject);
    console.log('📦 Available products:', allProducts.length);
    let product: LocalInventoryItem | undefined;
    if (typeof productIdOrObject === 'string') {
      product = allProducts.find(p => p.id === productIdOrObject);
      // Fallback: if not found in local cache, fetch single item from API
      if (!product) {
        try {
          const resp = await inventoryGetInventoryItem(productIdOrObject);
          const it = (resp as any)?.data?.data ?? (resp as any)?.data ?? null;
          if (it) {
            product = {
              id: it.id || productIdOrObject,
              name: it.name,
              code: it.barcode,
              brand: it.brand,
              model: it.model,
              price: it.price,
              stockQuantity: it.availableInventory ?? it.inventory ?? it.stock ?? 0,
              unit: it.unit || 'Adet',
              taxRate: Number(it.vatRate ?? it.kdv ?? 18),
              description: it.description,
            } as unknown as LocalInventoryItem;
            // Optionally add to allProducts cache
            setAllProducts(prev => [...prev, product!]);
          }
        } catch (err) {
          console.error('Error fetching single inventory item', err);
        }
      }
      // If product exists but missing taxRate, fetch details to get the current rate
      if (product && (product.taxRate === undefined || product.taxRate === null)) {
        try {
          const resp = await inventoryGetInventoryItem(product.id);
          const it = (resp as any)?.data?.data ?? (resp as any)?.data ?? null;
          if (it) {
            product.taxRate = Number(it.vatRate ?? it.kdv ?? product.taxRate ?? 18);
            // Update cache
            setAllProducts(prev => prev.map((p) => p.id === product!.id ? { ...p, taxRate: product!.taxRate } : p));
          }
        } catch (err) {
          console.error('Error fetching inventory details for taxRate fallback', err);
        }
      }
    } else {
      product = productIdOrObject;
    }
    if (!product) {
      console.error('❌ Product not found:', productIdOrObject);
      return;
    }
    console.log('✅ Found product:', product);

    const newLines = [...lines];
    const line = newLines[index];

    // Ürün bilgilerini doldur
    line.name = formatProductLabel(product);
    line.unitPrice = product.price;
    line.unit = product.unit || 'Adet';
    // Local item may not include explicit taxRate; prefer vatRate if present, else default
    const rawVat = (product.taxRate ?? (product as any).vatRate ?? (product as any).kdv);
    const normalizedVat = normalizeVatRate(rawVat);
    const allowedRates = [0, 1, 8, 10, 18, 20];
    const chosenVat = allowedRates.reduce((prev, curr) => {
      return Math.abs(curr - normalizedVat) < Math.abs(prev - normalizedVat) ? curr : prev;
    }, allowedRates[0]);
    line.taxRate = isReturnType ? 0 : chosenVat;
    line.description = product.description;
    line.productServiceCode = (product as any).productServiceCode;
    line.aliciStokKodu = product.barcode;

    if (product.gtipCode) {
      line.gtipCode = product.gtipCode;
    }

    // Hesaplamaları yap
    const subtotal = line.quantity * line.unitPrice;
    let discountAmount = 0;
    if (line.discount) {
      discountAmount = line.discountType === 'percentage'
        ? (subtotal * line.discount) / 100
        : line.discount;
    }
    const taxBase = subtotal - discountAmount;
    const taxAmount = (taxBase * line.taxRate) / 100;
    const total = taxBase + taxAmount;

    line.taxAmount = taxAmount;
    line.total = total;

    onChange(newLines);
    // Hide suggestions after selecting a product
    setFocusedLineIndex(null);
  }, [allProducts, lines, onChange]);

  const addLine = () => {
    const newLine: ProductLine = {
      id: Date.now().toString(),
      name: '',
      quantity: 1,
      unit: 'Adet',
      unitPrice: 0,
      taxRate: 18,
      taxAmount: 0,
      total: 0
    };
    onChange([...lines, newLine]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      onChange(lines.filter((_, i) => i !== index));
    }
  };

  const duplicateLine = (index: number) => {
    const lineToDuplicate = { ...lines[index], id: Date.now().toString() };
    const newLines = [...lines];
    newLines.splice(index + 1, 0, lineToDuplicate);
    onChange(newLines);
  };

  // Envanter'e ekle (eşleşme yoksa)
  const handleCreateInventoryFromLine = async (index: number) => {
    const line = lines[index];
    const { name, brand, model } = parseNameBrandModel(line.name);

    const body = {
      name: name || line.name,
      brand: brand || 'Genel',
      model: model || '',
      category: 'accessory', // Default category
      barcode: line.aliciStokKodu || `GEN-${Date.now()}`,
      price: line.unitPrice,
      vatRate: line.taxRate,
      unit: line.unit,
      description: line.description,
      stock: 100 // Default stock
    };

    try {
      const resp = await inventoryCreateInventoryItem(body as any);
      const created: any = (resp as any)?.data;
      console.log('✅ Envanter’e eklendi', { id: created?.id, name: created?.name });

      // Update the line with the new product ID and details
      if (created && created.id) {
        handleProductSelect(index, created.id);
      }

      // Refresh products list
      const params = {};
      const prodResp = await inventoryGetInventoryItems(params);
      // ... (logic to update allProducts could go here, or just rely on handleProductSelect fetching it)

    } catch (err) {
      const ax = err as any;
      console.error('❌ Envanter’e ekleme hatası', {
        message: ax?.message,
        status: ax?.response?.status,
        data: ax?.response?.data
      });
    }
  };

  // Modal handlers
  const openWithholdingModal = (index: number) => {
    // If parent supplied an onRequestLineEditor prop, prefer that to opening a modal
    if (typeof onRequestLineEditor === 'function') {
      onRequestLineEditor('withholding', index);
      return;
    }

    setCurrentLineIndex(index);
    setWithholdingModalOpen(true);
  };

  const openSpecialBaseModal = (index: number) => {
    if (typeof onRequestLineEditor === 'function') {
      onRequestLineEditor('special', index);
      return;
    }
    setCurrentLineIndex(index);
    setSpecialBaseModalOpen(true);
  };

  const openMedicalModal = (index: number) => {
    if (typeof onRequestLineEditor === 'function') {
      onRequestLineEditor('medical', index);
      return;
    }
    setCurrentLineIndex(index);
    setMedicalModalOpen(true);
  };

  // Get product options for SearchableSelect
  const getProductOptions = () => {
    return allProducts.map(product => ({
      value: product.id,
      label: formatProductLabel(product)
    }));
  };

  const handleWithholdingSave = (data: LineWithholdingData) => {
    const newLines = [...lines];
    newLines[currentLineIndex].withholdingData = data;
    onChange(newLines);
  };

  const handleSpecialBaseSave = (data: SpecialBaseData) => {
    const newLines = [...lines];
    newLines[currentLineIndex].specialBaseData = data;
    onChange(newLines);
  };

  const handleMedicalSave = (data: MedicalDeviceData) => {
    const newLines = [...lines];
    newLines[currentLineIndex].medicalDeviceData = data;
    onChange(newLines);
  };

  // Product search modal handlers






  // İlk boş satırı ekle
  useEffect(() => {
    if (lines.length === 0) {
      const initialLine: ProductLine = {
        id: `line-${Date.now()}`,
        name: '',
        quantity: 1,
        unit: 'Adet',
        unitPrice: 0,
        taxRate: 18,
        taxAmount: 0,
        total: 0
      };
      onChange([initialLine]);
    }
  }, [lines.length, onChange]);



  // Para birimi simgesi
  const getCurrencySymbol = (curr: string) => {
    switch (curr) {
      case 'TRY': return '₺';
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      default: return curr;
    }
  };

  // Helper for storing numeric inputs that may be temporarily empty string
  const safeForCompute = (v: any) => (v === '' || v === undefined || v === null) ? 0 : Number(v);

  // Totals computed with safe coercion to avoid undefined/NaN
  const totals = {
    subtotal: lines.reduce((sum, line) => sum + (safeForCompute(line.quantity) * safeForCompute(line.unitPrice)), 0),
    discount: lines.reduce((sum, line) => {
      if (!line.discount) return sum;
      const subtotal = safeForCompute(line.quantity) * safeForCompute(line.unitPrice);
      return sum + (line.discountType === 'percentage'
        ? (subtotal * safeForCompute(line.discount)) / 100
        : safeForCompute(line.discount));
    }, 0),
    tax: lines.reduce((sum, line) => sum + safeForCompute(line.taxAmount), 0),
    total: lines.reduce((sum, line) => sum + safeForCompute(line.total), 0)
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6 overflow-visible">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Ürün/Hizmet</h3>
        <div className="flex items-center gap-3">
          {/* Para Birimi Seçimi */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
            <label className="text-sm font-medium text-gray-700">Para Birimi:</label>
            <select
              value={currency}
              onChange={(e) => onCurrencyChange?.(e.target.value)}
              className="ml-2 bg-white border rounded px-2 py-1 text-sm"
            >
              <option value="TRY">TRY ({getCurrencySymbol('TRY')})</option>
              <option value="USD">USD ({getCurrencySymbol('USD')})</option>
              <option value="EUR">EUR ({getCurrencySymbol('EUR')})</option>
            </select>
            {/* Genel İskonto: moved here */}
            <div className="ml-4 flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Genel İskonto</label>
              <input
                type="number"
                step="0.01"
                value={generalDiscount === undefined || generalDiscount === null ? '' : String(generalDiscount)}
                onChange={(e) => {
                  const v = e.target.value;
                  onGeneralDiscountChange?.(v === '' ? '' : parseFloat(v));
                }}
                placeholder="0.00"
                className="px-2 py-1 border border-gray-300 rounded text-sm w-28"
              />
              <select
                value={''}
                onChange={() => { /* keep percentage/amount toggling elsewhere if needed */ }}
                className="ml-1 bg-white border rounded px-1 py-1 text-sm w-20"
              >
                <option value="percentage">%</option>
                <option value="amount">₺</option>
              </select>
            </div>
          </div>
          <Button
            type="button"
            onClick={addLine}
            variant="default"
            style={{ backgroundColor: '#2563eb', color: 'white' }}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm px-4 py-2"
          >
            + Yeni Kalem Ekle
          </Button>
          {/* Global 'Ürün Ara' removed: inline suggestions cover the need */}
        </div>
      </div>

      {/* Uyarılar */}
      {isReturnType && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="text-amber-600 flex-shrink-0" size={18} />
            <p className="text-sm text-amber-700">
              İade faturası: KDV oranları otomatik olarak %0 yapılacaktır.
            </p>
          </div>
        </div>
      )}
      {isMedicalScenario && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <Info className="text-purple-600 flex-shrink-0" size={18} />
            <p className="text-sm text-purple-700">
              İlaç/Tıbbi Cihaz faturası: Her kalem için ruhsat numarası gereklidir.
            </p>
          </div>
        </div>
      )}

      {isExportScenario && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <Info className="text-green-600 flex-shrink-0" size={18} />
            <p className="text-sm text-green-700">
              İhracat faturası: Her kalem için GTİP kodu zorunludur.
            </p>
          </div>
        </div>
      )}

      {/* Ürün Satırları */}
      <div className="space-y-4">
        {lines.map((line, index) => (
          <div key={line.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50 overflow-visible">
            {/* Satır Başlığı */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">
                Kalem {index + 1}
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  onClick={() => duplicateLine(index)}
                  variant="default"
                  className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700"
                  title="Kopyala"
                >
                  <Copy size={18} />
                </Button>
                {lines.length > 1 && (
                  <Button
                    type="button"
                    onClick={() => removeLine(index)}
                    variant="default"
                    className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700"
                    title="Sil"
                  >
                    <Trash2 size={18} />
                  </Button>
                )}
                {/* Per-line 'Ürün Ara' removed in favor of inline suggestions */}
              </div>
            </div>

            {/* Ana Alanlar */}
            <div className="grid grid-cols-1 gap-3">
              {/* Ürün/Hizmet Adı - Tek alan + öneri listesi ve Envanter'e ekle */}
              <div>
                <Input
                  type="text"
                  label="Ürün/Hizmet Adı"
                  value={line.name}
                  onChange={(e) => handleLineChange(index, 'name', e.target.value)}
                  placeholder="Ürün adı, marka ve model"
                  onFocus={() => setFocusedLineIndex(index)}
                  onBlur={() => setTimeout(() => setFocusedLineIndex((cur) => (cur === index ? null : cur)), 150)}
                  fullWidth
                  required
                />
                {/* Öneri listesi */}
                {(() => {
                  const query = (line.name || '').trim();
                  const exactMatch = query.length > 0 && allProducts.some(p => formatProductLabel(p) === query);
                  const suggestions = query.length >= 2 ? filterProductsByQuery(query).slice(0, 6) : [];
                  const shouldShow = focusedLineIndex === index && !exactMatch && (suggestions.length > 0 || query.length >= 2);
                  if (!shouldShow) return null;
                  return (
                    <div className="mt-2 border border-gray-200 rounded-md bg-white shadow-sm overflow-hidden">
                      {suggestions.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleProductSelect(index, p.id)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                {formatProductLabel(p)}
                              </div>
                              <div className="mt-1 text-sm text-gray-500 flex gap-3 flex-wrap">
                                {typeof p.price === 'number' && (
                                  <span className="text-green-600 font-medium">
                                    {p.price.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                  </span>
                                )}
                                {p.taxRate !== undefined && (
                                  <span className="text-gray-600">KDV: %{p.taxRate}</span>
                                )}
                                {p.availableInventory !== undefined && (
                                  <span className={`text-sm ${p.availableInventory > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    Stok: {p.availableInventory} {p.unit || 'Adet'}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-blue-600 text-xl flex items-center ml-2">→</div>
                          </div>
                        </button>
                      ))}
                      {suggestions.length === 0 && !exactMatch && (
                        <div className="px-3 py-2 text-sm text-gray-600 flex items-center justify-between">
                          <span>Eşleşme bulunamadı.</span>
                          <Button
                            type="button"
                            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-xs"
                            onClick={() => handleCreateInventoryFromLine(index)}
                          >
                            Envanter'e ekle
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })()}
                {isLoadingProducts && (
                  <p className="mt-1 text-xs text-blue-600">Ürünler yükleniyor...</p>
                )}
              </div>

              {/* İkinci Satır: Miktar, Birim, Fiyat, İskonto, KDV, Toplam */}
              <div className="grid grid-cols-12 gap-3">
                {/* Miktar */}
                <div className="col-span-2">
                  <Input
                    type="number"
                    label="Miktar"
                    value={(line.quantity as any) === '' || line.quantity === undefined ? '' : String(line.quantity)}
                    onChange={(e) => handleLineChange(index, 'quantity', e.target.value === '' ? '' : parseFloat(e.target.value))}
                    min="0.01"
                    step="0.01"
                    fullWidth
                    required
                  />
                </div>

                {/* Birim */}
                <div className="col-span-2">
                  <UnitSelector
                    value={line.unit}
                    onChange={(value) => handleLineChange(index, 'unit', value)}
                  />
                </div>

                {/* Birim Fiyat */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Birim Fiyat
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={line.unitPrice === undefined || line.unitPrice === null ? '' : String(line.unitPrice)}
                      onChange={(e) => handleLineChange(index, 'unitPrice', e.target.value === '' ? '' : parseFloat(e.target.value))}
                      min="0"
                      step="0.01"
                      required
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    <span className="absolute left-3 top-2.5 text-gray-500 text-sm font-medium">
                      {getCurrencySymbol(currency)}
                    </span>
                  </div>
                </div>

                {/* İskonto */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    İskonto
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      value={line.discount === undefined || line.discount === null ? '' : String(line.discount)}
                      onChange={(e) => handleLineChange(index, 'discount', e.target.value === '' ? '' : parseFloat(e.target.value))}
                      min="0"
                      step="0.01"
                      placeholder="0"
                      className="w-full px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    <select
                      value={line.discountType || 'percentage'}
                      onChange={(e) => handleLineChange(index, 'discountType', e.target.value as 'amount' | 'percentage')}
                      className="w-16 px-1 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs bg-white"
                      title={line.discountType === 'percentage' ? 'Yüzde' : 'Birim'}
                    >
                      <option value="percentage">%</option>
                      <option value="amount">₺</option>
                    </select>
                  </div>
                </div>

                {/* KDV */}
                <div className="col-span-2">
                  <Select
                    label="KDV"
                    value={line.taxRate.toString()}
                    onChange={(e) => handleLineChange(index, 'taxRate', parseFloat(e.target.value))}
                    options={taxRates}
                    disabled={isReturnType}
                    fullWidth
                  />
                </div>

                {/* Toplam */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Toplam
                  </label>
                  <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-right font-medium text-sm">
                    {(safeForCompute(line.total)).toFixed(2)} {currency}
                  </div>
                </div>
              </div>
            </div>

            {/* Ek Alanlar - Gizlendi */}
            {/* 
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              <div>
                <ProductServiceCodeInput
                  value={line.productServiceCode || ''}
                  onChange={(value) => handleLineChange(index, 'productServiceCode', value)}
                />
              </div>
              <div>
                <Input
                  type="text"
                  label="Alıcı Stok Kodu"
                  value={line.aliciStokKodu || ''}
                  onChange={(e) => handleLineChange(index, 'aliciStokKodu', e.target.value)}
                  placeholder="Alıcının stok kodu"
                  fullWidth
                />
              </div>
              <div>
                <Input
                  type="text"
                  label="Açıklama"
                  value={line.description || ''}
                  onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                  placeholder="Ek açıklama (opsiyonel)"
                  fullWidth
                />
              </div>
            </div>
            */}

            {/* Koşullu Alanlar */}
            <div className="mt-3 space-y-3">
              {/* GTİP Kodu (İhracat için) */}
              {isExportScenario && (
                <div>
                  <GTIPCodeInput
                    value={line.gtipCode || ''}
                    onChange={(value) => handleLineChange(index, 'gtipCode', value)}
                    error={errors[`lines.${index}.gtipCode`]}
                    required
                  />
                </div>
              )}

              {/* Koşullu Butonlar */}
              <div className="flex flex-wrap gap-2">
                {/* Tevkifat Butonu */}
                {isWithholdingType && (
                  <Button
                    type="button"
                    onClick={() => openWithholdingModal(index)}
                    variant="default"
                    className="text-sm px-3 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-300 flex items-center gap-1"
                  >
                    <BarChart3 size={14} />
                    Tevkifat
                    {line.withholdingData && <CheckCircle size={14} className="ml-1" />}
                  </Button>
                )}

                {/* Özel Matrah Butonu */}
                {isSpecialBaseType && (
                  <Button
                    type="button"
                    onClick={() => openSpecialBaseModal(index)}
                    variant="default"
                    className="text-sm px-3 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 border border-yellow-300 flex items-center gap-1"
                  >
                    <DollarSign size={14} />
                    Özel Matrah
                    {line.specialBaseData && <CheckCircle size={14} className="ml-1" />}
                  </Button>
                )}

                {/* Tevkifat-İade Butonu */}
                {isReturnWithholdingType && (
                  <Button
                    type="button"
                    onClick={() => openWithholdingModal(index)}
                    variant="default"
                    className="text-sm px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 flex items-center gap-1"
                  >
                    <RefreshCw size={14} />
                    Tevkifat İade
                    {line.withholdingData && <CheckCircle size={14} className="ml-1" />}
                  </Button>
                )}

                {/* İlaç/Tıbbi Cihaz Butonu */}
                {isMedicalScenario && (
                  <Button
                    type="button"
                    onClick={() => openMedicalModal(index)}
                    variant="default"
                    className="text-sm px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-300 flex items-center gap-1"
                  >
                    <Pill size={14} />
                    İlaç/Tıbbi Cihaz
                    {line.medicalDeviceData && <CheckCircle size={14} className="ml-1" />}
                  </Button>
                )}
              </div>

              {/* Koşullu Alan Göstergeleri */}
              {line.withholdingData && (isWithholdingType || isReturnWithholdingType) && (
                <div className="text-xs text-gray-600 bg-orange-50 border border-orange-200 rounded p-2">
                  Tevkifat bilgileri eklendi
                </div>
              )}

              {line.specialBaseData && isSpecialBaseType && (
                <div className="text-xs text-gray-600 bg-yellow-50 border border-yellow-200 rounded p-2">
                  Özel Matrah: {line.specialBaseData.specialBaseAmount} TL × {line.specialBaseData.specialBaseRate}% = {line.specialBaseData.calculatedTax} TL
                </div>
              )}

              {line.medicalDeviceData && isMedicalScenario && (
                <div className="text-xs text-gray-600 bg-purple-50 border border-purple-200 rounded p-2">
                  Ruhsat No: {line.medicalDeviceData.licenseNumber}
                  {line.medicalDeviceData.serialNumber && ` | Seri: ${line.medicalDeviceData.serialNumber}`}
                  {line.medicalDeviceData.lotNumber && ` | Lot: ${line.medicalDeviceData.lotNumber}`}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Toplam Hesaplamalar */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Ara Toplam:</span>
            <span className="font-medium">{(safeForCompute(totals.subtotal)).toFixed(2)} {currency}</span>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">İskonto:</span>
              <span className="font-medium text-red-600">-{(safeForCompute(totals.discount)).toFixed(2)} {currency}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">KDV:</span>
            <span className="font-medium">{(safeForCompute(totals.tax)).toFixed(2)} {currency}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
            <span className="text-gray-900">Genel Toplam:</span>
            <span className="text-blue-600">{(safeForCompute(totals.total)).toFixed(2)} {currency}</span>
          </div>
        </div>
      </div>

      {/* Modals */}
      <LineWithholdingModal
        isOpen={withholdingModalOpen}
        onClose={() => setWithholdingModalOpen(false)}
        onSave={handleWithholdingSave}
        initialData={lines[currentLineIndex]?.withholdingData}
        itemIndex={currentLineIndex}
        itemName={lines[currentLineIndex]?.name || ''}
        itemAmount={lines[currentLineIndex]?.total || 0}
      />

      <SpecialBaseModal
        isOpen={specialBaseModalOpen}
        onClose={() => setSpecialBaseModalOpen(false)}
        onSave={handleSpecialBaseSave}
        initialData={lines[currentLineIndex]?.specialBaseData}
        lineIndex={currentLineIndex}
      />

      <MedicalDeviceModal
        isOpen={medicalModalOpen}
        onClose={() => setMedicalModalOpen(false)}
        onSave={handleMedicalSave}
        initialData={lines[currentLineIndex]?.medicalDeviceData}
        lineIndex={currentLineIndex}
        itemName={lines[currentLineIndex]?.name}
      />

      <ProductSearchModal
        isOpen={productSearchModalOpen}
        onClose={() => setProductSearchModalOpen(false)}
        onSelect={(product) => {
          if (typeof currentLineIndex === 'number') {
            handleProductSelect(currentLineIndex, product as LocalInventoryItem);
          }
          setProductSearchModalOpen(false);
        }}
      />

    </div>
  );
}
