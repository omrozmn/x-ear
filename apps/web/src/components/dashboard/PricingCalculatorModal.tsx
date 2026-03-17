import { Alert, Button, Input, Select } from '@x-ear/ui-web';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Calculator, DollarSign, Percent, Search, X } from 'lucide-react';
import { type InventoryItemRead, useInventory } from '@/hooks/useInventory';
import { fuzzySearch } from '@/utils/fuzzy-search';

interface PricingCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCalculate: (data: PricingCalculation) => void;
}

export interface PricingCalculation {
  productId?: string;
  productName?: string;
  productBrand?: string;
  devicePrice: number;
  quantity: number;
  ear: 'left' | 'right' | 'both';
  sgkScheme: string;
  sgkAmount: number;
  discountType: 'amount' | 'percentage';
  discountPercent: number;
  discountAmount: number;
  finalPrice: number;
  installments?: number;
  installmentAmount?: number;
}

const sgkSupportOptions = [
  { value: '', label: 'SGK desteği yok' },
  { value: 'under4_parent_working', label: '4 Yaş Altı (Veli Çalışan)' },
  { value: 'under4_parent_retired', label: '4 Yaş Altı (Veli Emekli)' },
  { value: 'age5_12_parent_working', label: '5-12 Yaş (Veli Çalışan)' },
  { value: 'age5_12_parent_retired', label: '5-12 Yaş (Veli Emekli)' },
  { value: 'age13_18_parent_working', label: '13-18 Yaş (Veli Çalışan)' },
  { value: 'age13_18_parent_retired', label: '13-18 Yaş (Veli Emekli)' },
  { value: 'over18_working', label: '18+ Yaş (Çalışan)' },
  { value: 'over18_retired', label: '18+ Yaş (Emekli)' },
];

const sgkFallbackValues: Record<string, number> = {
  under4_parent_working: 6104.44,
  under4_parent_retired: 7630.56,
  age5_12_parent_working: 5426.17,
  age5_12_parent_retired: 6782.72,
  age13_18_parent_working: 5087.04,
  age13_18_parent_retired: 6358.88,
  over18_working: 3391.36,
  over18_retired: 4239.2,
};

function isHearingAidProduct(product: InventoryItemRead | null): boolean {
  const category = `${product?.category || ''}`.toLowerCase();
  return (
    category.includes('işitme') ||
    category.includes('hearing') ||
    category.includes('cihaz') ||
    category.includes('aid')
  );
}

interface InventoryAutocompleteProps {
  value: string;
  onValueChange: (value: string) => void;
  selectedProduct: InventoryItemRead | null;
  onSelect: (product: InventoryItemRead | null) => void;
}

