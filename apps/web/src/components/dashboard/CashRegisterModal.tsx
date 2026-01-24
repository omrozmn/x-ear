import { Button, Input, Select, Textarea } from '@x-ear/ui-web';
import React, { useState } from 'react';
import { DollarSign, CreditCard, User, Smartphone } from 'lucide-react';
import { Modal } from '../../../../../packages/ui-web/src/components/ui/Modal';

interface CashRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CashRegisterData) => void;
}

interface CashRegisterData {
  type: 'income' | 'expense';
  recordType: 'cash' | 'card' | 'transfer';
  partyId?: string;
  amount: number;
  description: string;
}

export const CashRegisterModal: React.FC<CashRegisterModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<CashRegisterData>({
    type: 'income',
    recordType: 'cash',
    amount: 0,
    description: '',
  });

  const handleSubmit = () => {
    if (formData.amount > 0 && formData.description.trim()) {
      onSubmit(formData);
      onClose();
      // Reset form
      setFormData({
        type: 'income',
        recordType: 'cash',
        amount: 0,
        description: '',
      });
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      onSave={handleSubmit}
      title="Kasa İşlemi"
      size="md"
      saveButtonText="Kaydet"
      cancelButtonText="İptal"
    >
      <div className="space-y-6">
        {/* Transaction Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            İşlem Türü
          </label>
          <div className="flex space-x-4">
            <Button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'income' })}
              className={`flex-1 py-2 px-4 rounded-lg border ${formData.type === 'income'
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-gray-50 border-gray-200 text-gray-700'
                }`}
              variant='default'>
              Gelir
            </Button>
            <Button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'expense' })}
              className={`flex-1 py-2 px-4 rounded-lg border ${formData.type === 'expense'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-gray-50 border-gray-200 text-gray-700'
                }`}
              variant='default'>
              Gider
            </Button>
          </div>
        </div>

        {/* Record Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Kayıt Türü
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'cash', label: 'Nakit', icon: DollarSign },
              { value: 'card', label: 'Kart', icon: CreditCard },
              { value: 'transfer', label: 'Havale', icon: Smartphone },
            ].map(({ value, label, icon: Icon }) => (
              <Button
                key={value}
                type="button"
                onClick={() => setFormData({ ...formData, recordType: value as 'cash' | 'card' | 'transfer' })}
                className={`flex flex-col items-center py-3 px-2 rounded-lg border ${formData.recordType === value
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-gray-50 border-gray-200 text-gray-700'
                  }`}
                variant='default'>
                <Icon className="w-5 h-5 mb-1" />
                <span className="text-sm">{label}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Party Selection (Optional) */}
        <div>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Select
              label="Hasta (Opsiyonel)"
              value={formData.partyId || ''}
              onChange={(e) => setFormData({ ...formData, partyId: e.target.value || undefined })}
              options={[
                { value: "", label: "Hasta seçin..." },
                { value: "1", label: "Ahmet Yılmaz" },
                { value: "2", label: "Ayşe Kaya" },
                { value: "3", label: "Mehmet Demir" }
              ]}
              className="pl-10"
              fullWidth
            />
          </div>
        </div>

        {/* Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tutar (₺)
          </label>
          <Input
            type="number"
            value={formData.amount || ''}
            onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Açıklama
          </label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="İşlem açıklaması..."
            rows={3}
          />
        </div>
      </div>
    </Modal>
  );
};