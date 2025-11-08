/**
 * CashRecordDetailModal Component
 * View and edit cash record details
 */
import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from '@x-ear/ui-web';
import { Edit2, Save, X } from 'lucide-react';
import type { CashRecord, TransactionType, RecordType } from '../../types/cashflow';
import { RECORD_TYPE_LABELS } from '../../types/cashflow';
import { PatientSearchInput } from './PatientSearchInput';
import { ProductSearchInput } from './ProductSearchInput';
import { RecordTypeSelector } from './RecordTypeSelector';

interface CashRecordDetailModalProps {
  record: CashRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<CashRecord>) => Promise<void>;
  isLoading?: boolean;
}

interface Patient {
  id?: string;
  firstName: string;
  lastName: string;
}

interface InventoryItem {
  id: string;
  name: string;
}

export function CashRecordDetailModal({
  record,
  isOpen,
  onClose,
  onUpdate,
  isLoading,
}: CashRecordDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType | ''>('');
  const [recordType, setRecordType] = useState<RecordType | ''>('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (record) {
      setTransactionType(record.transactionType);
      setRecordType(record.recordType);
      setAmount(Math.abs(record.amount).toString());
      setDescription(record.description || '');
      
      if (record.patientName) {
        const [firstName, ...lastNameParts] = record.patientName.split(' ');
        setSelectedPatient({
          id: record.patientId,
          firstName: firstName || '',
          lastName: lastNameParts.join(' ') || '',
        });
      } else {
        setSelectedPatient(null);
      }
    }
  }, [record]);

  const handleClose = () => {
    setIsEditing(false);
    onClose();
  };

  const handleSave = async () => {
    if (!record) return;

    const updates: Partial<CashRecord> = {
      transactionType: transactionType as TransactionType,
      recordType: recordType as RecordType,
      amount: parseFloat(amount),
      patientId: selectedPatient?.id,
      patientName: selectedPatient
        ? `${selectedPatient.firstName} ${selectedPatient.lastName}`
        : undefined,
      description: description.trim() || undefined,
    };

    try {
      await onUpdate(record.id, updates);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update record:', error);
    }
  };

  if (!record) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Kayıt Detayları" size="lg" showFooter={false}>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-end">
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} size="sm">
              <Edit2 className="h-4 w-4 mr-2" />
              Düzenle
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsEditing(false)} size="sm">
                <X className="h-4 w-4 mr-2" />
                İptal
              </Button>
              <Button onClick={handleSave} disabled={isLoading} size="sm">
                <Save className="h-4 w-4 mr-2" />
                Kaydet
              </Button>
            </div>
          )}
        </div>

        {/* View Mode */}
        {!isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Tarih</label>
                <p className="text-base text-gray-900">{formatDate(record.date)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">İşlem Türü</label>
                <p className="text-base">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      record.transactionType === 'income'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {record.transactionType === 'income' ? 'Gelir' : 'Gider'}
                  </span>
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Kayıt Türü</label>
                <p className="text-base text-gray-900">
                  {RECORD_TYPE_LABELS[record.recordType] || record.recordType}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Tutar</label>
                <p className={`text-xl font-bold ${
                  record.transactionType === 'income' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {record.transactionType === 'income' ? '+' : '-'}
                  {formatCurrency(record.amount)}
                </p>
              </div>
              {record.patientName && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Hasta</label>
                  <p className="text-base text-gray-900">{record.patientName}</p>
                </div>
              )}
              {record.inventoryItemName && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Ürün</label>
                  <p className="text-base text-gray-900">{record.inventoryItemName}</p>
                </div>
              )}
              {record.description && (
                <div className="col-span-2">
                  <label className="text-sm font-medium text-gray-500">Açıklama</label>
                  <p className="text-base text-gray-900">{record.description}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Edit Mode */
          <div className="space-y-4">
            <RecordTypeSelector
              transactionType={transactionType}
              selectedType={recordType}
              onSelectType={setRecordType}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hasta (İsteğe Bağlı)
              </label>
              <PatientSearchInput
                selectedPatient={selectedPatient}
                onSelectPatient={setSelectedPatient}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tutar (₺) *
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Açıklama (İsteğe Bağlı)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