function InventoryAutocomplete({
  value,
  onValueChange,
  selectedProduct,
  onSelect,
}: InventoryAutocompleteProps) {
  const { products, loading, error } = useInventory();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredProducts = useMemo(() => {
    if (!value.trim()) {
      return products.slice(0, 12);
    }

    return fuzzySearch(products, value, {
      threshold: 0.35,
      keys: ['name', 'brand', 'model', 'barcode', 'serialNumber'],
    })
      .slice(0, 12)
      .map((result) => result.item);
  }, [products, value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <Input
        type="text"
        value={value}
        onChange={(e) => {
          onValueChange(e.target.value);
          if (!e.target.value) {
            onSelect(null);
          }
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Envanterden cihaz ara..."
        fullWidth
        rightIcon={
          <div className="flex items-center gap-1">
            {selectedProduct ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  onValueChange('');
                  onSelect(null);
                  setIsOpen(false);
                }}
                className="h-auto p-1 text-muted-foreground hover:text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            ) : null}
            <Search className="h-4 w-4 text-muted-foreground" />
          </div>
        }
      />

      {isOpen ? (
        <div className="absolute z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-3xl border border-slate-200/90 bg-white/98 shadow-[0_20px_60px_-24px_rgba(15,23,42,0.2)] backdrop-blur-xl dark:border-slate-700 dark:bg-slate-950/96">
          {loading ? (
            <div className="px-4 py-3 text-sm text-muted-foreground">Envanter yukleniyor...</div>
          ) : error ? (
            <div className="px-4 py-3 text-sm text-destructive">Envanter alinamadi</div>
          ) : filteredProducts.length > 0 ? (
            filteredProducts.map((product) => {
              const stock = product.availableInventory ?? 0;
              return (
                <button
                  data-allow-raw="true"
                  key={product.id}
                  type="button"
                  onClick={() => {
                    onSelect(product);
                    onValueChange(
                      [product.brand, product.model, product.name].filter(Boolean).join(' ')
                    );
                    setIsOpen(false);
                  }}
                  className="flex w-full items-start justify-between gap-3 border-b border-slate-100/80 px-4 py-3 text-left transition-colors hover:bg-sky-50/80 last:border-b-0 dark:border-white/10 dark:hover:bg-slate-800/80"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-gray-900 dark:text-white">{product.name}</div>
                    <div className="truncate text-xs text-muted-foreground dark:text-slate-400">
                      {[product.brand, product.model, product.category].filter(Boolean).join(' • ')}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {Number(product.price || 0).toLocaleString('tr-TR')} TL
                    </div>
                    <div className="text-xs text-muted-foreground dark:text-slate-400">Stok: {stock}</div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="px-4 py-3 text-sm text-muted-foreground dark:text-slate-400">Sonuc bulunamadi</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export const PricingCalculatorModal: React.FC<PricingCalculatorModalProps> = ({
  isOpen,
  onClose,
  onCalculate,
}) => {
  const [selectedProduct, setSelectedProduct] = useState<InventoryItemRead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [devicePrice, setDevicePrice] = useState<number>(0);
  const [ear, setEar] = useState<'left' | 'right' | 'both'>('right');
  const [quantity, setQuantity] = useState<number>(1);
  const [sgkScheme, setSgkScheme] = useState<string>('');
  const [discountType, setDiscountType] = useState<'amount' | 'percentage'>('amount');
  const [discountInput, setDiscountInput] = useState<number>(0);
  const [installments, setInstallments] = useState<number>(1);
  const [formError, setFormError] = useState<string>('');

  const isHearingAid = useMemo(() => isHearingAidProduct(selectedProduct), [selectedProduct]);

  useEffect(() => {
    if (!selectedProduct) {
      return;
    }

    setDevicePrice(Number(selectedProduct.price || 0));
    if (!isHearingAidProduct(selectedProduct)) {
      setEar('both');
      setQuantity(1);
      setSgkScheme('');
    }
  }, [selectedProduct]);

  useEffect(() => {
    if (!isHearingAid) {
      setEar('both');
      setQuantity(1);
      setSgkScheme('');
      return;
    }

    setQuantity(ear === 'both' ? 2 : 1);
  }, [ear, isHearingAid]);

  const calculation = useMemo((): PricingCalculation => {
    const basePrice = devicePrice * quantity;
    const sgkPerEar = sgkFallbackValues[sgkScheme] || 0;
    const sgkMultiplier = isHearingAid && ear === 'both' ? 2 : isHearingAid ? 1 : 0;
    const sgkAmount = Math.min(basePrice, sgkPerEar * sgkMultiplier);
    const amountAfterSgk = Math.max(0, basePrice - sgkAmount);

    const discountAmount =
      discountType === 'percentage'
        ? (amountAfterSgk * discountInput) / 100
        : discountInput;

    const finalPrice = Math.max(0, amountAfterSgk - discountAmount);
    const discountPercent =
      discountType === 'percentage'
        ? discountInput
        : amountAfterSgk > 0
          ? (discountAmount / amountAfterSgk) * 100
          : 0;

    return {
      productId: selectedProduct?.id,
      productName: selectedProduct?.name,
      productBrand: selectedProduct?.brand || undefined,
      devicePrice,
      quantity,
      ear,
      sgkScheme,
      sgkAmount,
      discountType,
      discountPercent,
      discountAmount,
      finalPrice,
      installments: installments > 1 ? installments : undefined,
      installmentAmount: installments > 1 ? finalPrice / installments : undefined,
    };
  }, [devicePrice, quantity, ear, sgkScheme, discountType, discountInput, installments, selectedProduct, isHearingAid]);

  const resetForm = () => {
    setSelectedProduct(null);
    setSearchTerm('');
    setDevicePrice(0);
    setEar('right');
    setQuantity(1);
    setSgkScheme('');
    setDiscountType('amount');
    setDiscountInput(0);
    setInstallments(1);
    setFormError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      setFormError('Lutfen envanterden bir cihaz secin.');
      return;
    }

    if (devicePrice <= 0) {
      setFormError('Lutfen gecerli bir fiyat girin.');
      return;
    }

    setFormError('');
    onCalculate(calculation);
    onClose();
  };

  if (!isOpen) return null;

  const stock = selectedProduct ? selectedProduct.availableInventory ?? 0 : 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/55 backdrop-blur-md dark:bg-black/82">
      <div className="mx-4 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[30px] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,250,252,0.94))] shadow-[0_30px_120px_-40px_rgba(15,23,42,0.32)] backdrop-blur-2xl dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.98),rgba(15,23,42,0.96))] dark:shadow-[0_30px_120px_-48px_rgba(0,0,0,0.98)]">
        <div className="flex items-center justify-between border-b border-slate-200/80 p-6 dark:border-slate-800">
          <h2 className="flex items-center text-xl font-semibold text-slate-900 dark:text-white">
            <Calculator className="mr-2 h-6 w-6 text-sky-600" />
            Fiyat Hesaplama
          </h2>
          <Button
            type="button"
            onClick={onClose}
            className="bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            variant="default"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {formError ? <Alert variant="error">{formError}</Alert> : null}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-300">Envanterden Cihaz Secimi</label>
            <InventoryAutocomplete
              value={searchTerm}
              onValueChange={setSearchTerm}
              selectedProduct={selectedProduct}
              onSelect={setSelectedProduct}
            />
          </div>

          {selectedProduct ? (
            <div className="rounded-3xl border border-sky-200/80 bg-sky-50/92 p-4 backdrop-blur-md dark:border-sky-800 dark:bg-slate-900">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-sky-900 dark:text-sky-100">
                <DollarSign className="h-4 w-4" />
                Secili Urun
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                <div>
                  <div className="text-xs text-sky-700 dark:text-slate-400">Marka</div>
                  <div className="truncate font-medium text-sky-950 dark:text-white">{selectedProduct.brand || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-sky-700 dark:text-slate-400">Model</div>
                  <div className="truncate font-medium text-sky-950 dark:text-white">{selectedProduct.model || selectedProduct.name}</div>
                </div>
                <div>
                  <div className="text-xs text-sky-700 dark:text-slate-400">Liste Fiyati</div>
                  <div className="font-medium text-sky-950 dark:text-white">{Number(selectedProduct.price || 0).toLocaleString('tr-TR')} TL</div>
                </div>
                <div>
                  <div className="text-xs text-sky-700 dark:text-slate-400">Stok</div>
                  <div className="font-medium text-sky-950 dark:text-white">{stock}</div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {isHearingAid ? (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-300">Kulak Secimi</label>
                <Select
                  value={ear}
                  onChange={(e) => setEar(e.target.value as 'left' | 'right' | 'both')}
                  fullWidth
                  options={[
                    { value: 'left', label: 'Sol' },
                    { value: 'right', label: 'Sag' },
                    { value: 'both', label: 'Bilateral' },
                  ]}
                />
              </div>
            ) : (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-300">Miktar</label>
                <Input
                  type="number"
                  min="1"
                  value={quantity === 0 ? '' : quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  fullWidth
                />
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-300">
                <DollarSign className="mr-1 inline h-4 w-4" />
                Birim Fiyat (TL)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={devicePrice === 0 ? '' : devicePrice}
                onChange={(e) => setDevicePrice(parseFloat(e.target.value) || 0)}
                fullWidth
              />
            </div>
          </div>

          {isHearingAid ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-300">SGK Semasi</label>
                <Select
                  value={sgkScheme}
                  onChange={(e) => setSgkScheme(e.target.value)}
                  fullWidth
                  options={sgkSupportOptions}
                />
              </div>
              <div className="rounded-3xl border border-emerald-200/80 bg-emerald-50/92 p-3 backdrop-blur-md dark:border-emerald-800 dark:bg-slate-900">
                <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Tahmini SGK Destegi</div>
                <div className="mt-1 text-lg font-semibold text-emerald-900 dark:text-emerald-100">
                  {calculation.sgkAmount.toLocaleString('tr-TR')} TL
                </div>
                <div className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                  {ear === 'both' ? 'Bilateral hesaplama dahil' : 'Tek kulak hesaplama'}
                </div>
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-300">Indirim Tipi</label>
              <Select
                value={discountType}
                onChange={(e) => setDiscountType(e.target.value as 'amount' | 'percentage')}
                fullWidth
                options={[
                  { value: 'amount', label: 'Tutar (TL)' },
                  { value: 'percentage', label: 'Yuzde (%)' },
                ]}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-300">
                <Percent className="mr-1 inline h-4 w-4" />
                Indirim Degeri
              </label>
              <Input
                type="number"
                min="0"
                step={discountType === 'percentage' ? '1' : '0.01'}
                max={discountType === 'percentage' ? '100' : undefined}
                value={discountInput === 0 ? '' : discountInput}
                onChange={(e) => setDiscountInput(parseFloat(e.target.value) || 0)}
                fullWidth
              />
            </div>
            <div>
              <Select
                label="Taksit"
                value={String(installments)}
                onChange={(e) => setInstallments(parseInt(e.target.value, 10) || 1)}
                fullWidth
                options={[
                  { value: '1', label: 'Pesin' },
                  { value: '2', label: '2 Taksit' },
                  { value: '3', label: '3 Taksit' },
                  { value: '6', label: '6 Taksit' },
                  { value: '9', label: '9 Taksit' },
                  { value: '12', label: '12 Taksit' },
                ]}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/90 bg-white/94 p-4 shadow-sm shadow-slate-200/55 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 flex items-center gap-2 font-medium text-gray-900 dark:text-white">
              <Calculator className="h-4 w-4" />
              Hesaplama Sonucu
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground dark:text-slate-400">Ara Toplam</span>
                <span className="font-medium text-slate-900 dark:text-white">{(devicePrice * quantity).toLocaleString('tr-TR')} TL</span>
              </div>
              {isHearingAid && calculation.sgkAmount > 0 ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground dark:text-slate-400">SGK Dusumu</span>
                  <span className="font-medium text-emerald-600">-{calculation.sgkAmount.toLocaleString('tr-TR')} TL</span>
                </div>
              ) : null}
              {calculation.discountAmount > 0 ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground dark:text-slate-400">
                    Indirim
                    {discountType === 'percentage' ? ` (%${calculation.discountPercent.toFixed(1)})` : ''}
                  </span>
                  <span className="font-medium text-rose-600">-{calculation.discountAmount.toLocaleString('tr-TR')} TL</span>
                </div>
              ) : null}
              <div className="border-t border-slate-200 pt-2 dark:border-slate-800">
                <div className="flex justify-between text-lg font-semibold text-slate-900 dark:text-white">
                  <span>Toplam</span>
                  <span className="text-sky-700 dark:text-sky-300">{calculation.finalPrice.toLocaleString('tr-TR')} TL</span>
                </div>
                {calculation.installmentAmount ? (
                  <div className="mt-1 flex justify-between text-sm text-muted-foreground dark:text-slate-400">
                    <span>Taksit Tutari</span>
                    <span>
                      {calculation.installmentAmount.toLocaleString('tr-TR')} TL x {installments}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              onClick={resetForm}
              className="border border-slate-300 bg-white px-4 py-2 text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              variant="default"
            >
              Temizle
            </Button>
            <Button
              type="button"
              onClick={onClose}
              className="border border-slate-300 bg-white px-4 py-2 text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              variant="default"
            >
              Iptal
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-sky-600 px-4 py-2 text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400"
              variant="default"
            >
              Hesaplamayi Kaydet
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
