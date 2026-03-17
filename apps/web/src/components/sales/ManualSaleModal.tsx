import React, { useEffect, useMemo, useState } from 'react';
import { Button, Input, Select } from '@x-ear/ui-web';
import { X } from 'lucide-react';
import { PartySearchInput } from '@/components/cashflow/PartySearchInput';
import { ProductSearchInput } from '@/components/cashflow/ProductSearchInput';
import type { SaleCreate } from '@/api/client/sales.client';

interface PartyOption {
  id?: string;
  firstName: string;
  lastName: string;
}

interface ProductOption {
  id: string;
  name: string;
  price?: number;
}

interface ManualSaleModalProps {
  isOpen: boolean;
  isLoading?: boolean;
  onClose: () => void;
  onSubmit: (payload: SaleCreate) => Promise<void>;
}

const paymentOptions = [
  { value: 'cash', label: 'Nakit' },
  { value: 'card', label: 'Kart' },
  { value: 'transfer', label: 'Havale/EFT' },
  { value: 'installment', label: 'Taksit' },
];

export function ManualSaleModal({ isOpen, isLoading = false, onClose, onSubmit }: ManualSaleModalProps) {
  const [selectedParty, setSelectedParty] = useState<PartyOption | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null);
  const [salePrice, setSalePrice] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!selectedProduct) {
      setSalePrice('');
      setPaidAmount('');
      return;
    }
    const basePrice = Number(selectedProduct.price || 0);
    setSalePrice(basePrice > 0 ? String(basePrice) : '');
    setPaidAmount(basePrice > 0 ? String(basePrice) : '0');
  }, [selectedProduct]);

  const parsedSalePrice = useMemo(() => Number(salePrice || 0), [salePrice]);
  const parsedPaidAmount = useMemo(() => Number(paidAmount || 0), [paidAmount]);

  const handleClose = () => {
    setSelectedParty(null);
    setSelectedProduct(null);
    setSalePrice('');
    setPaidAmount('');
    setPaymentMethod('cash');
    setNotes('');
    setError('');
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedParty?.id) {
      setError('Hasta seçiniz.');
      return;
    }
    if (!selectedProduct?.id) {
      setError('Ürün seçiniz.');
      return;
    }
    if (parsedSalePrice <= 0) {
      setError('Geçerli bir satış tutarı giriniz.');
      return;
    }
    if (parsedPaidAmount < 0 || parsedPaidAmount > parsedSalePrice) {
      setError('Tahsil edilen tutar 0 ile satış tutarı arasında olmalı.');
      return;
    }

    setError('');
    await onSubmit({
      partyId: selectedParty.id,
      productId: selectedProduct.id,
      salesPrice: parsedSalePrice,
      paidAmount: parsedPaidAmount,
      paymentMethod,
      notes: notes.trim() || undefined,
      saleDate: new Date().toISOString(),
    });
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-md dark:bg-slate-950/72">
      <div className="w-full max-w-2xl rounded-[28px] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,250,252,0.94))] shadow-[0_30px_120px_-40px_rgba(15,23,42,0.32)] backdrop-blur-2xl dark:border-slate-700/80 dark:bg-slate-950/96">
        <div className="flex items-center justify-between border-b border-slate-200/80 p-6 dark:border-slate-700/80">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Yeni Satış</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Satış kaydı oluştur, tahsil edilen kısmı kasaya işle.</p>
          </div>
          <Button type="button" variant="default" onClick={handleClose} className="bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {error ? <div className="rounded-2xl border border-red-200 bg-destructive/10 px-4 py-3 text-sm text-destructive dark:border-red-800">{error}</div> : null}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-300">Hasta *</label>
            <PartySearchInput selectedParty={selectedParty} onSelectParty={setSelectedParty} />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-300">Ürün *</label>
            <ProductSearchInput
              selectedProduct={selectedProduct}
              onSelectProduct={setSelectedProduct}
              onPriceSelect={(price) => {
                setSalePrice(String(price));
                setPaidAmount(String(price));
              }}
              onAmountClear={() => {
                setSalePrice('');
                setPaidAmount('');
              }}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-300">Satış Tutarı *</label>
              <Input type="number" min="0" step="0.01" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} fullWidth />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-300">Tahsil Edilen</label>
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
              placeholder="Satış notu"
            />
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white/90 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/88">
            <div className="flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Kasaya girecek</span>
              <span className="font-semibold text-slate-900 dark:text-white">{parsedPaidAmount.toLocaleString('tr-TR')} TL</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-slate-600 dark:text-slate-400">Kalan</span>
              <span className="font-medium text-slate-900 dark:text-white">{Math.max(0, parsedSalePrice - parsedPaidAmount).toLocaleString('tr-TR')} TL</span>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200/90 pt-4 dark:border-slate-700/80">
            <Button type="button" variant="outline" onClick={handleClose} className="border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/85 dark:text-slate-100 dark:hover:bg-slate-800">
              İptal
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400">
              {isLoading ? 'Kaydediliyor...' : 'Satışı Kaydet'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
