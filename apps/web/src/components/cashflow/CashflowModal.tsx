/**
 * CashflowModal Component
 * Modal for creating new cash records with party search and product selection
 */
import React, { useState } from 'react';
import { Button } from '@x-ear/ui-web';
import { TrendingUp, TrendingDown, X } from 'lucide-react';
import type { CashRecordFormData, TransactionType, RecordType } from '../../types/cashflow';
import { PartySearchInput } from './PartySearchInput';
import { ProductSearchInput } from './ProductSearchInput';
import { RecordTypeSelector } from './RecordTypeSelector';
import { SupplierAutocomplete } from '@/pages/inventory/components/SupplierAutocomplete';

interface CashflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CashRecordFormData) => Promise<void>;
  isLoading?: boolean;
  title?: string;
  saveButtonText?: string;
  lockedTransactionType?: TransactionType;
  transactionTypeLabels?: {
    income: string;
    expense: string;
  };
}

interface Party {
  id?: string;
  firstName: string;
  lastName: string;
}

interface Supplier {
  id?: string;
  name: string;
}

interface InventoryItem {
  id: string;
  name: string;
}

export function CashflowModal({
  isOpen,
  onClose,
  onSave,
  isLoading,
  title = 'Yeni Kasa Kaydı',
  saveButtonText = 'Kaydet',
  lockedTransactionType,
  transactionTypeLabels = {
    income: 'Gelir',
    expense: 'Gider',
  },
}: CashflowModalProps) {
  const [transactionType, setTransactionType] = useState<TransactionType | ''>(lockedTransactionType ?? '');
  const [recordType, setRecordType] = useState<RecordType | ''>('');
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierInput, setSupplierInput] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    setTransactionType(lockedTransactionType ?? '');
  }, [lockedTransactionType]);

  const handleClose = () => {
    setTransactionType(lockedTransactionType ?? '');
    setRecordType('');
    setSelectedParty(null);
    setSelectedSupplier(null);
    setSupplierInput('');
    setSelectedProduct(null);
    setAmount('');
    setDescription('');
    setErrors({});
    onClose();
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!transactionType) {
      newErrors.transactionType = 'İşlem türü seçiniz';
    }

    if (!recordType) {
      newErrors.recordType = 'Kayıt türü seçiniz';
    }

    if (!amount || parseFloat(amount) <= 0) {
      newErrors.amount = 'Geçerli bir tutar giriniz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const formData: CashRecordFormData = {
      transactionType: transactionType as TransactionType,
      recordType: recordType as RecordType,
      amount: parseFloat(amount),
      partyId: transactionType === 'income' ? selectedParty?.id : selectedSupplier?.id,
      partyName: transactionType === 'income'
        ? selectedParty
          ? `${selectedParty.firstName} ${selectedParty.lastName}`
          : undefined
        : supplierInput.trim() || selectedSupplier?.name || undefined,
      inventoryItemId: selectedProduct?.id,
      inventoryItemName: selectedProduct?.name,
      description: description.trim() || undefined,
    };

    try {
      await onSave(formData);
      handleClose();
    } catch (error) {
      console.error('Failed to save cash record:', error);
    }
  };

  if (!isOpen) return null;

  const showTransactionSelector = !lockedTransactionType;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-slate-950/55 backdrop-blur-md transition-opacity dark:bg-black/82" onClick={handleClose} />

        <div className="inline-block w-full max-w-2xl overflow-hidden rounded-[30px] border border-slate-200/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(248,250,252,0.94))] p-6 text-left align-middle shadow-[0_30px_120px_-40px_rgba(15,23,42,0.32)] backdrop-blur-2xl transition-all transform dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.98),rgba(15,23,42,0.96))] dark:shadow-[0_30px_120px_-48px_rgba(0,0,0,0.98)]">
          <div className="mb-6 flex items-center justify-between border-b border-slate-200/80 pb-4 dark:border-slate-800">
            <div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Hizli kayit akisi</p>
            </div>
            <button data-allow-raw="true" onClick={handleClose} className="text-muted-foreground hover:text-muted-foreground dark:text-slate-400 dark:hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {showTransactionSelector ? (
              <div>
                <label className="mb-3 block text-sm font-semibold text-slate-800 dark:text-gray-300">
                  İşlem Türü *
                </label>
                <div className="flex space-x-4">
                  <button data-allow-raw="true"
                    type="button"
                    onClick={() => {
                      setTransactionType('income');
                      setRecordType('');
                    }}
                    className={`flex-1 py-3 px-4 border-2 rounded-2xl font-medium transition-all ${transactionType === 'income'
                    ? 'border-green-500 bg-success/10 dark:border-green-700 text-success'
                      : 'border-slate-300 bg-white/88 text-slate-800 hover:border-green-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-green-700 dark:hover:bg-slate-900'
                      }`}
                  >
                    <TrendingUp className="inline h-5 w-5 mr-2" />
                    {transactionTypeLabels.income}
                  </button>
                  <button data-allow-raw="true"
                    type="button"
                    onClick={() => {
                      setTransactionType('expense');
                      setRecordType('');
                    }}
                    className={`flex-1 py-3 px-4 border-2 rounded-2xl font-medium transition-all ${transactionType === 'expense'
                    ? 'border-red-500 bg-destructive/10 dark:border-red-700 text-destructive'
                      : 'border-slate-300 bg-white/88 text-slate-800 hover:border-red-300 hover:bg-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-red-700 dark:hover:bg-slate-900'
                      }`}
                  >
                    <TrendingDown className="inline h-5 w-5 mr-2" />
                    {transactionTypeLabels.expense}
                  </button>
                </div>
                {errors.transactionType && (
                  <p className="mt-1 text-sm text-destructive">{errors.transactionType}</p>
                )}
              </div>
            ) : null}

            {/* Record Type Selector */}
            <RecordTypeSelector
              transactionType={transactionType}
              selectedType={recordType}
              onSelectType={setRecordType}
            />
            {errors.recordType && (
              <p className="mt-1 text-sm text-destructive">{errors.recordType}</p>
            )}

            {transactionType === 'income' ? (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-gray-300">
                  Hasta (İsteğe Bağlı)
                </label>
                <PartySearchInput
                  selectedParty={selectedParty}
                  onSelectParty={setSelectedParty}
                />
              </div>
            ) : (
              <div>
                <SupplierAutocomplete
                  value={supplierInput}
                  onChange={(value) => {
                    setSupplierInput(value);
                    setSelectedSupplier(value ? { id: selectedSupplier?.id, name: value } : null);
                  }}
                  onSupplierCreated={(supplierName, supplierId) => {
                    setSupplierInput(supplierName);
                    setSelectedSupplier({ id: supplierId, name: supplierName });
                  }}
                  placeholder="Tedarikçi seçin veya ekleyin"
                  label="Tedarikçi (İsteğe Bağlı)"
                />
              </div>
            )}

            {/* Product Search */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-gray-300">
                Ürün (İsteğe Bağlı)
              </label>
              <ProductSearchInput
                selectedProduct={selectedProduct}
                onSelectProduct={setSelectedProduct}
                onPriceSelect={(price) => !amount && setAmount(price.toString())}
                onAmountClear={() => setAmount('')}
              />
            </div>

            {/* Amount */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-gray-300">
                Tutar (₺) *
              </label>
              <input data-allow-raw="true"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9.]/g, '');
                  const parts = value.split('.');
                  setAmount(parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : value);
                }}
                className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm shadow-slate-200/60 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-ring/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:placeholder:text-slate-500"
              />
              {errors.amount && (
                <p className="mt-1 text-sm text-destructive">{errors.amount}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-gray-300">
                Açıklama (İsteğe Bağlı)
              </label>
              <textarea data-allow-raw="true"
                rows={3}
                placeholder="İşlem açıklaması..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm shadow-slate-200/60 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-ring/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 dark:placeholder:text-slate-500"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 border-t border-slate-200/90 pt-4 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={handleClose} className="border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800">
                İptal
              </Button>
              <Button type="submit" disabled={isLoading} className="bg-sky-600 text-white hover:bg-sky-700 dark:bg-sky-500 dark:hover:bg-sky-400">
                {isLoading ? 'Kaydediliyor...' : saveButtonText}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
