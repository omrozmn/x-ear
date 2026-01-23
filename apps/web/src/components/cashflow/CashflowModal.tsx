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

interface CashflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: CashRecordFormData) => Promise<void>;
  isLoading?: boolean;
}

interface Party {
  id?: string;
  firstName: string;
  lastName: string;
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
}: CashflowModalProps) {
  const [transactionType, setTransactionType] = useState<TransactionType | ''>('');
  const [recordType, setRecordType] = useState<RecordType | ''>('');
  const [selectedParty, setSelectedParty] = useState<Party | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleClose = () => {
    setTransactionType('');
    setRecordType('');
    setSelectedParty(null);
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
      partyId: selectedParty?.id,
      partyName: selectedParty
        ? `${selectedParty.firstName} ${selectedParty.lastName}`
        : undefined,
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleClose} />

        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Yeni Kasa Kaydı</h3>
            <button data-allow-raw="true" onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Transaction Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                İşlem Türü *
              </label>
              <div className="flex space-x-4">
                <button data-allow-raw="true"
                  type="button"
                  onClick={() => {
                    setTransactionType('income');
                    setRecordType('');
                  }}
                  className={`flex-1 py-3 px-4 border-2 rounded-lg font-medium transition-all ${transactionType === 'income'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-green-300 dark:hover:border-green-500'
                    }`}
                >
                  <TrendingUp className="inline h-5 w-5 mr-2" />
                  Gelir
                </button>
                <button data-allow-raw="true"
                  type="button"
                  onClick={() => {
                    setTransactionType('expense');
                    setRecordType('');
                  }}
                  className={`flex-1 py-3 px-4 border-2 rounded-lg font-medium transition-all ${transactionType === 'expense'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-red-300 dark:hover:border-red-500'
                    }`}
                >
                  <TrendingDown className="inline h-5 w-5 mr-2" />
                  Gider
                </button>
              </div>
              {errors.transactionType && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.transactionType}</p>
              )}
            </div>

            {/* Record Type Selector */}
            <RecordTypeSelector
              transactionType={transactionType}
              selectedType={recordType}
              onSelectType={setRecordType}
            />
            {errors.recordType && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.recordType}</p>
            )}

            {/* Party Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Hasta (İsteğe Bağlı)
              </label>
              <PartySearchInput
                selectedParty={selectedParty}
                onSelectParty={setSelectedParty}
              />
            </div>

            {/* Product Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.amount}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Açıklama (İsteğe Bağlı)
              </label>
              <textarea data-allow-raw="true"
                rows={3}
                placeholder="İşlem açıklaması..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button type="button" variant="outline" onClick={handleClose}>
                İptal
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
