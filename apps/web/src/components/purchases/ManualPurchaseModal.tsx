import React, { useState } from 'react';
import { Button, Input, Select } from '@x-ear/ui-web';
import { X } from 'lucide-react';
import { ProductSearchInput } from '@/components/cashflow/ProductSearchInput';
import { SupplierAutocomplete } from '@/pages/inventory/components/SupplierAutocomplete';
import type { ManualPurchaseCreatePayload } from '@/hooks/useManualPurchases';

interface SupplierOption {
  id?: string;
  name: string;
}

interface ProductOption {
  id: string;
  name: string;
  cost?: number;
  price?: number;
}

interface ManualPurchaseModalProps {
  isOpen: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onSubmit: (payload: ManualPurchaseCreatePayload) => Promise<void>;
}

const paymentOptions = [
  { value: 'cash', label: 'Nakit' },
  { value: 'card', label: 'Kart' },
  { value: 'transfer', label: 'Havale/EFT' },
  { value: 'check', label: 'Çek' },
];

export function ManualPurchaseModal({ isOpen, isLoading = false, onClose, onSubmit }: ManualPurchaseModalProps) {
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierOption | null>(null);
  const [supplierName, setSupplierName] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [totalAmount, setTotalAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleClose = () => {
    setSelectedSupplier(null);
    setSupplierName('');
    setSelectedProduct(null);
    setTotalAmount('');
    setPaidAmount('');
    setPaymentMethod('cash');
    setNotes('');
    setError('');
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedSupplier?.id) {
      setError('Tedarikçi seçiniz veya autocomplete üzerinden ekleyiniz.');
      return;
    }

    const parsedTotalAmount = Number(totalAmount || 0);
    const parsedPaidAmount = Number(paidAmount || 0);

    if (parsedTotalAmount <= 0) {
      setError('Geçerli bir alış tutarı giriniz.');
      return;
    }

    if (parsedPaidAmount < 0 || parsedPaidAmount > parsedTotalAmount) {
      setError('Ödenen tutar 0 ile alış tutarı arasında olmalı.');
      return;
    }

    setError('');
    await onSubmit({
      supplierId: selectedSupplier.id,
      totalAmount: parsedTotalAmount,
      paidAmount: parsedPaidAmount,
      paymentMethod,
      purchaseDate: new Date().toISOString(),
      notes: notes.trim() || undefined,
      productName: selectedProduct?.name,
    });
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md dark:bg-slate-950/72">
      <div className="w-full max-w-2xl rounded-[28px] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,250,252,0.94))] shadow-[0_30px_120px_-40px_rgba(15,23,42,0.32)] backdrop-blur-2xl dark:border-slate-700/80 dark:bg-slate-950/96">
        <div className="flex items-center justify-between border-b border-slate-200/80 p-6 dark:border-slate-700/80">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Yeni Alış</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Alış kaydı oluştur, ödenen kısmı kasaya gider olarak işle.</p>
          </div>
          <Button type="button" variant="default" onClick={handleClose} className="bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {error ? <div className="rounded-2xl border border-red-200 bg-destructive/10 px-4 py-3 text-sm text-destructive dark:border-red-800">{error}</div> : null}

          <SupplierAutocomplete
            value={supplierName}
            onChange={(value) => {
              setSupplierName(value);
              if (!value) {
                setSelectedSupplier(null);
              }
            }}
            onSupplierSelect={(supplier) => {
              setSelectedSupplier(supplier);
              setSupplierName(supplier.name);
            }}
            onSupplierCreated={(name, id) => {
              setSelectedSupplier(id ? { id, name } : null);
              setSupplierName(name);
            }}
            label="Tedarikçi *"
            placeholder="Tedarikçi seçin veya ekleyin"
            required
          />

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-300">Ürün (Opsiyonel)</label>
            <ProductSearchInput
              selectedProduct={selectedProduct}
              onSelectProduct={setSelectedProduct}
              onPriceSelect={(price) => {
                if (!totalAmount) setTotalAmount(String(price));
              }}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-300">Alış Tutarı *</label>
              <Input type="number" min="0" step="0.01" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} fullWidth />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-300">Ödenen Tutar</label>
              <Input type="number" min="0" step="0.01" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} fullWidth />
            </div>
            <div>
              <Select label="Ödeme Şekli" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} fullWidth options={paymentOptions} />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-300">Not</label>
            <textarea
              data-allow-raw="true"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm shadow-slate-200/60 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-ring/20 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-50 dark:placeholder:text-slate-500"
              placeholder="Alış notu"
            />
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/88">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Kasadan çıkacak</span>
              <span className="font-semibold text-slate-900 dark:text-white">{Number(paidAmount || 0).toLocaleString('tr-TR')} TL</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Açık bakiye</span>
              <span className="font-medium text-slate-900 dark:text-white">{Math.max(0, Number(totalAmount || 0) - Number(paidAmount || 0)).toLocaleString('tr-TR')} TL</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200/90 pt-4 dark:border-slate-700/80">
            <Button type="button" variant="outline" onClick={handleClose} className="border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/85 dark:text-slate-100 dark:hover:bg-slate-800">
              İptal
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400">
              {isLoading ? 'Kaydediliyor...' : 'Alışı Kaydet'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
