/**
 * RecordTypeSelector Component
 * Dynamic record type selector with ability to add custom types
 */
import React, { useState, useEffect } from 'react';
import { Button, Input } from '@x-ear/ui-web';
import { Plus, X } from 'lucide-react';
import type { RecordType, TransactionType } from '../../types/cashflow';
import { RECORD_TYPE_LABELS } from '../../types/cashflow';

import { CUSTOM_RECORD_TYPES } from '../../constants/storage-keys';

interface RecordTypeSelectorProps {
  transactionType: TransactionType | '';
  selectedType: RecordType | '';
  onSelectType: (type: RecordType) => void;
}

export function RecordTypeSelector({
  transactionType,
  selectedType,
  onSelectType,
}: RecordTypeSelectorProps) {
  const [customTypes, setCustomTypes] = useState<{
    income: string[];
    expense: string[];
  }>(() => {
    const stored = localStorage.getItem(CUSTOM_RECORD_TYPES);
    return stored ? JSON.parse(stored) : { income: [], expense: [] };
  });
  const [newType, setNewType] = useState('');

  useEffect(() => {
    localStorage.setItem(CUSTOM_RECORD_TYPES, JSON.stringify(customTypes));
  }, [customTypes]);

  const handleAddType = () => {
    if (!newType.trim() || !transactionType) return;

    const trimmedType = newType.trim();
    const category = transactionType as 'income' | 'expense';
    if (customTypes[category].includes(trimmedType)) {
      onSelectType(trimmedType as RecordType);
      setNewType('');
      return;
    }

    setCustomTypes({
      ...customTypes,
      [category]: [...customTypes[category], trimmedType],
    });
    onSelectType(trimmedType as RecordType);
    setNewType('');
  };

  const handleRemoveType = (type: string, category: 'income' | 'expense') => {
    setCustomTypes({
      ...customTypes,
      [category]: customTypes[category].filter((t) => t !== type),
    });
    if (selectedType === type) {
      onSelectType('' as RecordType);
    }
  };

  if (!transactionType) return null;

  const defaultIncomeTypes: RecordType[] = ['kaparo', 'teslimat'];
  const defaultExpenseTypes: RecordType[] = ['kalip', 'pil', 'filtre', 'tamir', 'diger'];

  const allTypes =
    transactionType === 'income'
      ? [...defaultIncomeTypes, ...customTypes.income]
      : [...defaultExpenseTypes, ...customTypes.expense];

  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-800 dark:text-slate-200">Kayıt Türü *</label>

      {/* Add New Type */}
      <div className="flex space-x-2 mb-4">
        <Input
          placeholder="Yeni kayıt türü ekle..."
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddType())}
        />
        <Button type="button" onClick={handleAddType} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Ekle
        </Button>
      </div>

      {/* Type Pills */}
      <div className="min-h-[60px] rounded-2xl border border-slate-200 bg-white/88 p-3 shadow-sm shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-900/82">
        <div className="flex flex-wrap gap-2">
        {allTypes.map((type) => {
          const isCustom = customTypes[transactionType as 'income' | 'expense'].includes(type);
          const isSelected = selectedType === type;

          return (
            <div
              key={type}
              onClick={() => onSelectType(type as RecordType)}
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium cursor-pointer transition-all ${isSelected
                  ? transactionType === 'income'
                    ? 'bg-green-600 text-white ring-2 ring-green-600'
                    : 'bg-red-600 text-white ring-2 ring-red-600'
                  : transactionType === 'income'
                    ? 'bg-green-100 text-green-900 hover:bg-green-200 dark:bg-green-900/35 dark:text-green-100 dark:hover:bg-green-900/50'
                    : 'bg-red-100 text-red-900 hover:bg-red-200 dark:bg-red-900/35 dark:text-red-100 dark:hover:bg-red-900/50'
                }`}
            >
              <span>{RECORD_TYPE_LABELS[type as RecordType] || type}</span>
              {isCustom && (
                <button data-allow-raw="true"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveType(type, transactionType as 'income' | 'expense');
                  }}
                  className="ml-2 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
}
